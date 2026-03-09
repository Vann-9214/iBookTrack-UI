import React from "react";
import Image from "next/image";

type BrandLogoProps = {
  ariaLabel?: string;
};

export const BrandLogo = ({ ariaLabel = "iBookTrack home" }: BrandLogoProps) => (
  <a href="/landing-page" className="logo" aria-label={ariaLabel}>
    <Image
      src="/iBookTrack_logo.png"
      alt="iBookTrack"
      width={60}
      height={20}
      style={{ width: '100px', height: 'auto', transform: 'scale(1.9)', transformOrigin: 'left center' }}
      priority
    />
  </a>
);
