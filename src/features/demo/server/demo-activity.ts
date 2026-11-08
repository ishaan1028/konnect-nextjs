import "server-only";

import { revalidateTag } from "next/cache";

import { findUserByEmail } from "@/features/auth/server/find-user-by-email";
import { postTag } from "@/features/posts/server/get-post";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  COMMENTS_BY_POST,
  GENERAL_COMMENTS,
  JOB_COMMENTS,
  JOB_MESSAGES,
  MESSAGES_BY_PERSON,
  REPLIES,
} from "../lines";
import { actionChance, DAILY_TARGETS, pick, pickFresh } from "../plan";

type Admin = ReturnType<typeof createAdminClient>;
type Person = { id: string; username: string };
type Post = { id: string; created_at: string };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** The job's comments and messages are removed after this, so they never pile up. */
const KEEP_FOR = 5 * 24 * HOUR;
/** Nobody repeats a comment or message within this window. */
const NO_REPEAT_FOR = 7 * 24 * HOUR;
/** People answer Dario after this long, not instantly like a bot. */
const REPLY_AFTER = 10 * MINUTE;
/** A post this new gets a few likes and a comment within the hour. */
const NEW_POST_FOR = 3 * HOUR;
const NEW_POST_LIKES = 3;

export type DemoActivityOptions = {
  /** Make every chance-based action happen, with no waiting (for tests and manual runs). */
  actAll?: boolean;
};

/**
 * One 15-minute run of activity on the shared demo account, as the showcase
 * people (Vercel Schedules, vercel.json). Every run answers Dario's unanswered
 * messages and welcomes his brand-new posts, so visitors see replies and
 * likes arrive. Beyond that, each run likes, comments, messages or follows
 * only by chance (plan.ts), adding up to a believable day. The app's own
 * triggers turn it all into notifications and unread chats, and the steady
 * requests keep the free Supabase project from pausing.
 */
export async function runDemoActivity({ actAll = false }: DemoActivityOptions = {}) {
  if (!env.DEMO_USER_EMAIL) return { skipped: "No demo account is configured." };
  const admin = createAdminClient();
  const demo = await findUserByEmail(admin, env.DEMO_USER_EMAIL);
  if (!demo) return { skipped: "The demo account doesn't exist." };

  const { data: people, error: peopleError } = await admin
    .from("profiles")
    .select("id, username")
    .in("username", Object.keys(MESSAGES_BY_PERSON));
  if (peopleError) throw peopleError;
  if (!people.length) return { skipped: "None of the showcase people exist." };

  const now = Date.now();
  const happens = (perDay: number) => actAll || Math.random() < actionChance(perDay, new Date());
  const job = new Job(admin, demo.id, people, now);

  await job.replyToDario(actAll ? 0 : REPLY_AFTER);
  await job.welcomeNewPosts(actAll ? 0 : REPLY_AFTER);
  if (happens(DAILY_TARGETS.like)) await job.like();
  if (happens(DAILY_TARGETS.comment)) await job.comment();
  if (happens(DAILY_TARGETS.message)) await job.message();
  if (happens(DAILY_TARGETS.follow)) await job.followAgain();
  await job.cleanUp();
  job.refreshPosts();
  return { done: job.done };
}

class Job {
  readonly done: string[] = [];
  private readonly peopleIds: string[];
  private readonly touchedPosts = new Set<string>();
  private posts?: Post[];
  private said?: { comments: Map<string, Set<string>>; messages: Map<string, Set<string>> };

  constructor(
    private readonly admin: Admin,
    private readonly demoId: string,
    private readonly people: Person[],
    private readonly now: number,
  ) {
    this.peopleIds = people.map((person) => person.id);
  }

  private nameOf(id: string) {
    return this.people.find((person) => person.id === id)?.username ?? "someone";
  }

