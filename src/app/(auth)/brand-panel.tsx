import { Heart, MessageCircle, UserRoundPlus } from "lucide-react";

const glass =
  "rounded-3xl bg-white/12 shadow-2xl shadow-black/10 ring-1 ring-white/20 backdrop-blur-md";

/**
 * Decorative right-hand panel for auth screens (lg+ only).
 * The floating "UI" cards are pure CSS, so there are no images to load and
 * nothing that shifts layout. They're aria-hidden; only the tagline is read out.
 */
export function BrandPanel() {
  return (
    <section
      aria-label="About Konnect"
      className="relative m-3 hidden overflow-hidden rounded-[2.5rem] bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-end"
    >
      <div
        aria-hidden
        className="absolute -top-24 -left-24 size-96 rounded-full bg-brand-vivid opacity-70 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute right-0 bottom-1/3 size-72 rounded-full bg-white/10 blur-3xl"
      />

      <div aria-hidden className="absolute inset-x-12 top-14 bottom-60">
        {/* Post card: flexes to the available height so it never hits the tagline. */}
        <div
          className={`${glass} absolute top-0 left-0 flex h-full max-h-104 w-60 -rotate-6 flex-col p-3`}
        >
          <div className="flex items-center gap-2 px-1 pb-3">
            <span className="size-7 rounded-full bg-white/80" />
            <span className="h-2 w-20 rounded-full bg-white/70" />
          </div>
          <div className="min-h-0 flex-1 rounded-2xl bg-linear-to-br from-white/40 via-white/10 to-white/30" />
          <div className="flex items-center gap-2 px-1 pt-3 text-sm font-medium">
            <Heart className="size-4 fill-white" />
            1,204 likes
          </div>
        </div>

        {/* Chat bubble */}
        <div className={`${glass} absolute top-10 right-0 w-60 rotate-3 p-4`}>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <MessageCircle className="size-3.5" />
            maya · now
          </div>
          <p className="mt-2 text-sm font-medium">see you at 7? bringing the camera 📸</p>
          <div className="mt-3 flex gap-1">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="size-1.5 animate-pulse rounded-full bg-white/80" />
            ))}
          </div>
        </div>

        {/* Follow toast */}
        <div className={`${glass} absolute right-6 bottom-0 flex items-center gap-3 px-4 py-3`}>
          <span className="flex size-9 items-center justify-center rounded-full bg-white text-neutral-900">
            <UserRoundPlus className="size-4" />
          </span>
          <p className="text-sm">
            <span className="font-semibold">@arjun</span> started following you
          </p>
        </div>
      </div>

      <div className="relative max-w-md space-y-3">
        <h2 className="text-5xl leading-[1.05] font-extrabold">Your people. Your moments.</h2>
        <p className="text-lg text-white/85">
          Photos, follows and real-time chat, all in one place.
        </p>
      </div>
    </section>
  );
}
