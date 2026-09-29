export function SlackLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <img
      src="https://assets.kenoo.io/calendar-third-pary-icons/slack.png"
      alt=""
      className={className}
      aria-hidden="true"
    />
  );
}
