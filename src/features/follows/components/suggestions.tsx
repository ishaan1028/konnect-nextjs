"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

import { followSuggestionsQueryOptions } from "../queries";
import { FollowButton } from "./follow-button";
import { PersonRow } from "./person-row";

/** "Suggested for you": friends of friends first, then popular accounts. */
export function SuggestionsList() {
  const { data: suggestions } = useSuspenseQuery(followSuggestionsQueryOptions(createClient()));

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
      {/* Fewer than the box holds: the free space points somewhere useful. */}
      {suggestions.length < 2 && (
        <li>
          <Link
            href="/explore"
            className="flex items-center gap-3 rounded-2xl py-2 text-sm hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border">
              <Compass aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">
                {suggestions.length === 0 ? "You follow everyone we know" : "Find more people"}
              </span>
              <span className="block text-muted-foreground">Search and browse on Explore</span>
            </span>
          </Link>
        </li>
      )}
    </ul>
  );
}
