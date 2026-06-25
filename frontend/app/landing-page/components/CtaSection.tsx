import React from "react";
import Link from "next/link";
import { PrimaryButton } from "./PrimaryButton";

export const CtaSection = () => (
  <section className="cta" id="download">
    <div className="container">
      <span className="section-eyebrow" style={{ color: "#93c5fd", justifyContent: "center" }}>
        Get started today
      </span>
      <h2>
        Your pipeline, <span className="underline">under control</span>
      </h2>
      <p>
        Stop losing books to spreadsheet chaos. iBookTrack gives your team a single source of truth — from intake
        gate to final client transmission, every step is tracked, verified, and accountable.
      </p>
      <div className="cta-actions">
        <PrimaryButton label="Create Free Account" href="/register" />
        <Link href="/landing-page/download" className="cta-ghost-link">
          Download the app <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  </section>
);
