import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";

import { BrandPanel } from "./brand-panel";

// Route group "(auth)": /login, /signup, /forgot-password and /reset-password
// share this split-screen layout and none of the app's navigation.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <header>
          <Link
            href="/"
            aria-label="Konnect home"
            className="inline-flex rounded-xl focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <Logo />
          </Link>
        </header>
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex flex-1 items-center justify-center py-12 outline-none"
        >
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="text-xs text-muted-foreground">
          Built with Next.js and Supabase as a learning project.
        </footer>
      </div>
      <BrandPanel />
    </div>
  );
}
