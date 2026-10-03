import { syncThemeToDom, themeDomConfig } from "./theme-config";

const script = `(${syncThemeToDom.toString()})(${JSON.stringify(themeDomConfig)})`;

/**
 * Server Component rendered inside <head> by the root layout.
 *
 * The browser executes it synchronously during HTML parsing, so the saved
 * mode/accent is on <html> before anything paints: no flash of the wrong theme.
 * Reading a cookie in the layout instead would make every route dynamic.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
