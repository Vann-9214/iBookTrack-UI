export type NavLink = {
  href: string;
  label: string;
  isActive?: boolean;
};

export type LinkItem = {
  href: string;
  label: string;
};

export type Feature = {
  icon: string;
  title: string;
  description: string;
};

export const NAV_LINKS: NavLink[] = [
  { href: "#", label: "Home", isActive: true },
  { href: "#about", label: "About us" },
  { href: "#download", label: "Download" },
  { href: "#login", label: "Login" },
];

export const FEATURE_CARDS: Feature[] = [
  {
    icon: "|||",
    title: "Smart Intake & Lot Validation",
    description:
      "Our system validates every physical ISBN against the digital client manifest, forcing instant segregation of duplicates and sorting errors before cutting begins.",
  },
  {
    icon: "->",
    title: "Full Chain of Custody (WMS)",
    description:
      "A unified database for the entire warehouse flow. Maintain a digital handshake between physical stations, eliminating manual Excel logs and information silos that cause bottlenecks and book loss.",
  },
  {
    icon: "[]",
    title: "Verified Send & Live BI",
    description:
      "Sync QA remarks directly to the client database at Step 6. Our hash-check monitor verifies all softcopies during transmission, preventing network corruption and bit errors before delivery.",
  },
];

export const COMPANY_LINKS: LinkItem[] = [
  { href: "#", label: "About us" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Contact us" },
  { href: "#", label: "Pricing" },
  { href: "#", label: "Testimonials" },
];

export const SUPPORT_LINKS: LinkItem[] = [
  { href: "#", label: "Help center" },
  { href: "#", label: "Terms of service" },
  { href: "#", label: "Legal" },
  { href: "#", label: "Privacy policy" },
  { href: "#", label: "Status" },
];
