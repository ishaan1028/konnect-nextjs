/**
 * The @modal slot renders nothing unless an intercepted route (e.g. a
 * followers list opened from a profile) is active. default.tsx covers a hard
 * load of any page, so the slot doesn't 404.
 */
export default function ModalDefault() {
  return null;
}
