import { Grid3x3 } from "lucide-react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { ProfilePostsBoundary } from "@/features/posts/components/profile-posts-boundary";
import { ProfilePostsSkeleton } from "@/features/posts/components/profile-posts-skeleton";
import { ViewerFollowBoundary } from "@/features/follows/components/viewer-follow-boundary";
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
            <ViewerFollowBoundary profileId={profile.id}>
              <ProfileActions profileId={profile.id} username={profile.username} />
            </ViewerFollowBoundary>
          </Suspense>
        }
      />
      <section aria-labelledby="posts-heading" className="space-y-4 border-t pt-4">
        <h2
          id="posts-heading"
          className="flex items-center justify-center gap-2 text-xs font-semibold tracking-widest uppercase"
        >
          <Grid3x3 aria-hidden className="size-4" />
          Posts
        </h2>
        {/* Public, so it's the same for everyone; it streams in under the header. */}
        <Suspense fallback={<ProfilePostsSkeleton count={profile.postsCount} />}>
          <ProfilePostsBoundary profileId={profile.id} username={profile.username} />
        </Suspense>
      </section>
    </>
  );
}
