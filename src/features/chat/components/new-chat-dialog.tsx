"use client";

import { useQueryClient, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Search, SquarePen } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { FollowListSkeleton } from "@/features/follows/components/follow-list";
import { followListQueryOptions } from "@/features/follows/queries";
import { useCurrentUser } from "@/features/profiles/hooks";
import { queryKeys } from "@/lib/query/keys";
import { avatarUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

/**
 * "New message": pick someone you follow, and the chat with them opens (an
 * existing one is reopened, never duplicated). Render inside a CurrentUserBoundary.
 */
export function NewChatDialog({ variant = "icon" }: { variant?: "icon" | "button" }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === "icon" ? (
        <Button variant="ghost" size="icon" aria-label="New message" onClick={() => setOpen(true)}>
          <SquarePen aria-hidden />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>Send message</Button>
      )}
      <DialogContent className="h-[min(36rem,85dvh)] grid-rows-[auto_auto_1fr] gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">New message</DialogTitle>
        </DialogHeader>
        {open && <PeoplePicker onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function PeoplePicker({ onDone }: { onDone: () => void }) {
  const [filter, setFilter] = useState("");
  return (
    <>
      <InputGroup>
        <InputGroupAddon>
          <Search aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label="Search people you follow"
          placeholder="Search people you follow"
          autoComplete="off"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </InputGroup>
      <div className="-mx-6 min-h-0 overflow-y-auto px-6">
        <Suspense fallback={<FollowListSkeleton />}>
          <People filter={filter.trim().toLowerCase()} onDone={onDone} />
        </Suspense>
      </div>
    </>
  );
}

function People({ filter, onDone }: { filter: string; onDone: () => void }) {
  const user = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState<string | null>(null);
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useSuspenseInfiniteQuery(
    followListQueryOptions(createClient(), user?.id ?? "", "following"),
  );
  const { ref: sentinelRef } = useInView({
    rootMargin: "200px",
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });

  // shortcut: filters the people loaded so far; a server-side search would be needed for huge follow lists.
  const people = data.pages
    .flatMap((page) => page.items)
    .filter(
      (person) =>
        !filter ||
        person.username.includes(filter) ||
        person.fullName.toLowerCase().includes(filter),
    );

  const start = async (personId: string) => {
    setStarting(personId);
    const { data: conversationId, error } = await createClient().rpc("get_or_create_dm", {
      other_user_id: personId,
    });
    setStarting(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.chat.inbox });
    onDone();
    router.push(`/messages/${conversationId}` as Route);
  };

  if (people.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        {filter ? "Nobody you follow matches." : "Follow people to message them."}
      </p>
    );
  }

  return (
    <ul>
      {people.map((person) => (
        <li key={person.id}>
          <button
            type="button"
            disabled={starting !== null}
            onClick={() => void start(person.id)}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
          >
            <UserAvatar
              name={person.fullName}
              src={avatarUrl(person.avatarPath)}
              pixelSize={44}
              className="size-11"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{person.username}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {person.fullName}
              </span>
            </span>
            {starting === person.id && <Spinner aria-label="Opening chat" />}
          </button>
        </li>
      ))}
      <li ref={sentinelRef} aria-hidden />
    </ul>
  );
}
