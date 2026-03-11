"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "../data";
import { BrandLogo } from "./BrandLogo";
import { PrimaryButton } from "./PrimaryButton";

const resolveActiveLabel = (pathname: string, hash: string) => {
  if (pathname === "/landing-page/download") {
    return "Download";
  }

  if (pathname === "/login" || pathname === "/forgot-password") {
    return "Login";
  }

  if (pathname === "/landing-page" && hash === "#about") {
    return "About us";
  }

  if (pathname === "/landing-page") {
    return "Home";
  }

  return "";
};

export const HeaderSection = () => {
  const pathname = usePathname();
  const [activeLabel, setActiveLabel] = useState("");

  useEffect(() => {
    const updateActive = () => {
      setActiveLabel(resolveActiveLabel(pathname, window.location.hash));
    };

    updateActive();
    window.addEventListener("hashchange", updateActive);

    return () => {
      window.removeEventListener("hashchange", updateActive);
    };
  }, [pathname]);

  return (
    <header className="top-nav">
      <div className="container">
        <BrandLogo />
        <ul className="nav-links">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className={activeLabel === link.label ? "active" : undefined}
                onClick={() => setActiveLabel(link.label)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <PrimaryButton label="Sign up" href="/register" />
      </div>
    </header>
  );
};
