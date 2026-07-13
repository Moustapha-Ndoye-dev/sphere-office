type SocialIconProps = {
  className?: string;
};

export function TikTokIcon({ className }: SocialIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M14.5 3c.36 2.06 1.57 3.29 3.5 3.7v3.06a7.32 7.32 0 0 1-3.47-1.04v5.35a5.43 5.43 0 1 1-4.68-5.38v3.1a2.4 2.4 0 1 0 1.6 2.28V3h3.05Z" />
    </svg>
  );
}
