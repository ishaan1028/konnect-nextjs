import { adminClient, createConfirmedUser } from "./users";

/** `follower` follows `followed` (both by username), straight in the database. */
export async function follow(follower: string, followed: string) {
  const admin = adminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, username")
    .in("username", [follower, followed])
    .throwOnError();
  const id = (username: string) => data.find((row) => row.username === username)!.id;
  await admin
    .from("follows")
    .insert({ follower_id: id(follower), following_id: id(followed) })
    .throwOnError();
}

/** Gives `username` this many brand-new followers. */
export async function giveFollowers(username: string, count: number) {
  const fans = await Promise.all(Array.from({ length: count }, () => createConfirmedUser()));
  await Promise.all(fans.map((fan) => follow(fan.username, username)));
  return fans;
}
