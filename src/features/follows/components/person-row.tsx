import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { UserAvatar } from "@/components/shared/user-avatar";
import { avatarUrl } from "@/lib/storage";

import type { PersonSummary } from "../queries";

type PersonRowProps = {
  person: PersonSummary;
  /** Secondary line under the name (defaults to the full name). */
  subtitle?: ReactNode;
  action?: ReactNode;
};

/** Avatar + @username + name, linking to the profile, with an optional action. */
export function PersonRow({ person, subtitle, action }: PersonRowProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Link
        href={`/${person.username}` as Route}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <UserAvatar
          name={person.fullName}
          src={avatarUrl(person.avatarPath)}
          pixelSize={44}
          className="size-11"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{person.username}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {subtitle ?? person.fullName}
          </span>
        </span>
      </Link>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
