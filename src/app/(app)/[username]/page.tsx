import { Grid3x3 } from "lucide-react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { CurrentUserBoundary } from "@/features/profiles/components/current-user-boundary";
import { ProfileActions } from "@/features/profiles/components/profile-actions";
import {
  ProfileHeader,
  ProfileHeaderSkeleton,
} from "@/features/profiles/components/profile-header";
import { getPublicProfile } from "@/features/profiles/server/get-public-profile";

/** Usernames are stored lowercase; /Alex.Demo and /alex.demo are the same person. */
const normalize = (raw: string) => decodeURIComponent(raw).toLowerCase();

/**
 * Reuses the cached profile fetch, so the <title> and the page share one
 * lookup. Because the page already has request-time parts (params, the
 * viewer's buttons), the metadata streams in with them.
 */
export async function generateMetadata({ params }: PageProps<"/[username]">): Promise<Metadata> {
  const profile = await getPublicProfile(normalize((await params).username));
  if (!profile) return { title: "Profile not found" };

  const title = `${profile.fullName} (@${profile.username})`;
  const description =
    profile.bio ||
    `See photos and posts from ${profile.fullName} (@${profile.username}) on Konnect.`;

  return {
    title,
    description,
    alternates: { canonical: `/${profile.username}` },
    openGraph: { title, description, type: "profile", username: profile.username },
  };
}

export default function ProfilePage({ params }: PageProps<"/[username]">) {
  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <Suspense fallback={<ProfileHeaderSkeleton />}>
        <Profile params={params} />
      </Suspense>
    </div>
  );
}

async function Profile({ params }: Pick<PageProps<"/[username]">, "params">) {
  const raw = decodeURIComponent((await params).username);
  const username = normalize(raw);
  if (raw !== username) permanentRedirect(`/${username}`);

  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  return (
    <>
      <ProfileHeader
        profile={profile}
        actions={
          // Public header from cache; only the viewer-specific button streams in.
          <Suspense fallback={null}>
            <CurrentUserBoundary>
              <ProfileActions profileId={profile.id} />
            </CurrentUserBoundary>
          </Suspense>
        }
      />
      <section aria-labelledby="posts-heading" className="space-y-4">
        <h2 id="posts-heading" className="sr-only">
          Posts
        </h2>
        <ComingSoon
          icon={Grid3x3}
          title="No posts yet"
          description="Photos shared by this account will appear here."
          phase={8}
        />
      </section>
    </>
  );
}
