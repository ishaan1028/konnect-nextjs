import { createClient } from "@supabase/supabase-js";

/** A unique, valid identity per test, so parallel tests never collide. */
export function uniqueUser() {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    fullName: "Test Person",
    username: `e2e_${id}`.slice(0, 20),
    email: `e2e.${id}@example.com`,
    password: "konnect123",
  };
}

/**
 * Creates an already-confirmed user through the Auth admin API (secret key),
 * for tests that need an account but aren't testing sign-up itself.
 */
export async function createConfirmedUser() {
  const user = uniqueUser();
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { username: user.username, full_name: user.fullName },
  });
  if (error) throw error;
  return user;
}

export const demoUser = {
  email: process.env.DEMO_USER_EMAIL ?? "demo@konnect.dev",
  password: process.env.DEMO_USER_PASSWORD ?? "konnect-demo-2026",
};
