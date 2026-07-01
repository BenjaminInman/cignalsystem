import LegalDoc from "@/components/LegalDoc";

export const metadata = { title: "Terms of Service · Cignal System" };

const SECTIONS = [
  { h: "Acceptance of these terms", p: `These Terms of Service (the "Terms") govern your access to and use of Cignal System (the "Platform"), operated by Cignal System LLC ("we," "us," or "our"). By creating an account or otherwise accessing or using the Platform, you agree to be bound by these Terms, our Privacy Policy, and our Disclaimer, each incorporated by reference. If you do not agree, do not use the Platform.` },
  { h: "The service", p: `The Platform provides economic data, market indicators, analytics, forecasts, and related commentary concerning the multifamily real estate industry, offered on a tiered basis (including free and paid subscription tiers). We may add, modify, suspend, or discontinue features at any time.` },
  { h: "Eligibility and accounts", p: `You must be at least 18 years old and able to form a binding contract to use the Platform. You agree to provide accurate registration information, to keep your login credentials secure, and to be responsible for all activity under your account. Notify us promptly of any unauthorized use.` },
  { h: "Subscriptions, billing, and auto-renewal", p: `Paid tiers are billed in advance on a recurring monthly basis through our payment processor, Stripe. By subscribing, you authorize us and Stripe to charge your payment method on each renewal until you cancel. Subscriptions renew automatically. We may change pricing prospectively; we will provide notice of changes before they apply to your next billing cycle.` },
  { h: "Cancellation and refunds", p: `You may cancel at any time from your account's billing settings. When you cancel, your paid access continues through the end of the current billing period, after which your account moves to the free tier. Except where required by law, payments are non-refundable and we do not provide prorated refunds for partial billing periods or unused access.` },
  { h: "Acceptable use", p: `You agree not to:`, list: [
    "Use the Platform for any unlawful purpose or in violation of these Terms;",
    "Scrape, harvest, or use automated means to extract data or content from the Platform;",
    "Reproduce, redistribute, resell, republish, or commercially exploit any data, analytics, or content without our written permission;",
    "Reverse engineer, decompile, or attempt to derive the source code or underlying models of the Platform;",
    "Share, transfer, or resell your account access; or",
    "Interfere with, disrupt, or attempt to gain unauthorized access to the Platform or its systems.",
  ] },
  { h: "Intellectual property", p: `The Platform and all content, data compilations, analytics, methodologies, frameworks, trademarks, and software are owned by or licensed to Cignal System LLC and are protected by law. Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for your own internal purposes. No other rights are granted.` },
  { h: "Third-party data and services", p: `The Platform incorporates data from third-party and publicly available sources, and relies on third-party services (including Stripe for payments and other providers for hosting, data, and communications). We are not responsible for third-party content, services, or their availability, and your use of them may be subject to their own terms.` },
  { h: "No advice; disclaimer", p: `The Platform is provided for informational and educational purposes only and does not constitute investment, financial, legal, or tax advice or any recommendation. Our full Disclaimer is incorporated into these Terms. You are solely responsible for your own decisions.` },
  { h: "Disclaimer of warranties", p: `The Platform is provided "as is" and "as available" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, accuracy, and non-infringement. We do not warrant that the Platform will be uninterrupted, error-free, or that data will be accurate, complete, or current.` },
  { h: "Limitation of liability", p: `To the fullest extent permitted by law, Cignal System LLC and its owners, members, and affiliates will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or investment, arising from or related to your use of the Platform. Our total aggregate liability for any claim will not exceed the greater of the amounts you paid to us in the twelve months preceding the claim or one hundred U.S. dollars ($100).` },
  { h: "Indemnification", p: `You agree to indemnify and hold harmless Cignal System LLC and its owners, members, and affiliates from any claims, damages, liabilities, and expenses (including reasonable attorneys' fees) arising from your use of the Platform, your violation of these Terms, or your violation of any law or third-party right.` },
  { h: "Termination", p: `We may suspend or terminate your access at any time, with or without notice, if you violate these Terms or if we discontinue the Platform. You may stop using the Platform and cancel your subscription at any time. Provisions that by their nature should survive termination will survive.` },
  { h: "Changes to these terms", p: `We may update these Terms from time to time. If we make material changes, we will take reasonable steps to notify you. Your continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.` },
  { h: "Governing law", p: `These Terms are governed by the laws of the State of Tennessee, without regard to its conflict-of-laws rules. You agree that any dispute will be resolved in the state or federal courts located in Tennessee, and you consent to their jurisdiction and venue.` },
];

export default function TermsPage() {
  return (
    <LegalDoc
      kicker="Legal"
      title="Terms of Service"
      effective="June 30, 2026"
      intro="Please read these Terms carefully. They form a binding agreement between you and Cignal System LLC governing your use of the Platform."
      sections={SECTIONS}
      contact="Cignal System LLC · Questions about these Terms: info@cignalsystem.com"
    />
  );
}
