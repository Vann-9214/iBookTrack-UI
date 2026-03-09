import React from "react";

type PrimaryButtonProps = {
  label: string;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
};

export const PrimaryButton = ({ label, type = "button", ariaLabel }: PrimaryButtonProps) => (
  <button className="button" type={type} aria-label={ariaLabel}>
    {label}
  </button>
);
