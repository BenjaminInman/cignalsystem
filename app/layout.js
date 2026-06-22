import "./globals.css";
import Ticker from "@/components/Ticker";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ComingSoon from "@/components/ComingSoon";
import { VerticalProvider } from "@/components/VerticalProvider";
import CommunityNotifier from "@/components/CommunityNotifier";
import { getActiveVertical, getActiveContent } from "@/lib/active-vertical";

export function generateMetadata() {
  const v = getActiveVertical();
  return { title: v.title, description: v.description };
}

export default function RootLayout({ children }) {
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
