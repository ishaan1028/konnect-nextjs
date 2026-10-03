import type { Metadata } from "next";
import Link from "next/link";

import { AuthPlaceholder } from "../auth-placeholder";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthPlaceholder
      title="Forgot password?"
      description="Enter your email and we'll send you a secure reset link."
      footer={
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      }
    />
  );
}
