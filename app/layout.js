import "./globals.css";
import Ticker from "@/components/Ticker";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Cignal System — Market Intelligence for Multifamily",
  description:
    "Cignal System surfaces the leading and trailing signals that move the multifamily real estate market — before they hit the headlines.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="atmosphere" />
        <div className="grain" />
        <div style={{ position: "relative", zIndex: 2 }}>
          <Ticker />
          <Nav />
          <main className="mx-auto max-w-[1400px] px-5 pb-4">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
