import React from "react";
import { FEATURE_CARDS } from "../data";
import { FeatureCard } from "./FeatureCard";

export const FeaturesSection = () => (
  <section className="features" id="about">
    <div className="container">
      <span className="section-eyebrow">Core Features</span>
      <h2 className="section-title">The Key to a Zero-Error Digitization Pipeline</h2>
      <p className="section-subtitle">
        Every stage of your warehouse flow, tracked and validated in real time — so nothing slips through the cracks.
      </p>
      <div className="feature-grid">
        {FEATURE_CARDS.map((card) => (
          <FeatureCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  </section>
);
