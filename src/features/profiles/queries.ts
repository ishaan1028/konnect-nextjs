import type { SupabaseClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";

import { isDemoClaims } from "@/lib/auth/demo";
import { queryKeys } from "@/lib/query/keys";
import type { Database } from "@/types/database.types";

/*
 * Query definitions shared by the server (prefetch) and the browser (read).
 * They take the Supabase client as a parameter: on the server it's the
 * cookie-based server client, in the browser the browser client. Same key,
 * same function, so server-prefetched data hydrates straight into the cache.
 */

type Supabase = SupabaseClient<Database>;

/** What the UI needs to know about the signed-in user. Nothing more. */
export type CurrentUser = {
  id: string;
  username: string;
  fullName: string;
  avatarPath: string | null;
  /** The shared demo account (read-only profile). */
  isDemo: boolean;
};

export async function fetchCurrentUser(supabase: Supabase): Promise<CurrentUser | null> {
  // getClaims() verifies the JWT; a signed-out visitor is a normal state (null).
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!auth || !userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_path")
    .eq("id", userId)
    .single();
  if (error) throw error;

  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    avatarPath: data.avatar_path,
    isDemo: isDemoClaims(auth.claims),
  };
}

export const currentUserQueryOptions = (supabase: Supabase) =>
  queryOptions({
    queryKey: queryKeys.currentUser,
    queryFn: () => fetchCurrentUser(supabase),
    // Identity only changes through your own edits, which write this cache
    // directly (sign-in/out clears it), so window focus needn't refetch it.
    // Page visits still refresh it in the background via CurrentUserBoundary.
    staleTime: 5 * 60 * 1000,
  });

/** A profile's id from its username (null if there's no such profile). */
export const profileIdQueryOptions = (supabase: Supabase, username: string) =>
  queryOptions({
    queryKey: queryKeys.profileId(username),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });
