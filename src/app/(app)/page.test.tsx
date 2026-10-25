import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "./page";

// Everything personal is an async Server Component that reads the session;
// Vitest can't render those, so they're stubbed here and covered by e2e tests.
vi.mock("@/features/profiles/components/current-user-boundary", () => ({
  CurrentUserBoundary: () => null,
}));
vi.mock("@/features/follows/components/suggestions-boundary", () => ({
  SuggestionsBoundary: () => null,
}));
vi.mock("@/features/posts/components/feed-boundary", () => ({
  FeedBoundary: () => null,
}));
vi.mock("@/features/home/components/people-rail-boundary", () => ({
  PeopleRailBoundary: () => null,
}));
vi.mock("@/features/chat/components/chat-boundaries", () => ({
  ChatBoundary: () => null,
}));
// (Its inbox rows import Server Actions, which only Next can load.)
vi.mock("@/features/home/components/recent-chats", () => ({
  RecentChats: () => null,
}));
vi.mock("@/features/home/components/home-cards", () => ({
  ProfileSummary: () => null,
  ProfileSummarySkeleton: () => null,
  PopularPosts: () => null,
  PopularPostsSkeleton: () => null,
}));

describe("HomePage", () => {
  it("has a single, accessible main heading", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Home feed" })).toBeInTheDocument();
  });

  it("links to the create, explore and messages pages", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "Photo" })).toHaveAttribute("href", "/create");
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute("href", "/explore");
    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute("href", "/messages");
  });
});
