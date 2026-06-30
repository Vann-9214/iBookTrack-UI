"use client";

import React, { useState } from "react";

export const ContactSection = () => {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    /* Placeholder — wire to a real endpoint when ready */
    setSent(true);
  };

  return (
    <section className="contact" id="contact">
      <div className="container">
        <div className="contact-inner">

          {/* Left — info */}
          <div className="contact-info">
            <span className="section-eyebrow contact-eyebrow">Get in touch</span>
            <h2>We'd love to hear from you</h2>
            <p>
              Have a question about iBookTrack, need a demo, or want to discuss a custom deployment?
              Reach out and our team will get back to you within one business day.
            </p>

            <div className="contact-details">
              <div className="contact-detail-item">
                <div className="contact-detail-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <span className="contact-detail-label">Email</span>
                  <span className="contact-detail-value">support@innodata.com</span>
                </div>
              </div>
              <div className="contact-detail-item">
                <div className="contact-detail-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div>
                  <span className="contact-detail-label">Support hours</span>
                  <span className="contact-detail-value">Mon–Fri, 8 AM–6 PM PHT</span>
                </div>
              </div>
              <div className="contact-detail-item">
                <div className="contact-detail-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <span className="contact-detail-label">Office</span>
                  <span className="contact-detail-value">Innodata Knowledge Inc., Philippines</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="contact-form-wrap">
            {sent ? (
              <div className="contact-success">
                <div className="contact-success-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h3>Message sent!</h3>
                <p>Thanks for reaching out. We'll get back to you within one business day.</p>
                <button
                  type="button"
                  className="button"
                  onClick={() => { setSent(false); setForm({ name: "", email: "", message: "" }); }}
                >
                  Send another
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit} noValidate>
                <div className="contact-form-row">
                  <div className="contact-field">
                    <label htmlFor="contact-name">Full name</label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      placeholder="Juan dela Cruz"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="contact-field">
                    <label htmlFor="contact-email">Email address</label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      placeholder="juan@innodata.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="contact-field">
                  <label htmlFor="contact-message">Message</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    placeholder="Tell us how we can help…"
                    value={form.message}
                    onChange={handleChange}
                    required
                  />
                </div>
                <button type="submit" className="button contact-submit">
                  Send message
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};
