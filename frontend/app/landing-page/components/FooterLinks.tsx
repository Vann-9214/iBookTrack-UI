import React from "react";
import type { LinkItem } from "../data";

type FooterLinksProps = {
  title: string;
  links: LinkItem[];
};

export const FooterLinks = ({ title, links }: FooterLinksProps) => (
  <div className="footer-col">
    <h4>{title}</h4>
    <ul>
      {links.map((item) => (
        <li key={item.label}>
          <a href={item.href}>{item.label}</a>
        </li>
      ))}
    </ul>
  </div>
);
