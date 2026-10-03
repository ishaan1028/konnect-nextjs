import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/features/auth/components/signup-form";

import { AuthHeader } from "../auth-header";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="space-y-8">
      <AuthHeader title="Join Konnect" description="Share moments and keep up with your people." />
      <SignupForm />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
