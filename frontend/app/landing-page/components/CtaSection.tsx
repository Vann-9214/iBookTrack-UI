import React from "react";
import { PrimaryButton } from "./PrimaryButton";

export const CtaSection = () => (
  <section className="cta" id="download">
    <div className="container">
      <h2>
        Your work, everywhere <span className="underline">you are</span>
      </h2>
      <p>
        Access your warehouse inventory system anywhere, anytime. Whether you are using your phone, laptop, tablet, or
        desktop, iBookTrack keeps your inventory data connected so you can monitor and manage operations from any
        device.
      </p>
      <PrimaryButton label="Download" />
    </div>
  </section>
);
