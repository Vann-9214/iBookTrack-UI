import React from "react";
import { NAV_LINKS } from "../data";
import { BrandLogo } from "./BrandLogo";
import { PrimaryButton } from "./PrimaryButton";

export const HeaderSection = () => (
  <header className="top-nav">
    <div className="container">
      <BrandLogo />
      <ul className="nav-links">
        {NAV_LINKS.map((link) => (
          <li key={link.label}>
            <a href={link.href} className={link.isActive ? "active" : undefined}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <PrimaryButton label="Sign up" />
    </div>
  </header>
);
