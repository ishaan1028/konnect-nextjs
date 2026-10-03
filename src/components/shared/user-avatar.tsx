import { getImageProps } from "next/image";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/initials";
import { cn } from "@/lib/utils";

const SIZE_PX = { sm: 24, default: 32, lg: 40 } as const;

type UserAvatarProps = {
  name: string;
  /** Public image URL. Without one, the initials fallback is shown. */
  src?: string | null;
  size?: keyof typeof SIZE_PX;
  /** Rendered size in CSS pixels when overriding the size with className (e.g. size-36). */
  pixelSize?: number;
  /** Load eagerly with high priority: only for the page's main, above-the-fold avatar. */
  priority?: boolean;
  className?: string;
  /** Text size for the initials when the avatar is enlarged (e.g. "text-4xl"). */
  fallbackClassName?: string;
};

/**
 * A person's avatar with an initials fallback.
 *
 * - Images go through Next's optimizer via getImageProps(): resized to the
 *   rendered size, served as AVIF/WebP, with a 2x variant for sharp screens.
 *   Base UI's AvatarImage keeps its loading/fallback logic on the <img>.
 * - Decorative (aria-hidden, alt=""): it always sits next to the person's name
 *   or inside a labelled control, so announcing it would read the name (or the
 *   initials, e.g. "AR Profile") twice.
 */
export function UserAvatar({
  name,
  src,
  size = "default",
  pixelSize,
  priority = false,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const px = pixelSize ?? SIZE_PX[size];
  const image = src
    ? getImageProps({
        src,
        alt: "",
        width: px,
        height: px,
        loading: priority ? "eager" : "lazy",
        fetchPriority: priority ? "high" : "auto",
      }).props
    : null;

  return (
    <Avatar aria-hidden size={size} className={className}>
      {image && <AvatarImage {...image} />}
      <AvatarFallback className={cn("bg-brand font-semibold text-white", fallbackClassName)}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
