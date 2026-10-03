import { PageHeader } from "@/components/shared/page-header";

import { SettingsNav } from "./settings-nav";

// A nested layout: it renders inside (app)/layout.tsx and wraps every
// /settings/* page. Switching tabs only swaps {children}.
export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Settings" description="Manage your profile, account and appearance." />
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="md:w-48 md:shrink-0">
          <SettingsNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
