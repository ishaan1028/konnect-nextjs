"use client";

import { useCurrentUser } from "../hooks";

/** "Welcome back, Alex". Falls back to the generic line while it streams in. */
export function WelcomeGreeting() {
  const user = useCurrentUser();
  const firstName = user?.fullName.split(/\s+/)[0];
  return <>{firstName ? `Welcome back, ${firstName}` : "Welcome to Konnect"}</>;
}
