"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Check } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { ModeIcon } from "./mode-icon";
import {
  ACCENT_META,
  ACCENTS,
  type Accent,
  isAccent,
  isThemeMode,
  MODE_LABELS,
  THEME_MODES,
  type ThemeMode,
} from "./theme-config";
import { useTheme } from "./use-theme";

// Shared look for a selectable card. Base UI exposes state as data attributes
// (data-checked), so styling needs no extra React state.
// Concentric corners: the preview inside a card is rounded by the card's
// radius minus its inset (2px border + p-3), so the gap around it stays even.
const optionInner = "rounded-[calc(var(--radius-3xl)-2px-12px)]";
const optionCard = cn(
  "group relative flex w-full flex-col gap-3 rounded-3xl border-2 border-transparent bg-card p-3 text-left ring-1 ring-border transition",
  "hover:ring-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
  "data-checked:border-primary data-checked:ring-primary/30",
);

function CheckBadge() {
  return (
    <span
      aria-hidden
      className="absolute top-2 right-2 flex size-6 scale-50 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow transition group-data-checked:scale-100 group-data-checked:opacity-100"
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

/** Miniature app window drawn with fixed colors, so each card previews its own mode. */
function ModePreview({ mode }: { mode: ThemeMode }) {
  const light = "bg-white [--line:var(--color-neutral-200)] [--dot:var(--color-neutral-300)]";
  const dark = "bg-neutral-900 [--line:var(--color-neutral-700)] [--dot:var(--color-neutral-600)]";

  const pane = (tone: string, className?: string) => (
    <div className={cn("flex h-full flex-col gap-1.5 p-2.5", tone, className)}>
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-(--dot)" />
        <span className="h-1.5 w-10 rounded-full bg-(--line)" />
      </div>
      <span className="h-6 rounded-md bg-(--line)" />
      <span className="h-1.5 w-3/4 rounded-full bg-(--line)" />
      <span className="mt-auto h-2.5 w-8 rounded-full bg-primary" />
    </div>
  );

  return (
    <div
      aria-hidden
      className={cn("relative h-24 overflow-hidden ring-1 ring-black/10", optionInner)}
    >
      {mode === "system" ? (
        <div className="grid h-full grid-cols-2">
          {pane(light)}
          {pane(dark)}
        </div>
      ) : (
        pane(mode === "dark" ? dark : light)
      )}
    </div>
  );
}

export function AppearanceSettings() {
  const { mode, accent, setMode, setAccent } = useTheme();
  const modeLabelId = useId();
  const accentLabelId = useId();

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 id={modeLabelId} className="text-xl font-bold">
            Theme
          </h2>
          <p className="text-sm text-muted-foreground">
            System follows your device and switches automatically.
          </p>
        </div>
        <RadioGroup
          aria-labelledby={modeLabelId}
          value={mode}
          onValueChange={(value) => isThemeMode(value) && setMode(value)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {THEME_MODES.map((option) => (
            <Radio.Root key={option} value={option} className={optionCard}>
              <ModePreview mode={option} />
              <span className="flex items-center gap-2 px-1 text-sm font-medium">
                <ModeIcon mode={option} className="size-4 text-muted-foreground" />
                {MODE_LABELS[option]}
              </span>
              <CheckBadge />
            </Radio.Root>
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 id={accentLabelId} className="text-xl font-bold">
            Accent color
          </h2>
          <p className="text-sm text-muted-foreground">
            Used for buttons, highlights and the Konnect gradient.
          </p>
        </div>
        <RadioGroup
          aria-labelledby={accentLabelId}
          value={accent}
          onValueChange={(value) => isAccent(value) && setAccent(value)}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {ACCENTS.map((option: Accent) => (
            <Radio.Root key={option} value={option} className={optionCard}>
              <span
                aria-hidden
                className={cn("h-16 ring-1 ring-black/10 ring-inset", optionInner)}
                style={{ background: ACCENT_META[option].swatch }}
              />
              <span className="px-1 text-sm font-medium">{ACCENT_META[option].label}</span>
              <CheckBadge />
            </Radio.Root>
          ))}
        </RadioGroup>
      </section>
    </div>
  );
}
