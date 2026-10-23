import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DeleteAccountDialog } from "@/features/account/components/delete-account-dialog";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { DemoAccountNotice } from "@/features/auth/components/demo-account-notice";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

export default function AccountSettingsPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">Account</h2>
      {/* The settings shell is prerendered; the user's own data streams in. */}
      <Suspense fallback={<AccountSkeleton />}>
        <AccountSettings />
      </Suspense>
    </div>
  );
}

async function AccountSettings() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single()
    .throwOnError();

  return (
    <div className="space-y-10">
      {user.isDemo && (
        <DemoAccountNotice message="Its password can't be changed and the account can't be deleted, so everyone can keep using it. Create your own account to try these." />
      )}

      <section aria-labelledby="password-heading" className="space-y-4">
        <div className="space-y-1">
          <h3 id="password-heading" className="font-semibold">
            Change password
          </h3>
          <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
        </div>
        {/* Disabled for the demo; the actions refuse it too. */}
        <fieldset disabled={user.isDemo} className="min-w-0">
          <legend className="sr-only">Change password</legend>
          <ChangePasswordForm />
        </fieldset>
      </section>

      <section
        aria-labelledby="delete-heading"
        className="space-y-4 rounded-2xl border border-destructive/40 p-5"
      >
        <div className="space-y-1">
          <h3 id="delete-heading" className="font-semibold text-destructive">
            Delete account
          </h3>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and everything you&apos;ve posted. This can&apos;t be
            undone.
          </p>
        </div>
        <fieldset disabled={user.isDemo} className="min-w-0">
          <legend className="sr-only">Delete account</legend>
          <DeleteAccountDialog username={profile.username} />
        </fieldset>
      </section>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div aria-hidden className="space-y-10">
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full rounded-4xl" />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-4xl" />
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
    </div>
  );
}
