"use client";

import { Bookmark, LogOut, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";

import { ModeIcon } from "@/components/theme/mode-icon";
import {
  ACCENT_META,
  ACCENTS,
  isAccent,
  isThemeMode,
  MODE_LABELS,
  THEME_MODES,
} from "@/components/theme/theme-config";
import { useTheme } from "@/components/theme/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

type MoreMenuProps = {
  /** "rail": full-width row in the side nav. "icon": compact button for the mobile header. */
  variant: "rail" | "icon";
};

export function MoreMenu({ variant }: MoreMenuProps) {
  const { mode, accent, setMode, setAccent } = useTheme();
  const signOut = useAction(signOutAction);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={variant === "icon" ? "More options" : undefined}
        className={cn(
          "flex items-center rounded-2xl transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none aria-expanded:bg-accent",
          variant === "rail"
            ? "h-12 w-full gap-4 px-3 text-[0.95rem] text-foreground/80 max-xl:justify-center max-xl:px-0"
            : "size-11 justify-center",
        )}
      >
        <Menu aria-hidden className="size-6 shrink-0" />
        {variant === "rail" && <span className="max-xl:sr-only">More</span>}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={variant === "rail" ? "top" : "bottom"}
        align={variant === "rail" ? "start" : "end"}
        className="w-64"
      >
        <DropdownMenuGroup>
          <DropdownMenuLinkItem render={<Link href="/settings/profile" />}>
            <Settings aria-hidden />
            Settings
          </DropdownMenuLinkItem>
          <DropdownMenuLinkItem render={<Link href="/saved" />}>
            <Bookmark aria-hidden />
            Saved
          </DropdownMenuLinkItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(value) => isThemeMode(value) && setMode(value)}
          >
            {THEME_MODES.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                <ModeIcon mode={option} />
                {MODE_LABELS[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Accent</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={accent}
            onValueChange={(value) => isAccent(value) && setAccent(value)}
          >
            {ACCENTS.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                <span
                  aria-hidden
                  className="size-4 rounded-full ring-1 ring-black/10 ring-inset"
                  style={{ background: ACCENT_META[option].swatch }}
                />
                {ACCENT_META[option].label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* The Server Action signs out on the server (revoking the refresh
            token), clears cached pages, and redirects to /login. */}
        <DropdownMenuItem
          variant="destructive"
          disabled={signOut.isPending}
          onClick={() => signOut.execute()}
        >
          <LogOut aria-hidden />
          {signOut.isPending ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
