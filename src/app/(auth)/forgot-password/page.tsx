import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthNotice } from "@/features/auth/components/auth-notice";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

import { AuthHeader } from "../auth-header";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  return (
    <div className="space-y-8">
      <AuthHeader
        title="Forgot password?"
        description="Enter your email and we'll send you a secure reset link."
      />
      <Suspense fallback={null}>
        <AuthNotice searchParams={searchParams} />
      </Suspense>
      <ForgotPasswordForm />
      <p className="text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      </p>
    </div>
  );
}
