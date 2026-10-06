"use client";

import { Search } from "lucide-react";
import { debounce, parseAsString, useQueryState } from "nuqs";
import type { ReactNode } from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useDebouncedValue } from "@/lib/use-debounced-value";

import { SearchResults } from "./search-results";

type ExploreSearchProps = {
  /** What Explore shows when nothing is being searched (the posts grid). */
  children: ReactNode;
};

/**
 * People search at the top of Explore. The query lives in the URL (?q=), so a
 * search can be shared, survives a refresh and Back restores it. The input
 * updates instantly; the URL and the request wait until typing pauses.
 */
export function ExploreSearch({ children }: ExploreSearchProps) {
  const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""));
  const term = useDebouncedValue(query.trim(), 300);

  return (
    <div className="space-y-6">
      <search>
        <InputGroup className="h-11">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Search people"
            placeholder="Search people"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={50}
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              // Typing waits for a pause before touching the URL; clearing is instant.
              void setQuery(value || null, {
                limitUrlUpdates: value ? debounce(300) : undefined,
              });
            }}
          />
        </InputGroup>
      </search>
      {term ? <SearchResults query={term} /> : children}
    </div>
  );
}
