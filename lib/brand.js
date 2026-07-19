// Brand constants shared by the site and the email templates.
//
// SOCIAL: set a URL to switch that channel on. Anything left empty is omitted
// everywhere — no dead "#" links in emails or the footer.
export const SOCIAL = {
  x: process.env.NEXT_PUBLIC_SOCIAL_X || "",
  linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || "",
  youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || "",
  instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || "",
  facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || "",
  tiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK || "",
};

export const activeSocials = () => Object.entries(SOCIAL).filter(([, url]) => url);

// Ordered channels rendered in the footer + the floating rail.
// `fallback` is the platform home, so icons are visible and clickable for
// preview/review before the real profile URLs are wired in. Set the matching
// NEXT_PUBLIC_SOCIAL_* env var to point a channel at its real profile.
const CHANNEL_META = [
  { key: "facebook", label: "Facebook", fallback: "https://facebook.com" },
  { key: "x", label: "X", fallback: "https://x.com" },
  { key: "youtube", label: "YouTube", fallback: "https://youtube.com" },
  { key: "instagram", label: "Instagram", fallback: "https://instagram.com" },
  { key: "linkedin", label: "LinkedIn", fallback: "https://linkedin.com" },
];

export const socialLinks = () =>
  CHANNEL_META.map(({ key, label, fallback }) => ({
    key,
    label,
    href: SOCIAL[key] || fallback,
    configured: Boolean(SOCIAL[key]),
  }));
