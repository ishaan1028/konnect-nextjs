import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getSessionUser } from "@/lib/dal";

import { AuthHeader } from "../auth-header";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-8">
      <AuthHeader
        title="Choose a new password"
        description="Make it at least 8 characters, and something you don't use elsewhere."
      />
      {/* The session check reads cookies (request-time), so it streams in
          behind this boundary while the heading above is prerendered. */}
      <Suspense fallback={<FormSkeleton />}>
        <ResetPasswordGate />
      </Suspense>
    </div>
  );
}

/** The reset link signs the user in (see /auth/confirm); without a session it's expired. */
async function ResetPasswordGate() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <Alert role="alert">
        <TriangleAlert aria-hidden />
        <AlertTitle>This reset link has expired</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>Reset links work once, for 1 hour. Request a new one to continue.</p>
          <Link href="/forgot-password" className={buttonVariants({ size: "sm" })}>
            Request a new link
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return <ResetPasswordForm />;
}

function FormSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {[0, 1].map((row) => (
        <div key={row} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full rounded-4xl" />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-4xl" />
    </div>
  );
}
