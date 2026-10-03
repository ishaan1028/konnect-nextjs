import type { Metadata } from "next";
import Link from "next/link";

import { AuthPlaceholder } from "../auth-placeholder";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthPlaceholder
      title="Welcome back"
      description="Log in to see what your friends are sharing."
      footer={
        <div className="flex flex-col gap-2">
          <Link
            href="/forgot-password"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
          <p>
            New to Konnect?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      }
    />
  );
}
