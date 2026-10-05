"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

import { followSuggestionsQueryOptions } from "../queries";
import { FollowButton } from "./follow-button";
import { PersonRow } from "./person-row";

/** "Suggested for you": friends of friends first, then popular accounts. */
export function SuggestionsList() {
  const { data: suggestions } = useSuspenseQuery(followSuggestionsQueryOptions(createClient()));

  if (suggestions.length === 0) {
    return (
      <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">
        You&apos;re following everyone we know about. Nice!
      </p>
    );
  }

  return (
    <ul>
      {suggestions.map((person) => (
        <li key={person.id}>
          <PersonRow
            person={person}
            subtitle={
              person.mutualCount > 0
                ? `Followed by ${person.mutualCount} ${person.mutualCount === 1 ? "person" : "people"} you follow`
                : person.fullName
            }
            action={
              <FollowButton
                profileId={person.id}
                username={person.username}
                // Suggestions only contain people the viewer doesn't follow;
                // some may already follow the viewer ("Follow back").
                initialStatus={{ isFollowing: false, isFollowedBy: person.followsViewer }}
              />
            }
          />
        </li>
      ))}
    </ul>
  );
}
