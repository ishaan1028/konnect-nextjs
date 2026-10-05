import { BottomTabBar, MobileHeader } from "@/components/layout/mobile-nav";
import { SideNav } from "@/components/layout/side-nav";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";

/**
 * Shell for every signed-in screen. "(app)" is a route group: the parentheses
 * keep it out of the URL, so this layout wraps "/", "/explore", "/[username]"…
 * while the "(auth)" group gets a completely different layout.
 *
 * Layouts persist across navigations: moving between pages re-renders only
 * {children}, so the nav keeps its state and never re-mounts.
 */
export default function AppLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh md:pl-19 xl:pl-61">
      <SideNav />
      <MobileHeader />
      <main
        id={MAIN_CONTENT_ID}
        // Lets the skip link move focus here; no outline because it's a container.
        tabIndex={-1}
        className="w-full px-4 pt-6 pb-28 outline-none md:px-8 md:pt-10 md:pb-12"
      >
        {children}
      </main>
      <BottomTabBar />
      {/* Parallel route slot: intercepted routes (e.g. a followers list opened
          from a profile) render here as modals over the current page. */}
      {modal}
    </div>
  );
}
