import React from "react";
import Link from "next/link";

type PrimaryButtonProps = {
  label: string;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
  href?: string;
};

export const PrimaryButton = ({ label, type = "button", ariaLabel, href }: PrimaryButtonProps) => {
  if (href) {
    return (
      <Link href={href} className="button" aria-label={ariaLabel}>
        {label}
      </Link>
    );
  }
  return (
    <button className="button" type={type} aria-label={ariaLabel}>
      {label}
    </button>
  );
};
