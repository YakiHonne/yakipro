import React, { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/Components/Icon";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
          {t("ALPg051")}
        </Link>
        <a href="#plans" className="lp-nav-link">
          {t("APrc003")}
        </a>
        <a href="#compare" className="lp-nav-link">
          {t("APrc004")}
        </a>
        <a href="#faq" className="lp-nav-link">
          {t("APrc005")}
        </a>
      </div>
      <div className="lp-nav-actions">
        <Link href="/login" className="lp-btn lp-btn-outline lp-btn-sm">
          {t("ALPg010")}
        </Link>
        <Link href="/login" className="lp-btn lp-btn-primary lp-btn-sm">
          {t("APrc006")}
        </Link>
      </div>
    </nav>
  );
}

function usePlans(t) {
  return [
    {
      id: "creator",
      name: t("APrc009"),
      price: "9",
      sats: "18,000",
      period: ` / ${t("APrc031")}`,
      desc: t("APrc010"),
      cta: t("APrc011"),
      highlighted: false,
      features: [
        { text: t("APrc012"), dim: false },
        { text: t("APrc013"), dim: false },
        { text: t("APrc014"), dim: false },
        { text: t("APrc015"), dim: false },
        { text: t("APrc016"), dim: false },
        { text: t("APrc017"), dim: false },
        { text: t("APrc018"), dim: false },
        { text: t("APrc056"), dim: false },
        { text: t("ALPg021"), dim: true },
        { text: t("ALPg028"), dim: true },
        { text: t("ALPg035"), dim: true },
      ],
    },
    {
      id: "pro",
      name: t("APrc019"),
      price: "19",
      sats: "38,000",
      period: ` / ${t("APrc055")}`,
      desc: t("APrc020"),
      cta: t("APrc021"),
      highlighted: true,
      features: [
        { text: t("APrc022"), dim: false },
        { text: t("APrc023"), dim: false },
        { text: t("APrc024"), dim: false },
        { text: t("APrc025"), dim: false },
        { text: t("APrc026"), dim: false },
        { text: t("APrc027"), dim: false },
        { text: t("APrc028"), dim: false },
        { text: t("APrc029"), dim: false },
        { text: t("APrc030"), dim: false },
      ],
    },
  ];
}

function useCompareRows(t) {
  return [
    { label: t("APrc035"), creator: true, pro: true },
    { label: t("APrc036"), creator: true, pro: true },
    { label: t("APrc037"), creator: true, pro: true },
    { label: t("APrc015"), creator: true, pro: true },
    { label: t("APrc016"), creator: true, pro: true },
    { label: t("APrc038"), creator: "50 GB", pro: "100 GB" },
    { label: t("APrc039"), creator: "3 months", pro: "3 years" },
    { label: t("APrc040"), creator: false, pro: true },
    { label: t("ALPg021"), creator: false, pro: "Unlimited" },
    { label: t("APrc041"), creator: false, pro: "5 personas" },
    { label: t("APrc042"), creator: false, pro: true },
    { label: t("APrc043"), creator: false, pro: true },
  ];
}

function useFaqItems(t) {
  return [
    { q: t("APrc045"), a: t("APrc046") },
    { q: t("APrc047"), a: t("APrc048") },
    { q: t("APrc049"), a: t("APrc050") },
    { q: t("APrc051"), a: t("APrc052") },
    { q: t("APrc053"), a: t("APrc054") },
  ];
}

function CellValue({ value }) {
  if (value === true)
    return <span className="lp-compare-yes">Yes</span>;
  if (value === false)
    return <span className="lp-compare-no">–</span>;
  return <span className="lp-compare-value">{value}</span>;
}

export default function LandingPricing() {
  useReveal();
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(null);
  const [isLn, setIsLn] = useState(false);

  const PLANS = usePlans(t);
  const COMPARE_ROWS = useCompareRows(t);
  const FAQ_ITEMS = useFaqItems(t);

  return (
    <div className="lp-root">
      <Nav />

      {/* ══ Hero ══════════════════════════════════════════════════════════════ */}
      <section className="lp-pricing-hero">
        <h1 className="lp-pricing-hero-title">{t("APrc001")}</h1>
        <p className="lp-pricing-hero-sub">{t("APrc002")}</p>
      </section>

      {/* ══ Plans ═════════════════════════════════════════════════════════════ */}
      <section id="plans" className="lp-section">
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
                {t("APrc007")}
              </button>
              <button
                className={`lp-pricing-toggle-btn${isLn ? " active" : ""}`}
                onClick={() => setIsLn(true)}
              >
                {t("APrc008")}
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
                  <p className="lp-plan-desc">{plan.desc}</p>
                </div>

                <div className="lp-plan-divider" />

                <ul className="lp-plan-features">
                  {plan.features.map((f) => (
                    <li
                      key={f.text}
                      className={`lp-plan-feature${f.dim ? " lp-plan-feature-dim" : ""}`}
                    >
                      {f.dim ? (
                        <span className="lp-plan-feature-dash">–</span>
                      ) : (
                        <Icon
                          name="check"
                          v={2}
                          size={14}
                          className="lp-plan-feature-check"
                        />
                      )}
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`lp-btn lp-btn-lg${plan.highlighted ? " lp-btn-primary" : " lp-btn-outline"}`}
                  style={{ width: "100%" }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="lp-divider-line" />

      {/* ══ Compare table ═════════════════════════════════════════════════════ */}
      <section id="compare" className="lp-section">
        <div className="lp-section-inner">
          <div
            className="lp-reveal"
            style={{ textAlign: "center", marginBottom: 40 }}
          >
            <span className="lp-section-label">{t("APrc004")}</span>
            <h2 className="lp-section-title">{t("APrc033")}</h2>
          </div>

          <div className="lp-compare-table lp-reveal lp-reveal-delay-1">
            <div className="lp-compare-row header">
              <div className="lp-compare-cell header-cell">{t("APrc034")}</div>
              <div className="lp-compare-cell center header-cell">
                {t("APrc009")}
              </div>
              <div
                className="lp-compare-cell center header-cell lp-compare-cell-pro"
              >
                {t("APrc019")}
              </div>
            </div>
            {COMPARE_ROWS.map((row) => (
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
      <section id="faq" className="lp-section">
        <div className="lp-section-inner">
          <div
            className="lp-reveal"
            style={{ textAlign: "center", marginBottom: 40 }}
          >
            <span className="lp-section-label">{t("APrc005")}</span>
            <h2 className="lp-section-title">{t("APrc044")}</h2>
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

      <footer className="lp-footer-nav">
        <div className="lp-footer-nav-inner">
          <span className="lp-footer-copy">
            © {new Date().getFullYear()} YakiPro.
          </span>
          <div className="lp-footer-nav-links">
            <Link href="/home" className="lp-footer-link">
              {t("ALPg051")}
            </Link>
            <Link href="/pricing" className="lp-footer-link">
              {t("ALog013")}
            </Link>
            <a href="#" className="lp-footer-link">
              {t("ALPg052")}
            </a>
            <a href="#" className="lp-footer-link">
              {t("ALPg053")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
