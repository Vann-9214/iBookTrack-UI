"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "../data";
import { BrandLogo } from "./BrandLogo";
import { PrimaryButton } from "./PrimaryButton";
import { useSmoothScroll } from "./SmoothScrollProvider";

const resolveActiveLabel = (pathname: string, hash: string) => {
  if (pathname === "/login") return "Login";
  if (pathname === "/landing-page" && hash === "#about") return "About us";
  if (pathname === "/landing-page") return "Home";
  return "";
};

export const HeaderSection = () => {
  const pathname = usePathname();
  const [activeLabel, setActiveLabel] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const isOnLandingPage = pathname === "/landing-page";
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    const updateActive = () => {
      setActiveLabel(resolveActiveLabel(pathname, window.location.hash));
    };
    updateActive();
    window.addEventListener("hashchange", updateActive);
    return () => window.removeEventListener("hashchange", updateActive);
  }, [pathname]);

  // Track scroll position to update active label between Home / About us
  useEffect(() => {
    if (!isOnLandingPage) return;
    const onScroll = () => {
      const aboutEl = document.getElementById("about");
      if (!aboutEl) return;
      const sb = (window as any).__smoothScrollbar;
      const scrollTop = sb ? sb.scrollTop : window.scrollY;
      if (scrollTop >= aboutEl.offsetTop - 120) {
        setActiveLabel("About us");
      } else {
        setActiveLabel("Home");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isOnLandingPage]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    link: { href: string; label: string }
  ) => {
    setMenuOpen(false);
    if (!isOnLandingPage) return; // let Next.js navigate normally for other pages

    const hash = link.href.includes("#") ? link.href.split("#")[1] : null;

    if (hash) {
      // Scroll to anchored section via smooth-scrollbar
      e.preventDefault();
      const target = document.getElementById(hash);
      if (target) {
        scrollTo(target);
        history.pushState(null, "", `#${hash}`);
        setActiveLabel(link.label);
      }
    } else if (link.label === "Home") {
      // Scroll back to top via smooth-scrollbar
      e.preventDefault();
      scrollTo(0);
      history.pushState(null, "", window.location.pathname);
      setActiveLabel("Home");
    }
  };

  return (
    <header className="top-nav">
      <div className="container">
        <BrandLogo />

        {/* Desktop: links + button grouped on the right */}
        <div className="nav-right">
          <ul className="nav-links">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={activeLabel === link.label ? "active" : undefined}
                  onClick={(e) => handleNavClick(e, link)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <PrimaryButton label="Sign up" href="/register" />
        </div>

        {/* Hamburger button — mobile only */}
        <button
          className={`nav-hamburger${menuOpen ? " open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="nav-mobile-menu">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={activeLabel === link.label ? "active" : undefined}
                  onClick={(e) => handleNavClick(e, link)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="nav-mobile-cta">
            <PrimaryButton label="Sign up" href="/register" />
          </div>
        </div>
      )}
    </header>
  );
};
