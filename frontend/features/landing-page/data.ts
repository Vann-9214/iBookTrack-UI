export type NavLink = {
  href: string;
  label: string;
  isActive?: boolean;
};

export type LinkItem = {
  href: string;
  label: string;
  /** For Company links: smooth-scroll target section id */
  scrollTo?: string;
};

export type SupportItem = {
  label: string;
  /** Modal content to show when clicked */
  content: {
    heading: string;
    body: string;
  };
};

export type Feature = {
  icon: string;
  title: string;
  description: string;
};

export const NAV_LINKS: NavLink[] = [
  { href: "/landing-page", label: "Home" },
  { href: "/landing-page#about", label: "About us" },
  { href: "/login", label: "Login" },
];

export const FEATURE_CARDS: Feature[] = [
  {
    icon: "intake",
    title: "Smart Intake & Lot Validation",
    description:
      "Our system validates every physical ISBN against the digital client manifest, forcing instant segregation of duplicates and sorting errors before cutting begins.",
  },
  {
    icon: "chain",
    title: "Full Chain of Custody (WMS)",
    description:
      "A unified database for the entire warehouse flow. Maintain a digital handshake between physical stations, eliminating manual Excel logs and information silos that cause bottlenecks and book loss.",
  },
  {
    icon: "verified",
    title: "Verified Send & Live BI",
    description:
      "Sync QA remarks directly to the client database at Step 6. Our hash-check monitor verifies all softcopies during transmission, preventing network corruption and bit errors before delivery.",
  },
];

export const COMPANY_LINKS: LinkItem[] = [
  { href: "/landing-page", label: "About us", scrollTo: "about" },
  { href: "/landing-page", label: "Blog", scrollTo: "blog" },
  { href: "/landing-page", label: "Contact us", scrollTo: "contact" },
];

export const SUPPORT_LINKS: SupportItem[] = [
  {
    label: "Help center",
    content: {
      heading: "Help Center",
      body: "For assistance with iBookTrack, reach out to our support team at support@example.com or consult the in-app documentation found under Settings → Help. Our team is available Monday–Friday, 8 AM–6 PM PHT.",
    },
  },
  {
    label: "Terms of service",
    content: {
      heading: "Terms of Service",
      body: "By using iBookTrack, you agree to use the platform solely for authorized warehouse management and digitization workflows. Unauthorized access, data extraction, or misuse of client data is strictly prohibited.",
    },
  },
  {
    label: "Legal",
    content: {
      heading: "Legal",
      body: "iBookTrack is a demonstration and portfolio project. All workflows, data structures, and interfaces shown here are sample material created for learning and showcase purposes.",
    },
  },
  {
    label: "Privacy policy",
    content: {
      heading: "Privacy Policy",
      body: "iBookTrack does not collect real personal data. Everything you see — including activity logs, scan records, and transmission reports — is sample data created for the demo, stored locally, and never shared with third parties.",
    },
  },
];
