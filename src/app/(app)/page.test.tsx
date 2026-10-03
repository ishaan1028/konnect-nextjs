import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

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
