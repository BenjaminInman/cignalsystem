import "./globals.css";

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
        <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
      </body>
    </html>
  );
}
