// Apart from the schemas, so the post forms don't load Zod with the page.
export const CAPTION_MAX_LENGTH = 2200;
export const ALT_TEXT_MAX_LENGTH = 250;
export const LOCATION_MAX_LENGTH = 100;
// No HEIC: most browsers can't decode it (iOS converts to JPEG when picking for upload).
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
/** Smallest photo width we accept (Instagram's minimum too). */
export const MIN_PHOTO_WIDTH = 320;
