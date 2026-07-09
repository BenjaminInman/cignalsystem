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
