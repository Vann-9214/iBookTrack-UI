'use client';
import React, { useState } from "react";
import { COMPANY_LINKS, SUPPORT_LINKS } from "../data";
import type { SupportItem } from "../data";
import { BrandLogo } from "./BrandLogo";
import { CompanyFooterLinks, SupportFooterLinks } from "./FooterLinks";

export const FooterSection = () => {
  const [modal, setModal] = useState<SupportItem | null>(null);

  return (
    <>
      <footer>
        <div className="footer-wrap">
          <div className="footer-brand">
            <BrandLogo compact />
            <p>
              Intelligent book digitization and warehouse management for modern production teams.
            </p>
          </div>

          <CompanyFooterLinks title="Company" links={COMPANY_LINKS} />
          <SupportFooterLinks title="Support" links={SUPPORT_LINKS} onOpen={setModal} />
        </div>
        <div className="footer-bottom">
          <span>© 2026 Innodata Knowledge Inc. All rights reserved.</span>
        </div>
      </footer>

      {/* Support info modal */}
      {modal && (
        <div className="footer-modal-overlay" role="dialog" aria-modal="true" aria-label={modal.content.heading}>
          <div className="footer-modal">
            <div className="footer-modal-header">
              <h3>{modal.content.heading}</h3>
              <button
                className="footer-modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setModal(null)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p className="footer-modal-body">{modal.content.body}</p>
            <button
              className="footer-modal-dismiss"
              type="button"
              onClick={() => setModal(null)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
