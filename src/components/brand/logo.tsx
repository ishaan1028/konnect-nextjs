import { cn } from "@/lib/utils";

/**
 * The Konnect mark: a "k" on a gradient tile. The gradient uses the theme's
 * chart tokens, so it follows the active accent (green or violet) automatically.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-[30%] bg-brand shadow-sm ring-1 ring-black/5 ring-inset",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" fill="none" className="size-[70%]">
        <path
          d="M11 7.5v17M21.5 9.5 13 17.2l9 7.3"
          stroke="white"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22.4" cy="9.3" r="2.2" fill="white" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading text-2xl font-extrabold tracking-tighter", className)}>
      konnect
    </span>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {compact ? <span className="sr-only">Konnect</span> : <Wordmark />}
    </span>
  );
}
