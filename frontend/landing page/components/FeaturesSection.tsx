import React from "react";
import { FEATURE_CARDS } from "../data";
import { FeatureCard } from "./FeatureCard";

export const FeaturesSection = () => (
  <section className="features" id="about">
    <div className="container">
      <h2 className="section-title">The Key to a Zero-Error Digitization Pipeline</h2>
      <div className="feature-grid">
        {FEATURE_CARDS.map((card) => (
          <FeatureCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  </section>
);
