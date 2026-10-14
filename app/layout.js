import "./globals.css";
import Ticker from "@/components/Ticker";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SocialRail from "@/components/SocialRail";
import ComingSoon from "@/components/ComingSoon";
import { VerticalProvider } from "@/components/VerticalProvider";
import CommunityNotifier from "@/components/CommunityNotifier";
import { getActiveVertical, getActiveContent, isHubRequest, activePublicPath } from "@/lib/active-vertical";
import { SITE_URL } from "@/lib/vertical-slug";

const HUB_META = {
  title: "Cignal System — Market Cycle Intelligence",
  description:
    "Every market moves through 4 phases. Cignal System reads leading and trailing indicators to show which phase your market is in — for multifamily operators, passive investors, real estate investors and business owners.",
};

export function generateMetadata() {
  const hub = isHubRequest();
  const v = hub ? HUB_META : getActiveVertical();
  const path = activePublicPath();
  return {
    metadataBase: new URL(SITE_URL),
    title: v.title,
    description: v.description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: { title: v.title, description: v.description, siteName: "Cignal System", url: path || "/", type: "website" },
  };
}

export default function RootLayout({ children }) {
  // The hub ("/") renders its own chrome; verticals get the full app shell.
  if (isHubRequest()) {
    return (
      <html lang="en">
        <body>
          <div className="atmosphere" />
          <div className="grain" />
          <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
        </body>
      </html>
    );
  }

  const vertical = getActiveVertical();
  const content = getActiveContent();

  return (
    <html lang="en">
      <body>
        <div className="atmosphere" />
        <div className="grain" />
        <div style={{ position: "relative", zIndex: 2 }}>
          {vertical.ready ? (
            <VerticalProvider vertical={vertical} content={content}>
              <Ticker />
              <Nav />
              <main className="mx-auto max-w-[1400px] px-5 pb-4">{children}</main>
              <Footer />
              <SocialRail />
              <CommunityNotifier />
            </VerticalProvider>
          ) : (
            <ComingSoon vertical={vertical} />
          )}
        </div>
      </body>
    </html>
  );
}
