import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const rules = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "A letter", test: (value: string) => /[A-Za-z]/.test(value) },
  { label: "A number", test: (value: string) => /\d/.test(value) },
];

/** Live password requirements, shown while choosing a new password. */
export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  return (
    <ul id={id} className="grid gap-1 text-sm sm:grid-cols-3" aria-label="Password requirements">
      {rules.map(({ label, test }) => {
        const met = test(password);
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              met ? "text-primary" : "text-muted-foreground",
            )}
          >
            {met ? (
              <Check aria-hidden className="size-3.5" strokeWidth={3} />
            ) : (
              <Circle aria-hidden className="size-3.5" />
            )}
            {label}
            <span className="sr-only">{met ? "(met)" : "(not met yet)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
