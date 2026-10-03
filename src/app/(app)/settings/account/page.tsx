import { ShieldUser } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Account" };

export default function AccountSettingsPage() {
  return (
    <ComingSoon
      icon={ShieldUser}
      title="Account & danger zone"
      description="Email, password and permanently deleting your account."
      phase={12}
    />
  );
}
