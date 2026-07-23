import React from "react";
import Image from "next/image";

export const IllustrationHero = () => (
  <Image
    src="/images/hero-illustration.svg"
    alt="Analytics and worker illustration"
    className="hero-illustration"
    width={460}
    height={400}
    priority
  />
);

export const IllustrationTeam = () => (
  <Image
    src="/images/team-illustration.svg"
    alt="Team collaboration illustration"
    className="team-illustration"
    width={460}
    height={400}
  />
);
