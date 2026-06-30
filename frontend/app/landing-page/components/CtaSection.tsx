import React from "react";
import { PrimaryButton } from "./PrimaryButton";

export const CtaSection = () => (
  <section className="cta" id="download">
    <div className="container">
      <span className="section-eyebrow cta-eyebrow">
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
      </div>
    </div>
  </section>
);
