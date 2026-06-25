"use client";

import React from "react";
import { IllustrationHero } from "./Illustrations";
import { PrimaryButton } from "./PrimaryButton";
import { useSmoothScroll } from "./SmoothScrollProvider";

export const HeroSection = () => {
  const { scrollTo } = useSmoothScroll();

  const handleScrollToAbout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById("about");
    if (target) {
      scrollTo(target);
      history.pushState(null, "", "#about");
    }
  };

  return (
    <section className="hero">
      <div className="container">
        <div>
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Now live — version 1.0
          </div>
          <h1>
            Revolutionize Book Digitization with
            <span className="brand">iBookTrack</span>
          </h1>
          <p>
            A unified Warehouse Management System and Digitization OS. Database-driven control to eliminate
            errors, track every book, and manage your entire pipeline — from intake to final delivery.
          </p>
          <div className="hero-cta-row">
            <PrimaryButton label="Get Started Free" href="/register" />
            <a href="#about" className="hero-secondary-link" onClick={handleScrollToAbout}>
              See how it works <span aria-hidden>→</span>
            </a>
          </div>
          <div className="hero-trust">
            <div className="hero-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
              </svg>
              Zero-error validation
            </div>
            <div className="hero-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Real-time pipeline tracking
            </div>
            <div className="hero-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Live BI dashboard
            </div>
          </div>
        </div>
        <IllustrationHero />
      </div>
    </section>
  );
};
