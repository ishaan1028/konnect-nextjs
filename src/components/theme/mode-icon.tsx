import { type LucideProps, Monitor, Moon, Sun } from "lucide-react";

import type { ThemeMode } from "./theme-config";

const icons = { light: Sun, dark: Moon, system: Monitor } as const;

export function ModeIcon({ mode, ...props }: { mode: ThemeMode } & LucideProps) {
  const Icon = icons[mode];
  return <Icon aria-hidden {...props} />;
}
