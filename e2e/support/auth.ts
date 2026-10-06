import { expect, type Page } from "@playwright/test";

import { createConfirmedUser } from "./users";

export async function logIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function logOut(page: Page) {
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");
}

/** A brand-new, confirmed account, logged in and on the home feed. */
export async function signUpAndLogIn(page: Page) {
  const user = await createConfirmedUser();
  await page.goto("/login");
  await logIn(page, user.email, user.password);
  await expect(page).toHaveURL("/");
  return user;
}
