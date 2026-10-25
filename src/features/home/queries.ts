import type { SupabaseClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";

import type { PersonSummary } from "@/features/follows/queries";
import { queryKeys } from "@/lib/query/keys";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

export type RailPerson = PersonSummary & {
  /** People you follow come first; the rest are suggestions. */
  following: boolean;
  /** Posted in the last day: the ring lights up. */
  postedRecently: boolean;
};

export const RAIL_SIZE = 15;

/** The home page's people rail. */
export const peopleRailQueryOptions = (supabase: Supabase) =>
  queryOptions({
    queryKey: queryKeys.follows.rail(),
    queryFn: async (): Promise<RailPerson[]> => {
      const { data, error } = await supabase.rpc("get_people_rail", { max_results: RAIL_SIZE });
      if (error) throw error;
      return data.map((row) => ({
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        avatarPath: row.avatar_path ?? null,
        following: row.following,
        postedRecently: row.posted_recently,
      }));
    },
  });
