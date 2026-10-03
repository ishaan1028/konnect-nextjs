import { ImageResponse } from "next/og";

import { getPublicProfile } from "@/features/profiles/server/get-public-profile";
import { formatCount } from "@/lib/format";
import { getInitials } from "@/lib/initials";

// The preview card shown when a profile link is shared (WhatsApp, X, Slack…).
export const alt = "Konnect profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GREEN_700 = "#15803d";
const GREEN_900 = "#14532d";

/**
 * Generated on demand with next/og (JSX → PNG, flexbox only) from the same
 * cached profile fetch the page uses, so sharing a link costs no extra query.
 */
export default async function ProfileOpenGraphImage({ params }: PageProps<"/[username]">) {
  const username = decodeURIComponent((await params).username).toLowerCase();
  const profile = await getPublicProfile(username);

  const name = profile?.fullName ?? "Konnect";
  const handle = profile ? `@${profile.username}` : "Profile not found";
  const bio = profile?.bio || "Share moments, follow friends, and chat in real time.";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        color: "white",
        backgroundImage: `linear-gradient(135deg, ${GREEN_700}, ${GREEN_900})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 9999,
            background: "white",
            color: GREEN_700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 96,
            fontWeight: 700,
          }}
        >
          {getInitials(name)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>{handle}</div>
          <div style={{ fontSize: 40, opacity: 0.9 }}>{name}</div>
          <div style={{ fontSize: 30, opacity: 0.8, lineHeight: 1.4 }}>{bio}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -2 }}>konnect</div>
        {profile && (
          <div style={{ display: "flex", gap: 40, fontSize: 30, opacity: 0.9 }}>
            <span>{formatCount(profile.postsCount)} posts</span>
            <span>{formatCount(profile.followersCount)} followers</span>
          </div>
        )}
      </div>
    </div>,
    size,
  );
}
