import { describe, expect, it } from "vitest";

import { groupNotifications } from "./group";
import type { Notification } from "./queries";

const HOUR = 60 * 60 * 1000;
const at = (hoursAgo: number) =>
  new Date(Date.UTC(2026, 9, 24, 12) - hoursAgo * HOUR).toISOString();

let nextId = 0;
const notification = (
  type: Notification["type"],
  actor: string,
  hoursAgo: number,
  postId: string | null = type === "follow" ? null : "post-1",
  read = true,
): Notification => ({
  id: `n${nextId++}`,
  type,
  createdAt: at(hoursAgo),
  read,
  actor: { id: actor, username: actor, fullName: actor, avatarPath: null },
  post: postId ? { id: postId, imagePath: "x.webp", thumbhash: null } : null,
  commentBody: type === "comment" ? "Nice" : null,
  viewerFollowsActor: false,
  actorFollowsViewer: true,
});

const shape = (groups: ReturnType<typeof groupNotifications>) =>
  groups.map((group) => `${group.latest.type}:${group.actors.map((actor) => actor.id).join("+")}`);

describe("groupNotifications", () => {
  it("groups likes on the same post and follows, keeping comments apart", () => {
    const groups = groupNotifications([
      notification("like", "maya", 1),
      notification("comment", "leo", 2),
      notification("follow", "sana", 3),
      notification("like", "leo", 4),
      notification("like", "zoe", 5, "post-2"),
      notification("follow", "arjun", 6),
      notification("comment", "maya", 7),
    ]);
    expect(shape(groups)).toEqual([
      "like:maya+leo",
      "comment:leo",
      "follow:sana+arjun",
      "like:zoe",
      "comment:maya",
    ]);
  });

  it("starts a new group after a day, and lists each person once", () => {
    const groups = groupNotifications([
      notification("like", "maya", 1),
      notification("like", "maya", 5),
      notification("like", "leo", 30),
    ]);
    expect(shape(groups)).toEqual(["like:maya", "like:leo"]);
  });

  it("is unread if any of it is", () => {
    const [group] = groupNotifications([
      notification("follow", "maya", 1, null, true),
      notification("follow", "leo", 2, null, false),
    ]);
    expect(group!.read).toBe(false);
  });
});
