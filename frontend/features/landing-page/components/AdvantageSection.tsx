import React from "react";
import { IllustrationTeam } from "./Illustrations";

export const AdvantageSection = () => (
  <section className="advantage" id="about">
    <div className="container">
      <IllustrationTeam />
      <div className="advantage-text">
        <span className="section-eyebrow">Why iBookTrack</span>
        <h2>Scalable Control for High-Volume Digitization</h2>
        <p>
          Managing many lots simultaneously requires more than just spreadsheets. iBookTrack unifies your physical
          warehouse workflow with real-time digital tracking, ensuring every volume is accounted for
          from intake gate to final client transmission.
        </p>
        <p>
          Live station-level visibility helps your team spot delays early, route workloads faster, and keep quality
          standards consistent even during peak production weeks.
        </p>
        <div className="advantage-stats">
          <div className="advantage-stat">
            <strong>6+</strong>
            <span>Pipeline Steps Tracked</span>
          </div>
          <div className="advantage-stat">
            <strong>0</strong>
            <span>Manual Excel Logs</span>
          </div>
          <div className="advantage-stat">
            <strong>100%</strong>
            <span>Chain of Custody</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);
