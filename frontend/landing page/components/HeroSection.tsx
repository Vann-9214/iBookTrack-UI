import React from "react";
import { IllustrationHero } from "./Illustrations";
import { PrimaryButton } from "./PrimaryButton";

export const HeroSection = () => (
  <section className="hero">
    <div className="container">
      <div>
        <h1>
          Revolution Book Digitization Using
          <span className="brand">iBookTrack</span>
        </h1>
        <p>
          A unified Warehouse Management System and Digitization OS. Scalable, database-driven control to eliminate
          errors and manage your steps pipeline.
        </p>
        <PrimaryButton label="Register" />
      </div>
      <IllustrationHero />
    </div>
  </section>
);
