"use client";

import { Bookmark, ChevronLeft, ChevronRight, Menu, Moon, Settings, Sun } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type MoreMenuProps = {
  /** "rail": full-width row in the side nav. "icon": compact button for the mobile header. */
  variant: "rail" | "icon";
  /**
   * The account section (who's signed in, Log in / Log out). It's a *slot*
   * filled by Server Components so that only these items stream in: the menu
   * itself is always the same instance, so its open state survives the moment
   * the user's data arrives. (Swapping a whole fallback menu for a "real" one
   * would close a menu someone had just opened.)
   */
  account?: ReactNode;
  /** Rail only: who's signed in, shown inside the trigger (a streamed slot, like `account`). */
  summary?: ReactNode;
};

export function MoreMenu({ variant, summary, account }: MoreMenuProps) {
  const { mode, accent, resolvedMode, setMode, setAccent } = useTheme();

  // The mode toggle can't live inside the trigger (a button can't contain a
  // button), so it sits over a spacer the trigger keeps free, left of the arrow.
  const modeToggle = variant === "rail" && (
    <button
      type="button"
      onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
      aria-label={resolvedMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={resolvedMode === "dark" ? "Light mode" : "Dark mode"}
      className="absolute top-1/2 right-[2.125rem] flex size-8 -translate-y-1/2 items-center justify-center rounded-xl text-foreground/80 transition-colors hover:bg-background/70 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none max-xl:hidden"
    >
      {resolvedMode === "dark" ? (
        <Sun aria-hidden className="size-4" />
      ) : (
        <Moon aria-hidden className="size-4" />
      )}
    </button>
  );

  return (
    <div className={cn(variant === "rail" && "relative")}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={variant === "icon" ? "More options" : undefined}
          className={cn(
            "group/more flex items-center rounded-2xl transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
            variant === "rail"
              ? // shadcn's NavUser: the whole account row opens the menu.
                "w-full gap-2.5 bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-2 text-left ring-1 ring-primary/10 hover:from-primary/15 data-popup-open:from-primary/20 max-xl:justify-center max-xl:bg-none max-xl:p-1 max-xl:ring-0 max-xl:hover:bg-accent dark:from-primary/25 dark:via-primary/10"
              : "size-11 justify-center hover:bg-accent aria-expanded:bg-accent",
          )}
        >
          {variant === "rail" ? (
            <>
              {summary}
              {/* Kept free for the light/dark toggle, which sits on top of it. */}
              <span aria-hidden className="ml-auto size-8 shrink-0 max-xl:hidden" />
              {/* › points to where the menu opens; ‹ (while it's open) closes it. */}
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground group-data-popup-open/more:hidden max-xl:hidden"
              />
              <ChevronLeft
                aria-hidden
                className="hidden size-4 shrink-0 text-muted-foreground group-data-popup-open/more:block max-xl:hidden max-xl:group-data-popup-open/more:hidden"
              />
              <span className="sr-only">, account menu</span>
            </>
          ) : (
            <Menu aria-hidden className="size-6 shrink-0" />
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          // Beside the sidebar, lined up with its foot (like shadcn's NavUser).
          side={variant === "rail" ? "right" : "bottom"}
          align="end"
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

          {account && (
            <>
              <DropdownMenuSeparator />
              {account}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {modeToggle}
    </div>
  );
}
