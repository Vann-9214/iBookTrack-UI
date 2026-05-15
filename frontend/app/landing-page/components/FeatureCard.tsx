import React from "react";
import type { Feature } from "../data";

export const FeatureCard = ({ icon, title, description }: Feature) => (
  <article className="feature-card">
    <div className="feature-icon" aria-hidden>
      {icon}
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
  </article>
);
