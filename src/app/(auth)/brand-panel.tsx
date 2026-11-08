import { Bookmark, Heart, MapPin, MessageCircle, Send, Sparkle } from "lucide-react";
import Image from "next/image";

import { UserAvatar } from "@/components/shared/user-avatar";

// The demo feed's own photos. Static imports give width/height and a blur
// placeholder for free, so nothing shifts while they load.
import cappuccino from "../../../supabase/seed/photos/cappuccino.webp";
import filmCamera from "../../../supabase/seed/photos/film-camera.webp";
import yosemite from "../../../supabase/seed/photos/yosemite.webp";

const glass =
  "rounded-3xl bg-white/12 shadow-2xl shadow-black/10 ring-1 ring-white/20 backdrop-blur-md";

// White avatars, so they stand out on the brand gradient (rose-600 on white passes AA).
const avatarColors = "bg-white text-rose-600";

const sparkles = [
  "top-2 left-[58%] size-5",
  "top-[42%] left-[44%] size-3 [animation-delay:-1s]",
  "top-0 right-4 size-3 [animation-delay:-1.5s]",
];

/**
 * Decorative right-hand panel for auth screens (lg+ only).
 * The floating "UI" cards show the demo feed's photos; the panel is hidden
 * below lg, so its lazy images never load on phones. Everything is
 * aria-hidden; only the tagline is read out. Motion runs only when the
 * visitor hasn't asked for reduced motion.
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
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.16)_1px,transparent_1.5px)] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_75%)] bg-size-[22px_22px]"
      />

      <div aria-hidden className="absolute inset-x-12 top-14 bottom-60">
        {/* Post card: flexes to the available height so it never hits the tagline. */}
        <div
          className={`${glass} absolute top-0 left-0 flex h-full max-h-104 w-60 -rotate-6 flex-col p-3 motion-safe:animate-float`}
        >
          <div className="flex items-center gap-2 px-1 pb-3">
            <UserAvatar name="Maya K" size="sm" fallbackClassName={avatarColors} />
            <div className="leading-tight">
              <p className="text-xs font-semibold">maya.k</p>
              <p className="flex items-center gap-0.5 text-[0.625rem] text-white/80">
                <MapPin className="size-2.5" />
                Yosemite, California
              </p>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
            <Image
              src={yosemite}
              alt=""
              fill
              sizes="216px"
              placeholder="blur"
              className="object-cover"
            />
            <Heart className="absolute top-1/2 left-1/2 size-16 -translate-1/2 fill-white text-white opacity-0 drop-shadow-lg motion-safe:animate-heart-loop" />
          </div>
          <div className="flex items-center gap-3 px-1 pt-3">
            <Heart className="size-4 fill-white" />
            <MessageCircle className="size-4" />
            <Send className="size-4" />
            <Bookmark className="ml-auto size-4" />
          </div>
          <p className="px-1 pt-1.5 text-sm font-semibold">1,204 likes</p>
        </div>

        {/* Likes pill bobbing over the post's corner */}
        <div className="absolute -top-3 left-44 flex rotate-6 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 shadow-xl shadow-black/20 motion-safe:animate-float motion-safe:[animation-delay:-3s]">
          <Heart className="size-4 fill-rose-500 text-rose-500" />
          +24
        </div>

        {/* Chat bubble with a photo attached */}
        <div
          className={`${glass} absolute top-10 right-0 w-60 rotate-3 p-4 motion-safe:animate-float motion-safe:[animation-delay:-2s]`}
        >
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span className="relative">
              <UserAvatar name="Maya K" size="sm" fallbackClassName={avatarColors} />
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
            </span>
            <span className="font-semibold text-white">maya.k</span>· now
          </div>
          <p className="mt-2 text-sm font-medium">see you at 7? bringing the camera 📸</p>
          <div className="relative mt-3 h-24 overflow-hidden rounded-xl">
            <Image
              src={filmCamera}
              alt=""
              fill
              sizes="208px"
              placeholder="blur"
              className="object-cover"
            />
          </div>
          <div className="mt-3 flex gap-1">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="size-1.5 animate-pulse rounded-full bg-white/80" />
            ))}
          </div>
        </div>

        {/* Like notification */}
        <div className="absolute top-[58%] right-10 flex -rotate-2 items-center gap-3 rounded-2xl bg-white p-2.5 pr-3 text-neutral-900 shadow-2xl shadow-black/20 motion-safe:animate-float motion-safe:[animation-delay:-4s]">
          <span className="relative">
            <UserAvatar name="Sana R" />
            <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white">
              <Heart className="size-2.5 fill-white text-white" />
            </span>
          </span>
          <p className="text-sm">
            <span className="font-semibold">sana.draws</span> liked your photo
            <span className="block text-xs text-neutral-500">2m ago</span>
          </p>
          <Image
            src={cappuccino}
            alt=""
            sizes="40px"
            placeholder="blur"
            className="size-10 rounded-lg object-cover"
          />
        </div>

        {/* Follow toast */}
        <div className={`${glass} absolute right-6 bottom-0 flex items-center gap-3 px-4 py-3`}>
          <UserAvatar name="Arjun Mehta" fallbackClassName={avatarColors} />
          <p className="text-sm">
            <span className="font-semibold">@arjun</span> started following you
          </p>
        </div>

        {sparkles.map((position) => (
          <Sparkle
            key={position}
            className={`absolute fill-white text-white motion-safe:animate-twinkle ${position}`}
          />
        ))}
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
