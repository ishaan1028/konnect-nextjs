const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Post ids are UUIDs. A plain check, so browser code doesn't load Zod for it. */
export const isPostId = (value: string) => UUID.test(value);
