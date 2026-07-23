import React from "react";
import Image from "next/image";

type BrandLogoProps = {
  ariaLabel?: string;
  compact?: boolean;
};

export const BrandLogo = ({ ariaLabel = "iBookTrack home", compact = false }: BrandLogoProps) => (
  <a href="/landing-page" className="logo" aria-label={ariaLabel}>
    {/* Natural size 856×204 (content area inside 1024×1024 canvas) */}
    <Image
      src="/iBookTrack_logo.png"
      alt="iBookTrack"
      width={856}
      height={204}
      className={compact ? "logo-img logo-img--compact" : "logo-img"}
      priority
    />
  </a>
);
