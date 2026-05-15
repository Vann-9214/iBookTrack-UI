import React from "react";
import { IllustrationTeam } from "./Illustrations";

export const AdvantageSection = () => (
  <section className="advantage" id="about">
    <div className="container">
      <IllustrationTeam />
      <div>
        <h2>The iBookTrack Advantage: Scalable Control for High-Volume Digitization</h2>
        <p>
          Managing many lots simultaneously requires more than just spreadsheets. iBookTrack unifies your physical
          warehouse workflow with real-time digital tracking, ensuring every Mustang and Jaguar volume is accounted for
          from intake gate to final client transmission.
        </p>
        <p>
          Live station-level visibility helps your team spot delays early, route workloads faster, and keep quality
          standards consistent even during peak production weeks.
        </p>
      </div>
    </div>
  </section>
);
