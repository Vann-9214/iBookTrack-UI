'use client';
import React from "react";
import "./landing_page.css";
import { AdvantageSection, CtaSection, FeaturesSection, FooterSection, HeaderSection, HeroSection } from "./components";

export default function LandingPage() {
	return (
		<div className="landing-page">
			<HeaderSection />

			<main>
				<HeroSection />
				<FeaturesSection />
				<AdvantageSection />
				<CtaSection />
			</main>

			<FooterSection />
		</div>
	);
}
