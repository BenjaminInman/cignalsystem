import LegalDoc from "@/components/LegalDoc";

export const metadata = { title: "Privacy Policy · Cignal System" };

const SECTIONS = [
  { h: "Overview", p: `This Privacy Policy explains how Cignal System LLC ("we," "us," or "our") collects, uses, and shares information when you use Cignal System (the "Platform"). By using the Platform, you agree to the practices described here.` },
  { h: "Information we collect", p: `We collect:`, list: [
    "Account information you provide, such as your name and email address;",
    "Payment information, which is collected and processed by our payment processor, Stripe — we do not store your full card number or security code;",
    "Content you create or save on the Platform, such as saved markets, ZIP codes, and portfolio entries;",
    "Usage and technical data, such as log data, device and browser information, and interactions with the Platform, collected through standard cookies and similar technologies.",
  ] },
  { h: "How we use information", p: `We use information to operate and provide the Platform; authenticate your account; process subscriptions and payments; send transactional messages (such as account and billing notices); respond to your requests; improve and secure the Platform; and comply with legal obligations.` },
  { h: "Cookies", p: `We use essential cookies to keep you signed in and to operate core features. Disabling cookies may prevent parts of the Platform from working. We do not use cookies to sell your personal information.` },
  { h: "Service providers", p: `We share information with trusted providers that process it on our behalf under contract, which may include: Supabase (database and authentication), Stripe (payment processing), Vercel (hosting), Resend (transactional email), and marketing tools such as ActiveCampaign where you have opted in. These providers may only use your information to provide services to us.` },
  { h: "How we share information", p: `We do not sell your personal information. We share it only with the service providers described above, to comply with law or valid legal process, to protect our rights and the safety of others, or in connection with a business transfer such as a merger or acquisition.` },
  { h: "Marketing communications", p: `With your consent where required, we may send you product updates and marketing emails. You can opt out at any time using the unsubscribe link in those emails. Transactional messages related to your account and billing will still be sent.` },
  { h: "Data retention", p: `We retain your information for as long as your account is active and as needed to provide the Platform, comply with our legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your account and associated personal information.` },
  { h: "Security", p: `We use reasonable administrative, technical, and organizational safeguards to protect your information. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.` },
  { h: "Your rights and choices", p: `Depending on where you live, you may have rights to access, correct, delete, or port your personal information, or to object to or restrict certain processing. To exercise these rights, contact us at the email below. Residents of California, the EU/UK, and certain other jurisdictions may have additional rights under applicable law.` },
  { h: "Children", p: `The Platform is not directed to individuals under 18, and we do not knowingly collect personal information from children. If you believe a child has provided us information, contact us and we will delete it.` },
  { h: "International users", p: `We are based in the United States and process and store information in the United States. If you access the Platform from outside the U.S., you understand your information will be transferred to and processed in the U.S.` },
  { h: "Changes to this policy", p: `We may update this Privacy Policy from time to time. When we do, we will revise the effective date above and, for material changes, take reasonable steps to notify you.` },
];

export default function PrivacyPage() {
  return (
    <LegalDoc
      kicker="Legal"
      title="Privacy Policy"
      effective="June 30, 2026"
      intro="Your privacy matters. This policy describes what we collect, how we use it, and the choices you have."
      sections={SECTIONS}
      contact="Cignal System LLC · Privacy questions: info@cignalsystem.com"
    />
  );
}
