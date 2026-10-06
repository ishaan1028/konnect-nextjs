"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SearchX } from "lucide-react";

import { FollowButton } from "@/features/follows/components/follow-button";
import { FollowListSkeleton } from "@/features/follows/components/follow-list";
import { PersonRow } from "@/features/follows/components/person-row";
import { useCurrentUser } from "@/features/profiles/hooks";
import { formatCount, pluralize } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

import { searchProfilesQueryOptions } from "../queries";

/** People matching `query`, with Follow buttons. Fetched in the browser. */
export function SearchResults({ query }: { query: string }) {
  const user = useCurrentUser();
  const { data: people, isPending } = useQuery({
    ...searchProfilesQueryOptions(createClient(), query),
    // While the next query loads, keep showing the last results (no flicker).
    placeholderData: keepPreviousData,
  });

  if (isPending) return <FollowListSkeleton />;

  return (
    <div>
      {/* Announced to screen readers as results change. */}
      <p role="status" className="sr-only">
        {people?.length
          ? `${people.length} ${pluralize(people.length, "person", "people")} found`
          : "No people found"}
      </p>
      {people?.length ? (
        <ul className="divide-y divide-border/60">
          {people.map((person) => (
            <li key={person.id}>
              <PersonRow
                person={person}
                subtitle={`${person.fullName} · ${formatCount(person.followersCount)} ${pluralize(person.followersCount, "follower", "followers")}`}
                action={
                  user?.id === person.id ? null : (
                    <FollowButton
                      profileId={person.id}
                      username={person.username}
                      initialStatus={{
                        isFollowing: person.viewerFollows,
                        isFollowedBy: person.followsViewer,
                      }}
                    />
                  )
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <SearchX aria-hidden className="size-8" />
          <p>No people match “{query}”.</p>
        </div>
      )}
    </div>
  );
}
