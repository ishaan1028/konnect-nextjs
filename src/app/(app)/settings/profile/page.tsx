import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarEditor } from "@/features/profiles/components/avatar-editor";
import { ProfileSettingsForm } from "@/features/profiles/components/profile-settings-form";
import { DEMO_READ_ONLY_MESSAGE } from "@/lib/auth/demo";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit profile" };

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">Edit profile</h2>
      {/* The settings shell is prerendered; the user's own data streams in. */}
      <Suspense fallback={<SettingsSkeleton />}>
        <ProfileSettings />
      </Suspense>
    </div>
  );
}

/**
 * Reads the signed-in user's full profile with the cookie-based client (never
 * the cached public one: settings must always show the latest saved values).
 */
async function ProfileSettings() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, full_name, bio, avatar_path")
    .eq("id", user.id)
    .single();
  if (error) throw error;

  return (
    <div className="space-y-8">
      {user.isDemo && (
        <Alert>
          <Lock aria-hidden />
          <AlertTitle>This is the shared demo account</AlertTitle>
          <AlertDescription>
            <p>
              {DEMO_READ_ONLY_MESSAGE}{" "}
              <Link href="/signup" className="font-medium text-foreground underline">
                Sign up
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}
      {/* A disabled <fieldset> natively disables every control inside it. The
          database enforces the same rule; this just makes it obvious. */}
      <fieldset disabled={user.isDemo} className="min-w-0 space-y-8">
        <legend className="sr-only">Profile details</legend>
        <AvatarEditor
          userId={user.id}
          fullName={profile.full_name}
          avatarPath={profile.avatar_path}
        />
        <ProfileSettingsForm
          initial={{ fullName: profile.full_name, username: profile.username, bio: profile.bio }}
        />
      </fieldset>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-hidden className="space-y-8">
      <Skeleton className="h-32 w-full rounded-3xl" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full rounded-4xl" />
        </div>
      ))}
    </div>
  );
}
