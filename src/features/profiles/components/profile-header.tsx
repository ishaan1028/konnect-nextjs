import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount, pluralize } from "@/lib/format";
import { avatarUrl } from "@/lib/storage";

import type { PublicProfile } from "../server/get-public-profile";

type ProfileHeaderProps = {
  profile: PublicProfile;
  /** Viewer-specific buttons (Edit profile / Follow), streamed in separately. */
  actions?: ReactNode;
};

/** The public part of a profile: identical for every visitor, so it's cached. */
export function ProfileHeader({ profile, actions }: ProfileHeaderProps) {
  const stats = [
    { label: pluralize(profile.postsCount, "post", "posts"), value: profile.postsCount },
    {
      label: pluralize(profile.followersCount, "follower", "followers"),
      value: profile.followersCount,
      href: `/${profile.username}/followers` as Route,
    },
    {
      label: "following",
      value: profile.followingCount,
      href: `/${profile.username}/following` as Route,
    },
  ];

  return (
    <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12">
      <div className="shrink-0 rounded-full bg-brand-vivid p-1">
        <UserAvatar
          name={profile.fullName}
          src={avatarUrl(profile.avatarPath)}
          pixelSize={144}
          priority
          className="size-28 border-4 border-background sm:size-36"
          fallbackClassName="text-3xl sm:text-4xl"
        />
      </div>

      <div className="flex w-full min-w-0 flex-col items-center gap-4 sm:items-start">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <h1 className="truncate text-2xl font-bold">@{profile.username}</h1>
          {actions}
        </div>

        <ul className="flex gap-6 text-sm sm:gap-8" aria-label="Profile stats">
          {stats.map(({ label, value, href }) => {
            const content = (
              <>
                <span className="font-semibold text-foreground">{formatCount(value)}</span> {label}
              </>
            );
            return (
              <li key={label} className="text-muted-foreground">
                {href ? (
                  <Link href={href} className="rounded-md hover:text-foreground">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>

        <div className="space-y-1 text-center sm:text-left">
          <p className="font-semibold">{profile.fullName}</p>
          {profile.bio && <p className="text-pretty whitespace-pre-line">{profile.bio}</p>}
        </div>
      </div>
    </header>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12"
    >
      <Skeleton className="size-30 shrink-0 rounded-full sm:size-38" />
      <div className="flex w-full flex-col items-center gap-4 sm:items-start">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
