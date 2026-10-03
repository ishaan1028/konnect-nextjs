import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/initials";

type UserAvatarProps = {
  name: string;
  /** Public image URL. Without one, the initials fallback is shown. */
  src?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
};

/**
 * A person's avatar with an initials fallback.
 * Decorative (aria-hidden, alt=""): it always sits next to the person's name or
 * inside a labelled control, so announcing it would read the name (or the
 * initials, e.g. "AR Profile") twice.
 */
export function UserAvatar({ name, src, size = "default", className }: UserAvatarProps) {
  return (
    <Avatar aria-hidden size={size} className={className}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-brand font-semibold text-white">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
