import Image from "next/image";
import {
  GOOGLE_MEET_ICON_URL,
  TEAMS_ICON_URL,
  ZOOM_ICON_URL,
  getConferenceProvider,
} from "./calendar-event-theme";

interface ConferenceLinkIconProps {
  link?: string | null;
  size?: number;
  className?: string;
}

export function ConferenceLinkIcon({
  link,
  size = 14,
  className,
}: ConferenceLinkIconProps) {
  const provider = getConferenceProvider(link);

  if (provider === "google-meet") {
    return (
      <Image
        src={GOOGLE_MEET_ICON_URL}
        alt="Google Meet"
        width={size}
        height={size}
        className={className}
      />
    );
  }

  if (provider === "zoom") {
    // eslint-disable-next-line @next/next/no-img-element -- local SVG, next/image's optimizer doesn't handle SVGs without extra config
    return <img src={ZOOM_ICON_URL} alt="Zoom" width={size} height={size} className={className} />;
  }

  if (provider === "teams") {
    return (
      <Image
        src={TEAMS_ICON_URL}
        alt="Microsoft Teams"
        width={size}
        height={size}
        className={className}
      />
    );
  }

  return null;
}
