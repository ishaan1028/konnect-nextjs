import { UserRoundPen } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Edit profile" };

export default function ProfileSettingsPage() {
  return (
    <ComingSoon
      icon={UserRoundPen}
      title="Edit your profile"
      description="Change your avatar, name, username and bio."
      phase={6}
    />
  );
}
