import React from "react";
import { COMPANY_LINKS, SUPPORT_LINKS } from "../data";
import { BrandLogo } from "./BrandLogo";
import { FooterLinks } from "./FooterLinks";

export const FooterSection = () => (
  <footer>
    <div className="footer-wrap">
      <div className="footer-brand">
        <BrandLogo />
        <p>
          Copyright (c) 2026 Innodata Knowledges Inc.
          <br />
          All rights reserved
        </p>
      </div>

      <FooterLinks title="Company" links={COMPANY_LINKS} />
      <FooterLinks title="Support" links={SUPPORT_LINKS} />

      <div className="footer-col" id="login">
        <h4>Stay up to date</h4>
        <form className="subscribe" onSubmit={(event) => event.preventDefault()}>
          <input type="email" placeholder="Your email address" aria-label="Your email address" />
          <button type="submit" aria-label="Submit email">
            {"->"}
          </button>
        </form>
      </div>
    </div>
  </footer>
);
