/**
 * getClaims() returns an error both when nobody is signed in properly (no
 * session, or an invalid/expired token) and when something actually failed
 * (e.g. the network call for the signing keys). Only the first kind means
 * "signed out"; treating a failure as signed out would render a signed-in
 * person as a visitor, or send them to the login page, over a hiccup.
 */
const SIGNED_OUT_ERRORS = new Set(["AuthSessionMissingError", "AuthInvalidJwtError"]);

export function isSignedOutError(error: { name?: string } | null): boolean {
  return error === null || SIGNED_OUT_ERRORS.has(error.name ?? "");
}
