import { cn } from "@walls/utils";

interface FallbackEmailAvatarProps {
  name: string;
  className?: string;
}

function getInitialsFromName(name: string): string {
  const safeName = name.trim();
  if (!safeName) return "U";

  const words = safeName.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }

  return safeName.slice(0, 2).toUpperCase();
}

export function FallbackEmailAvatar({ name, className }: FallbackEmailAvatarProps) {
  const safeName = name.trim() || "Unknown";
  const avatarInitials = getInitialsFromName(safeName);

  return (
    <div
      className={cn(
        "flex h-full w-full select-none items-center justify-center rounded-full border border-neutral-200 bg-gray-50 text-[13px] font-normal tracking-wide text-neutral-300 shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)]",
        className,
      )}
      aria-label={`${safeName} avatar`}
    >
      {avatarInitials}
    </div>
  );
}
