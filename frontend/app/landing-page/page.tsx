'use client';
import React from "react";
import "./landing_page.css";
import { AdvantageSection, CtaSection, FeaturesSection, FooterSection, HeaderSection, HeroSection, SmoothScrollProvider } from "./components";

export default function LandingPage() {
	return (
		<SmoothScrollProvider header={<HeaderSection />}>
			<div className="landing-page">
				<main>
					<HeroSection />
					<FeaturesSection />
					<AdvantageSection />
					<CtaSection />
				</main>
				<FooterSection />
			</div>
		</SmoothScrollProvider>
	);
}
