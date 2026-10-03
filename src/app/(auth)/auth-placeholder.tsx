import type { ReactNode } from "react";

type AuthPlaceholderProps = {
  title: string;
  description: string;
  footer?: ReactNode;
};

/** Stand-in for the auth forms, which are built in phase 4. */
export function AuthPlaceholder({ title, description, footer }: AuthPlaceholderProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-3xl border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
        The form arrives in phase 4, with React Hook Form, Zod and Supabase Auth.
      </div>
      {footer && <div className="text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
