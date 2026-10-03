import type { Metadata } from "next";

import { AuthPlaceholder } from "../auth-placeholder";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AuthPlaceholder
      title="Choose a new password"
      description="Make it at least 8 characters, and something you don't use elsewhere."
    />
  );
}
