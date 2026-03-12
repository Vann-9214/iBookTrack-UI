import "../landing_page.css";
import { HeaderSection, FooterSection, PrimaryButton } from "../components";

const platforms = [
  {
    title: "Windows",
    description: "For desktop workstations in production and QA stations.",
    href: "/download/windows",
    buttonLabel: "Download for Windows",
  },
  {
    title: "Android",
    description: "For handheld scanners and mobile warehouse checks.",
    href: "/download/android",
    buttonLabel: "Download for Android",
  },
];

export default function DownloadPage() {
  return (
    <div className="download-page">
      <HeaderSection />

      <main className="download-main">
        <section>
          <div className="container">
            <div className="download-intro">
              <h1>Get iBookTrack</h1>
              <p>
                Choose the installer that matches your device and deploy it across your digitization workflow.
              </p>
            </div>

            <div className="download-grid">
              {platforms.map((platform) => (
                <article key={platform.title} className="download-card">
                  <h3>{platform.title}</h3>
                  <p>{platform.description}</p>
                  <PrimaryButton label={platform.buttonLabel} href={platform.href} />
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}