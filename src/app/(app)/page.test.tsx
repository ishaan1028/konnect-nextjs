import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "./page";

// The greeting, suggestions and feed are async Server Components that read the session;
// Vitest can't render those, so they're stubbed here and covered by e2e/shell.spec.ts.
vi.mock("@/features/profiles/components/current-user-boundary", () => ({
  CurrentUserBoundary: () => null,
}));
vi.mock("@/features/follows/components/suggestions-boundary", () => ({
  SuggestionsBoundary: () => null,
}));
vi.mock("@/features/posts/components/feed-boundary", () => ({
  FeedBoundary: () => null,
}));

describe("HomePage", () => {
  it("has a single, accessible main heading", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Home feed" })).toBeInTheDocument();
  });

  it("links to the create and explore pages", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "New post" })).toHaveAttribute("href", "/create");
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute("href", "/explore");
  });
});
