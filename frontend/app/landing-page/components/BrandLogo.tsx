import React from "react";

type BrandLogoProps = {
  ariaLabel?: string;
};

export const BrandLogo = ({ ariaLabel = "iBookTrack home" }: BrandLogoProps) => (
  <a href="/landing-page" className="logo" aria-label={ariaLabel}>
    <img src="/iBookTrack_logo.png" alt="iBookTrack" width={206} height={70} className="logo-image" />
  </a>
);
