import React, { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/Components/Icon";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".lp-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Nav() {
  return (
    <nav className="lp-nav">
      <Link
        href={"/"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
        }}
      >
        <div className="fx-centered fx-start-h fx-gap-h fit-container box-pad-v-s">
          <Icon
            name="yakihonne-logo"
            width={100}
            height={64}
            className="pointer"
          />
          <div className="round-corner border-all box-pad-h-xs p-primary-c">
            pro
          </div>
        </div>
      </Link>
      <div className="lp-nav-links">
        <Link href="/home" className="lp-nav-link">
          Home
        </Link>
        <a href="#plans" className="lp-nav-link">
          Plans
        </a>
        <a href="#compare" className="lp-nav-link">
          Compare
        </a>
        <a href="#faq" className="lp-nav-link">
          FAQ
        </a>
      </div>
      <div className="lp-nav-actions">
        <Link href="/" className="lp-btn lp-btn-outline lp-btn-sm">
          Sign in
        </Link>
        <Link href="/" className="lp-btn lp-btn-primary lp-btn-sm">
          Get started
        </Link>
      </div>
    </nav>
  );
}

const PLANS = [
  {
    id: "creator",
    name: "Creator",
    price: "9",
    sats: "18,000",
    period: "/ month",
    desc: "For writers who want to publish, monetize, and understand their audience.",
    cta: "Get Creator",
    highlighted: false,
    features: [
      { text: "Unlimited articles & notes publishing", dim: false },
      { text: "Nostr-native identity (npub / nsec)", dim: false },
      { text: "Premium content gating (NIP-63)", dim: false },
      { text: "Subscriber management", dim: false },
      { text: "Lightning paywall — no commission", dim: false },
      { text: "Creator Analytics — up to 3 months", dim: false },
      { text: "50 GB Blossom media storage", dim: false },
      { text: "AI Writing Assistant", dim: true },
      { text: "Second Reader AI (5 personas)", dim: true },
      { text: "Energy Mapper", dim: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "19",
    sats: "38,000",
    period: "/ month",
    desc: "For serious creators who want AI in their corner and the full analytics picture.",
    cta: "Get Pro",
    highlighted: true,
    badge: "Most popular",
    features: [
      { text: "Everything in Creator", dim: false },
      { text: "AI Writing Assistant — unlimited", dim: false },
      { text: "Second Reader AI (all 5 personas)", dim: false },
      { text: "Energy Mapper — per-sentence emotion graph", dim: false },
      { text: "Inline diff viewer — accept / reject changes", dim: false },
      { text: "Analytics — up to 3 years of history", dim: false },
      { text: "Click-through bar drill-down per note/article", dim: false },
      { text: "100 GB Blossom media storage", dim: false },
      { text: "Early access to new features", dim: false },
    ],
  },
];

const COMPARE_ROWS = [
  { label: "Articles & Notes publishing", creator: true, pro: true },
  { label: "Nostr-native identity", creator: true, pro: true },
  { label: "Premium content gating", creator: true, pro: true },
  { label: "Subscriber management", creator: true, pro: true },
  { label: "Lightning paywall", creator: true, pro: true },
  { label: "Blossom media storage", creator: "50 GB", pro: "100 GB" },
  { label: "Creator Analytics history", creator: "3 months", pro: "3 years" },
  { label: "Drill-down bar click (note/article)", creator: false, pro: true },
  { label: "AI Writing Assistant", creator: false, pro: "Unlimited" },
  { label: "Second Reader AI", creator: false, pro: "5 personas" },
  { label: "Energy Mapper (note emotion graph)", creator: false, pro: true },
  { label: "Inline diff — accept / reject", creator: false, pro: true },
];

const FAQ_ITEMS = [
  {
    q: "Do I need a Nostr account?",
    a: "Yes — your keypair (npub / nsec) is your identity on YakiPro. You can generate one in-app or import an existing one. Your private key is never stored on our servers.",
  },
  {
    q: "How do Lightning payments work?",
    a: "Premium content is gated via NIP-63. Your subscribers pay you directly via Lightning invoice — we never touch the funds. You keep 100% of every sat.",
  },
  {
    q: "What is Blossom storage?",
    a: "Blossom is a Nostr-native media hosting protocol. YakiPro gives you a dedicated Blossom server for images and files used in your articles — 50 GB on Creator, 100 GB on Pro.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes, upgrade or downgrade at any time. Your published content, subscriber list, and analytics history are always yours regardless of plan.",
  },
  {
    q: "Is my content portable?",
    a: "Completely. Every article is a signed Nostr event on relays you control. You can read and republish your content with any Nostr-compatible client — YakiPro is just one window.",
  },
  {
    q: "Can I pay in Bitcoin?",
    a: "Yes. Pay via Lightning and get a 10% discount on any plan. Invoices are generated instantly — no custodial wallets required.",
  },
];

function CellValue({ value }) {
  if (value === true)
    return (
      <span style={{ color: "#2FBF71", fontWeight: 900, fontSize: "1rem" }}>
        ✓
      </span>
    );
  if (value === false)
    return (
      <span style={{ color: "rgba(139,148,158,0.3)", fontSize: "0.9rem" }}>
        –
      </span>
    );
  return (
    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8b9cf4" }}>
      {value}
    </span>
  );
}

export default function LandingPricing() {
  useReveal();
  const [openFaq, setOpenFaq] = useState(null);
  const [isLn, setIsLn] = useState(false);

  return (
    <div className="lp-root">
      <Nav />

      {/* ══ Hero ══════════════════════════════════════════════════════════════ */}
      <section className="lp-pricing-hero">
        {/* Animated glow */}
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 320,
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(247,88,22,0.16) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <span
            className="lp-pill"
            style={{ display: "inline-flex", marginBottom: 20 }}
          >
            ⚡ Pay in fiat or sats · 10% off with Lightning
          </span>
          <h1
            style={{
              color: "#E6EDF3",
              fontSize: "clamp(2.2rem, 6vw, 4rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              margin: "12px 0 16px",
              lineHeight: 1.08,
            }}
          >
            Simple, honest pricing.
          </h1>
          <p
            style={{
              color: "#8B949E",
              fontSize: "1.1rem",
              margin: 0,
              maxWidth: 480,
              marginInline: "auto",
            }}
          >
            No algorithms. No ads. No commission on your earnings. Pay for what
            you need.
          </p>
        </div>
      </section>

      {/* ══ Plans ═════════════════════════════════════════════════════════════ */}
      <section
        id="plans"
        className="lp-section"
        style={{ background: "#0D1117" }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 440,
            height: 440,
            background:
              "radial-gradient(ellipse at center, rgba(247,88,22,0.09) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="lp-section-inner">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 40,
            }}
          >
            <div className="lp-pricing-toggle">
              <button
                className={`lp-pricing-toggle-btn${!isLn ? " active" : ""}`}
                onClick={() => setIsLn(false)}
              >
                $ USD
              </button>
              <button
                className={`lp-pricing-toggle-btn${isLn ? " active" : ""}`}
                onClick={() => setIsLn(true)}
              >
                ⚡ Sats
              </button>
            </div>
          </div>

          <div className="lp-pricing-cards lp-reveal">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`lp-plan-card${plan.highlighted ? " lp-plan-card-pro" : ""}`}
              >
                {plan.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: plan.highlighted ? 18 : 16,
                      right: 20,
                    }}
                  >
                    <span className="lp-plan-badge">{plan.badge}</span>
                  </div>
                )}

                <div>
                  <div className="lp-plan-name">{plan.name}</div>
                  <div className="lp-plan-price-row">
                    {isLn ? (
                      <>
                        <span
                          className="lp-plan-amount"
                          style={{ fontSize: "2.2rem" }}
                        >
                          {plan.sats}
                        </span>
                        <span className="lp-plan-period">
                          {" "}
                          sats{plan.period}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="lp-plan-amount">${plan.price}</span>
                        <span className="lp-plan-period">{plan.period}</span>
                      </>
                    )}
                  </div>
                  <div className="lp-plan-sats">
                    <span>⚡</span>
                    {isLn ? (
                      <span>~${plan.price} / month</span>
                    ) : (
                      <span>~{plan.sats} sats / month</span>
                    )}
                    {!isLn && (
                      <span
                        style={{
                          color: "rgba(139,148,158,0.4)",
                          fontSize: "0.68rem",
                          fontWeight: 400,
                        }}
                      >
                        · 10% off with Lightning
                      </span>
                    )}
                  </div>
                  <p className="lp-plan-desc">{plan.desc}</p>
                </div>

                <div className="lp-plan-divider" />

                <ul className="lp-plan-features">
                  {plan.features.map((f) => (
                    <li
                      key={f.text}
                      className={`lp-plan-feature${f.dim ? " lp-plan-feature-dim" : ""}`}
                    >
                      <span className="lp-plan-feature-icon">
                        {f.dim ? "–" : "✓"}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`lp-btn lp-btn-lg${plan.highlighted ? " lp-btn-primary" : " lp-btn-outline"}`}
                  style={{ width: "100%", borderRadius: 8 }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div
            className="lp-reveal lp-reveal-delay-1"
            style={{
              maxWidth: 860,
              margin: "28px auto 0",
              padding: "16px 22px",
              borderRadius: 10,
              background: "rgba(247,88,22,0.06)",
              border: "1px solid rgba(247,88,22,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>⚡</span>
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "rgba(139,148,158,0.85)",
                lineHeight: 1.55,
              }}
            >
              {isLn ? (
                "⚡ Sats prices already include a 10% Lightning discount."
              ) : (
                <>
                  <strong style={{ color: "#E6EDF3" }}>
                    Pay with Bitcoin Lightning
                  </strong>{" "}
                  and get a 10% discount on any plan. Invoices are generated
                  instantly — no custodial wallets, no KYC.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="lp-divider-line" />

      {/* ══ Compare table ═════════════════════════════════════════════════════ */}
      <section
        id="compare"
        className="lp-section"
        style={{ background: "#0D1117" }}
      >
        <div className="lp-section-inner">
          <div
            className="lp-reveal"
            style={{ textAlign: "center", marginBottom: 40 }}
          >
            <span className="lp-section-label">Compare plans</span>
            <h2 className="lp-section-title" style={{ color: "#E6EDF3" }}>
              Everything side by side
            </h2>
          </div>

          <div className="lp-compare-table lp-reveal lp-reveal-delay-1">
            {/* Header */}
            <div className="lp-compare-row header">
              <div className="lp-compare-cell header-cell">Feature</div>
              <div className="lp-compare-cell center header-cell">Creator</div>
              <div
                className="lp-compare-cell center header-cell"
                style={{ color: "#F75816" }}
              >
                Pro
              </div>
            </div>
            {COMPARE_ROWS.map((row, i) => (
              <div key={row.label} className="lp-compare-row">
                <div className="lp-compare-cell">{row.label}</div>
                <div className="lp-compare-cell center">
                  <CellValue value={row.creator} />
                </div>
                <div className="lp-compare-cell center">
                  <CellValue value={row.pro} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="lp-divider-line" />

      {/* ══ FAQ ═══════════════════════════════════════════════════════════════ */}
      <section
        id="faq"
        className="lp-section"
        style={{ background: "#0D1117" }}
      >
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 400,
            height: 400,
            background:
              "radial-gradient(ellipse at center, rgba(105,123,216,0.09) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="lp-section-inner">
          <div
            className="lp-reveal"
            style={{ textAlign: "center", marginBottom: 40 }}
          >
            <span className="lp-section-label">FAQ</span>
            <h2 className="lp-section-title" style={{ color: "#E6EDF3" }}>
              Common questions
            </h2>
          </div>

          <div className="lp-faq lp-reveal lp-reveal-delay-1">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="lp-faq-item"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="lp-faq-trigger">
                  <p className="lp-faq-q">{item.q}</p>
                  <span
                    className={`lp-faq-icon${openFaq === i ? " open" : ""}`}
                  >
                    +
                  </span>
                </div>
                {openFaq === i && <p className="lp-faq-a">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Footer CTA ════════════════════════════════════════════════════════ */}
      <section className="lp-footer-cta">
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 700,
            height: 350,
            background:
              "radial-gradient(ellipse at center, rgba(247,88,22,0.14) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div className="lp-footer-cta-inner">
          <h2
            className="lp-reveal"
            style={{
              color: "#E6EDF3",
              fontSize: "clamp(2rem,5vw,3rem)",
              margin: 0,
              letterSpacing: "-0.03em",
              fontWeight: 900,
            }}
          >
            Start owning
            <br />
            your writing today.
          </h2>
          <p
            className="lp-reveal lp-reveal-delay-1"
            style={{ color: "rgba(139,148,158,0.8)", margin: 0 }}
          >
            Choose a plan and publish your first article on Nostr in minutes.
          </p>
          <div
            className="lp-reveal lp-reveal-delay-2"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link href="/" className="lp-btn lp-btn-primary lp-btn-lg">
              Get started
            </Link>
            <Link href="/home" className="lp-btn lp-btn-outline lp-btn-lg">
              Learn more
            </Link>
          </div>
          <div className="lp-footer-links lp-reveal lp-reveal-delay-3">
            <Link href="/home" className="lp-footer-link">
              Home
            </Link>
            <a href="#" className="lp-footer-link">
              GitHub
            </a>
            <a href="#" className="lp-footer-link">
              Nostr
            </a>
            <a href="#" className="lp-footer-link">
              ⚡ Support
            </a>
          </div>
        </div>
      </section>

      <footer className="lp-footer-nav">
        <div className="lp-footer-nav-inner">
          <span className="lp-footer-copy">
            © {new Date().getFullYear()} YakiPro. Built on Nostr.
          </span>
          <div className="lp-footer-nav-links">
            <Link href="/home" className="lp-footer-link">
              Home
            </Link>
            <Link href="/pricing" className="lp-footer-link">
              Pricing
            </Link>
            <a href="#" className="lp-footer-link">
              Privacy
            </a>
            <a href="#" className="lp-footer-link">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
