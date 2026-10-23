import { z } from "zod";

/** Deleting your account: you type your username to confirm. */
export const deleteAccountSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Type your username to confirm"),
});

export type DeleteAccountInput = z.input<typeof deleteAccountSchema>;
