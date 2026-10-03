import "server-only";

import { cache } from "react";

import { makeQueryClient } from "./query-client";

/**
 * One QueryClient per server request.
 *
 * React's cache() scopes it to the current request: every Server Component in
 * this render shares it (so two components prefetching the same query fetch
 * once), and it's never shared between users, so no data can leak.
 */
export const getServerQueryClient = cache(makeQueryClient);
