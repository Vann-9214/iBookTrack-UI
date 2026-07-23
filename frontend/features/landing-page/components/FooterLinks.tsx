"use client";

import React from "react";
import type { LinkItem, SupportItem } from "../data";
import { useSmoothScroll } from "./SmoothScrollProvider";

/* ── Company links: smooth-scroll to section ── */
type CompanyLinksProps = {
  title: string;
  links: LinkItem[];
};

export const CompanyFooterLinks = ({ title, links }: CompanyLinksProps) => {
  const { scrollTo } = useSmoothScroll();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, scrollTo_: string | undefined) => {
    if (!scrollTo_) return; // no section to scroll to — let it navigate normally
    const target = document.getElementById(scrollTo_);
    if (target) {
      e.preventDefault();
      scrollTo(target);
      history.pushState(null, "", `#${scrollTo_}`);
    }
  };

  return (
    <div className="footer-col">
      <h4>{title}</h4>
      <ul>
        {links.map((item) => (
          <li key={item.label}>
            <a href={item.href} onClick={(e) => handleClick(e, item.scrollTo)}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ── Support links: open info modal ── */
type SupportLinksProps = {
  title: string;
  links: SupportItem[];
  onOpen: (item: SupportItem) => void;
};

export const SupportFooterLinks = ({ title, links, onOpen }: SupportLinksProps) => (
  <div className="footer-col">
    <h4>{title}</h4>
    <ul>
      {links.map((item) => (
        <li key={item.label}>
          <button
            type="button"
            className="footer-modal-btn"
            onClick={() => onOpen(item)}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

/* Keep original export for any other usages */
export const FooterLinks = CompanyFooterLinks;
