import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type ComingSoonProps = {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  /** The PLAN.md phase that builds this screen. */
  phase: number | "bonus";
  className?: string;
  children?: ReactNode;
};

/** Placeholder for screens that later phases will build out. */
export function ComingSoon({
  icon: Icon,
  title,
  description,
  phase,
  className,
  children,
}: ComingSoonProps) {
  return (
    <Empty className={cn("border bg-card/50", className)}>
      <EmptyHeader>
        <EmptyMedia className="size-14 rounded-2xl bg-brand text-white shadow-lg shadow-primary/20">
          <Icon aria-hidden className="size-7" />
        </EmptyMedia>
        <EmptyTitle className="font-heading text-xl font-bold">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {phase === "bonus" ? "Planned bonus feature" : `Arrives in phase ${phase}`}
        </span>
        {children}
      </EmptyContent>
    </Empty>
  );
}