  /** Dario's posts, newest first. Visitors share the account and may delete them all. */
  private async darioPosts() {
    if (!this.posts) {
      const { data, error } = await this.admin
        .from("posts")
        .select("id, created_at")
        .eq("author_id", this.demoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      this.posts = data;
    }
    return this.posts;
  }

  /** What each person said in the last week, so nobody repeats themselves. */
  private async recentlySaid() {
    if (!this.said) {
      const since = new Date(this.now - NO_REPEAT_FOR).toISOString();
      const [comments, messages] = await Promise.all([
        this.admin
          .from("comments")
          .select("author_id, body")
          .in("author_id", this.peopleIds)
          .gte("created_at", since),
        this.admin
          .from("messages")
          .select("sender_id, body")
          .in("sender_id", this.peopleIds)
          .gte("created_at", since),
      ]);
      if (comments.error) throw comments.error;
      if (messages.error) throw messages.error;
      // (The filter on the showcase people's ids rules out null senders.)
      const byPerson = (rows: { id: string | null; body: string }[]) => {
        const map = new Map<string, Set<string>>();
        for (const { id, body } of rows) {
          if (id) map.set(id, (map.get(id) ?? new Set()).add(body));
        }
        return map;
      };
      this.said = {
        comments: byPerson(comments.data.map((row) => ({ id: row.author_id, body: row.body }))),
        messages: byPerson(messages.data.map((row) => ({ id: row.sender_id, body: row.body }))),
      };
    }
    return this.said;
  }

  /** Answers every chat where Dario spoke last, at least `after` ago. */
  async replyToDario(after: number) {
    const { data: mine, error } = await this.admin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", this.demoId);
    if (error) throw error;
    if (!mine.length) return;

    const { data: waiting, error: waitingError } = await this.admin
      .from("conversations")
      .select("id, conversation_participants!inner(user_id)")
      .in(
        "id",
        mine.map((row) => row.conversation_id),
      )
      .eq("last_message_sender_id", this.demoId)
      .lte("last_message_at", new Date(this.now - after).toISOString())
      .in("conversation_participants.user_id", this.peopleIds)
      .limit(3);
    if (waitingError) throw waitingError;

    for (const chat of waiting) {
      const personId = chat.conversation_participants[0]!.user_id;
      // They read it first ("Seen" shows live), then answer.
      const { error: readError } = await this.admin
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .match({ conversation_id: chat.id, user_id: personId });
      if (readError) throw readError;
      const said = (await this.recentlySaid()).messages.get(personId) ?? new Set();
      await this.send(chat.id, personId, pickFresh(REPLIES, said));
      this.done.push(`${this.nameOf(personId)} replied`);
    }
  }

  /** A post Dario made in the last few hours gets likes and a comment, one per run. */
  async welcomeNewPosts(after: number) {
    const fresh = (await this.darioPosts()).filter((post) => {
      const age = this.now - new Date(post.created_at).getTime();
      return age >= after && age < NEW_POST_FOR;
    });
    for (const post of fresh) {
      const likers = await this.likersOf(post.id);
      const notYet = this.people.filter((person) => !likers.has(person.id));
      if (likers.size < NEW_POST_LIKES && notYet.length) await this.addLike(post.id, pick(notYet));

      const { count, error } = await this.admin
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", post.id)
        .in("author_id", this.peopleIds);
      if (error) throw error;
      if (!count) await this.addComment(post.id, pick(this.people));
    }
  }

  /** A like on one of Dario's posts, preferring recent ones. */
  async like() {
    const post = await this.choosePost();
    if (!post) return;
    const likers = await this.likersOf(post.id);
    const notYet = this.people.filter((person) => !likers.has(person.id));
    if (notYet.length) return this.addLike(post.id, pick(notYet));

    // Everyone liked it already: take one back and like again, so the
    // notification is fresh and the count doesn't change.
    const liker = pick(this.people);
    const { error } = await this.admin
      .from("post_likes")
      .delete()
      .match({ post_id: post.id, user_id: liker.id });
    if (error) throw error;
    await this.addLike(post.id, liker);
  }

  async comment() {
    const post = await this.choosePost();
    if (post) await this.addComment(post.id, pick(this.people));
  }

  /** A message from someone who isn't already waiting on Dario's answer. */
  async message() {
    const since = this.now - 12 * HOUR;
    for (const sender of [...this.people].sort(() => Math.random() - 0.5)) {
      const chat = await this.findConversation(sender.id);
      const theyTextedLast =
        chat?.last_message_sender_id === sender.id &&
        new Date(chat.last_message_at ?? 0).getTime() > since;
      if (theyTextedLast) continue;

      const said = (await this.recentlySaid()).messages.get(sender.id) ?? new Set();
      const lines = MESSAGES_BY_PERSON[sender.username] ?? REPLIES;
      const conversationId = chat?.id ?? (await this.createConversation(sender.id));
      await this.send(conversationId, sender.id, pickFresh(lines, said));
      this.done.push(`${sender.username} sent a message`);
      return;
    }
  }

  /** Someone who follows Dario follows again: a fresh notification, same count. */
  async followAgain() {
    const { data: followers, error } = await this.admin
      .from("follows")
      .select("follower_id")
      .eq("following_id", this.demoId)
      .in("follower_id", this.peopleIds);
    if (error) throw error;
    if (!followers.length) return;
    const follow = { follower_id: pick(followers).follower_id, following_id: this.demoId };
    const { error: unfollowError } = await this.admin.from("follows").delete().match(follow);
    if (unfollowError) throw unfollowError;
    const { error: followError } = await this.admin
      .from("follows")
      .upsert(follow, { onConflict: "follower_id,following_id", ignoreDuplicates: true });
    if (followError) throw followError;
    this.done.push(`${this.nameOf(follow.follower_id)} followed`);
  }

  /** Removes the job's own comments and messages once they're a few days old. */
  async cleanUp() {
    const before = new Date(this.now - KEEP_FOR).toISOString();
    const [comments, messages] = await Promise.all([
      this.admin
        .from("comments")
        .delete()
        .in("author_id", this.peopleIds)
        .in("body", JOB_COMMENTS)
        .lt("created_at", before),
      this.admin
        .from("messages")
        .delete()
        .in("sender_id", this.peopleIds)
        .in("body", JOB_MESSAGES)
        .lt("created_at", before),
    ]);
    if (comments.error) throw comments.error;
    if (messages.error) throw messages.error;
  }

  /** Post pages cache their like and comment counts. */
  refreshPosts() {
    for (const id of this.touchedPosts) revalidateTag(postTag(id), "max");
  }

  /** Mostly one of the last week's posts (a visitor's), otherwise any. */
  private async choosePost() {
    const posts = await this.darioPosts();
    const recent = posts.filter(
      (post) => this.now - new Date(post.created_at).getTime() < 7 * 24 * HOUR,
    );
    if (!posts.length) return undefined;
    return pick(recent.length && Math.random() < 0.6 ? recent : posts);
  }

  private async likersOf(postId: string) {
    const { data, error } = await this.admin
      .from("post_likes")
      .select("user_id")
      .eq("post_id", postId)
      .in("user_id", this.peopleIds);
    if (error) throw error;
    return new Set(data.map((row) => row.user_id));
  }

  private async addLike(postId: string, liker: Person) {
    // A run can overlap another one (Schedules may retry): a like that's
    // already there is fine.
    const { error } = await this.admin
      .from("post_likes")
      .upsert(
        { post_id: postId, user_id: liker.id },
        { onConflict: "post_id,user_id", ignoreDuplicates: true },
      );
    if (error) throw error;
    this.touchedPosts.add(postId);
    this.done.push(`${liker.username} liked a post`);
  }

  private async addComment(postId: string, author: Person) {
    const { data: onPost, error } = await this.admin
      .from("comments")
      .select("body")
      .eq("post_id", postId);
    if (error) throw error;
    const said = new Set([
      ...((await this.recentlySaid()).comments.get(author.id) ?? []),
      ...onPost.map((row) => row.body),
    ]);
    const own = COMMENTS_BY_POST[postId];
    const pool = own && Math.random() < 0.6 ? own : GENERAL_COMMENTS;
    const body = pickFresh(pool, said);
    const { error: insertError } = await this.admin
      .from("comments")
      .insert({ post_id: postId, author_id: author.id, body });
    if (insertError) throw insertError;
    (await this.recentlySaid()).comments.set(author.id, said.add(body));
    this.touchedPosts.add(postId);
    this.done.push(`${author.username} commented`);
  }

  private async send(conversationId: string, senderId: string, body: string) {
    const { error } = await this.admin
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: senderId, body });
    if (error) throw error;
    const said = await this.recentlySaid();
    said.messages.set(senderId, (said.messages.get(senderId) ?? new Set()).add(body));
  }

  // Same key as get_or_create_dm: least(uuid) ':' greatest(uuid). Lowercase
  // UUID strings sort the same as the uuid type.
  private dmKey(personId: string) {
    return [personId, this.demoId].sort().join(":");
  }

  /** The person's direct conversation with Dario, if they have one. */
  private async findConversation(personId: string) {
    const { data, error } = await this.admin
      .from("conversations")
      .select("id, last_message_sender_id, last_message_at")
      .eq("dm_key", this.dmKey(personId))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /** Starts a direct conversation the way get_or_create_dm does. */
  private async createConversation(personId: string) {
    const { data: created, error: createError } = await this.admin
      .from("conversations")
      .insert({ dm_key: this.dmKey(personId) })
      .select("id")
      .single();
    if (createError) throw createError;
    const { error: participantsError } = await this.admin.from("conversation_participants").insert([
      { conversation_id: created.id, user_id: personId },
      { conversation_id: created.id, user_id: this.demoId },
    ]);
    if (participantsError) throw participantsError;
    return created.id;
  }
}
