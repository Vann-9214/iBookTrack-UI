import React from "react";
import Image from "next/image";

type BrandLogoProps = {
  ariaLabel?: string;
  compact?: boolean;
};

export const BrandLogo = ({ ariaLabel = "iBookTrack home", compact = false }: BrandLogoProps) => (
  <a href="/landing-page" className="logo" aria-label={ariaLabel}>
    <Image
      src="/iBookTrack_logo.png"
      alt="iBookTrack"
      width={60}
      height={20}
      style={{
        width: compact ? '98px' : '100px',
        height: 'auto',
        transform: compact ? 'scale(1.68)' : 'scale(1.9)',
        transformOrigin: 'left center'
      }}
      priority
    />
  </a>
);
