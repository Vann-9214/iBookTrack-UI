import React from "react";

const POSTS = [
  {
    tag: "Workflow",
    date: "June 2026",
    title: "How iBookTrack Eliminates ISBN Mismatch at Intake",
    excerpt:
      "Duplicate ISBNs and manifest mismatches cost production teams hours every week. Here's how our validation layer catches errors before they reach the cutting station.",
  },
  {
    tag: "Engineering",
    date: "May 2026",
    title: "Building a Real-Time Pipeline Dashboard with Live BI",
    excerpt:
      "A behind-the-scenes look at how we built the live station-level visibility dashboard that lets supervisors spot bottlenecks the moment they happen.",
  },
  {
    tag: "Quality",
    date: "April 2026",
    title: "Zero-Error Transmission: Our Simflex Hash-Check Approach",
    excerpt:
      "Bit errors during delivery are silent killers for digital archives. We break down the hash-check monitor that guarantees every file arrives intact.",
  },
];

export const BlogSection = () => (
  <section className="blog" id="blog">
    <div className="container">
      <div className="blog-header">
        <span className="section-eyebrow blog-eyebrow">From the team</span>
        <h2 className="section-title">Latest from iBookTrack</h2>
        <p className="section-subtitle">
          Insights, engineering deep-dives, and workflow tips from the team building the future of book digitization.
        </p>
      </div>
      <div className="blog-grid">
        {POSTS.map((post) => (
          <article key={post.title} className="blog-card">
            <div className="blog-card-meta">
              <span className="blog-tag">{post.tag}</span>
              <span className="blog-date">{post.date}</span>
            </div>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
