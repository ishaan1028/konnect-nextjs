import type { Metadata } from "next";
import Link from "next/link";

import { AuthPlaceholder } from "../auth-placeholder";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthPlaceholder
      title="Join Konnect"
      description="Share moments and keep up with your people."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      }
    />
  );
}
