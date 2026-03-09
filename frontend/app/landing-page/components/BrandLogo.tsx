import React from "react";

type BrandLogoProps = {
  ariaLabel?: string;
};

export const BrandLogo = ({ ariaLabel = "iBookTrack home" }: BrandLogoProps) => (
  <a href="/landing-page" className="logo" aria-label={ariaLabel}>
    <span className="logo-mark" aria-hidden>
      IB
    </span>
    <span className="logo-text">iBookTrack</span>
  </a>
);
