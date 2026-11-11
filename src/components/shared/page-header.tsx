import type { ReactNode } from "react";

/** The single <h1> of a page, with optional supporting text. */
export function PageHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold">{title}</h1>
      {description && <p className="text-pretty text-muted-foreground">{description}</p>}
    </div>
  );
}
