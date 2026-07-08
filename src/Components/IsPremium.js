import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/router";
import { logoutUser } from "@/Helpers/AccountInit";
import { getPlans, getSubscriptionLink } from "@/Endpoionts/payment";
import { setForcePaywall } from "@/Store/Slices/Subscription";
import { copyText } from "@/Helpers/Helpers";
import Spinner from "./Spinner";
import Button from "./UI/Button";
import Overlay from "./Overlay";
import QRCode from "react-qr-code";
import axios from "axios";
import useLightningPayment from "@/hooks/useLightningPayment";
import Icon from "./Icon";

const COMPARE_ROWS = [
  { label: "Articles & Notes publishing", creator: true, pro: true },
  { label: "Nostr-native identity", creator: true, pro: true },
  { label: "Premium content gating", creator: true, pro: true },
  { label: "Subscriber management", creator: true, pro: true },
  { label: "Lightning paywall", creator: true, pro: true },
  { label: "Blossom media storage", creator: "50 GB", pro: "100 GB" },
  { label: "Analytics history", creator: "3 months", pro: "3 years" },
  { label: "Drill-down bar click", creator: false, pro: true },
  { label: "AI Writing Assistant", creator: false, pro: "60/week" },
  { label: "Second Reader AI", creator: false, pro: "30/week" },
  { label: "Energy Mapper", creator: false, pro: "20/week" },
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
    a: "Yes. Pay via Lightning. Invoices are generated instantly — no custodial wallets required.",
  },
];

function CellValue({ value }) {
  if (value === true)
    return <Icon name="check" size={20} v={2} isBoldThemeColor />;
  if (value === false)
    return (
      <span style={{ color: "rgba(139,148,158,0.3)", fontSize: "0.9rem" }}>
        –
      </span>
    );
  return (
    <span
      style={{
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "var(--color-primary-accent)",
      }}
    >
      {value}
    </span>
  );
}

function useReveal(dep) {
  useEffect(() => {
    const els = document.querySelectorAll(".ip-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

function WaitingDots() {
  return (
    <span style={{ display: "inline-flex", gap: "5px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: "var(--color-primary-accent)",
            display: "inline-block",
            animation: "flash 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  );
}

function LightningInvoiceOverlay({
  invoice,
  planName,
  sats,
  onClose,
  userPub,
}) {
  const router = useRouter();
  const { status, data } = useLightningPayment(userPub);

  useEffect(() => {
    if (status !== "paid") return;
    const timer = setTimeout(() => {
      router.reload();
    }, 2000);
    return () => clearTimeout(timer);
  }, [status]);

  const expiryDate = data?.next_subscription
    ? new Date(data.next_subscription * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : null;

  if (status === "paid") {
    return (
      <Overlay exit={onClose} width={420}>
        <div
          className="fx-centered fx-col box-pad-h box-pad-v"
          style={{ rowGap: "20px", textAlign: "center" }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "var(--color-green-side)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              color: "var(--color-green-main)",
            }}
          >
            ✓
          </div>
          <div className="fx-centered fx-col" style={{ rowGap: "6px" }}>
            <h3 style={{ color: "var(--color-green-main)", margin: 0 }}>
              Payment confirmed!
            </h3>
            <p
              className="p-secondary-c"
              style={{ margin: 0, fontSize: "0.85rem" }}
            >
              {planName} plan activated
              {expiryDate && (
                <>
                  {" "}
                  · renews{" "}
                  <span
                    style={{
                      color: "var(--color-primary-text)",
                      fontWeight: 600,
                    }}
                  >
                    {expiryDate}
                  </span>
                </>
              )}
            </p>
          </div>
          <p
            className="p-secondary-c"
            style={{ fontSize: "0.78rem", margin: 0 }}
          >
            Reloading your session…
          </p>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay exit={onClose} width={420}>
      <div
        className="fx-centered fx-col box-pad-h box-pad-v"
        style={{ rowGap: "24px" }}
      >
        <div
          className="fx-centered fx-col fit-container"
          style={{ rowGap: "6px", textAlign: "center" }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "var(--color-primary-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
            }}
          >
            ⚡
          </div>
          <h3 style={{ marginTop: "8px" }}>Pay with Lightning</h3>
          <p
            className="p-secondary-c"
            style={{ fontSize: "0.85rem", margin: 0 }}
          >
            {planName} plan &nbsp;·&nbsp;
            <span className="orange-c" style={{ fontWeight: 700 }}>
              {sats} sats
            </span>
          </p>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "16px",
            borderRadius: "16px",
            display: "flex",
            boxShadow: "0 4px 24px rgba(247,88,22,0.12)",
          }}
        >
          <QRCode value={invoice} size={220} />
        </div>

        <div
          className="fit-container fx-scattered round-corner border-all border-hover box-pad-h-m box-pad-v-s"
          style={{ cursor: "pointer", columnGap: "12px" }}
          onClick={() => copyText(invoice, "Invoice copied!")}
        >
          <p
            className="p-secondary-c"
            style={{
              fontSize: "0.72rem",
              fontFamily: "monospace",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              margin: 0,
            }}
          >
            {invoice.slice(0, 48)}…
          </p>
          <span
            className="orange-c"
            style={{ fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 }}
          >
            Copy
          </span>
        </div>

        <div
          className="fx-centered round-corner box-pad-h-m box-pad-v-s fit-container"
          style={{
            background: "var(--color-primary-light)",
            columnGap: "10px",
          }}
        >
          <WaitingDots />
          <p
            className="orange-c"
            style={{ fontSize: "0.82rem", fontWeight: 600, margin: 0 }}
          >
            Waiting for payment...
          </p>
        </div>

        {status === "error" && (
          <p
            className="p-secondary-c"
            style={{ fontSize: "0.78rem", margin: 0, textAlign: "center" }}
          >
            Connection lost. Please refresh if payment was sent.
          </p>
        )}

        <Button
          type="gray"
          size="m"
          label="Cancel"
          onClick={onClose}
          style={{ width: "100%" }}
        />
      </div>
    </Overlay>
  );
}

function PricingCards({ isLn, setIsLn, userPub }) {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lightningInvoice, setLightningInvoice] = useState(null);
  const [activePlan, setActivePlan] = useState(null);

  useEffect(() => {
    getPlans().then(setPlans);
  }, []);

  const generateLightningInvoice = async (plan) => {
    const lnAddr = process.env.NEXT_PUBLIC_YAKIPRO_LIGHTNING_ADDR;
    if (!lnAddr) return null;

    const [username, domain] = lnAddr.split("@");
    const lnurlpUrl = `https://${domain}/.well-known/lnurlp/${username}`;

    const lnurlRes = await axios.get(lnurlpUrl);
    const callback = lnurlRes.data.callback;

    const msats = plan.sats_price * 1000;
    const description = JSON.stringify({ plan: plan.id, pubkey: userPub });

    const invoiceRes = await axios.get(callback, {
      params: { amount: msats, comment: description },
    });

    return invoiceRes.data.pr;
  };

  const handleCheckout = async (product) => {
    setIsLoading(true);
    try {
      if (isLn) {
        const invoice = await generateLightningInvoice(product);
        if (invoice) {
          setActivePlan(product);
          setLightningInvoice(invoice);
        }
      } else {
        await getSubscriptionLink({ plan_id: product.id });
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };
  return (
    <section
      className="lp-section"
      style={{ background: "transparent", paddingTop: 0 }}
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
      <div className="lp-section-inner box-pad-v">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
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

        <div className="lp-pricing-cards ip-reveal">
          {plans.map((plan, idx) => {
            const isHighlighted = idx === plans.length - 1;
            return (
            <div
              key={plan.id}
              className={`lp-plan-card${isHighlighted ? " lp-plan-card-pro" : ""}`}
            >
              {isHighlighted && (
                <div
                  style={{
                    position: "absolute",
                    top: 18,
                    right: 20,
                  }}
                >
                  <span className="lp-plan-badge">Most popular</span>
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
                        {plan.sats_price?.toLocaleString()}
                      </span>
                      <span className="lp-plan-period"> sats / month</span>
                    </>
                  ) : (
                    <>
                      <span className="lp-plan-amount">${plan.usd_price}</span>
                      <span className="lp-plan-period"> / month</span>
                    </>
                  )}
                </div>
                <div className="lp-plan-sats">
                  <span>⚡</span>
                  {isLn ? (
                    <span>~${plan.usd_price} / month</span>
                  ) : (
                    <span>~{plan.sats_price?.toLocaleString()} sats / month</span>
                  )}
                </div>
              </div>
              <div className="lp-plan-divider" />
              <ul className="lp-plan-features">
                {(plan.perks || []).map((perk) => (
                  <li key={perk} className="lp-plan-feature">
                    <span className="lp-plan-feature-icon">
                      <Icon name="check" size={20} v={2} isBoldThemeColor />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
              <button
                className={`lp-btn lp-btn-lg${isHighlighted ? " lp-btn-primary" : " lp-btn-outline"}`}
                style={{ width: "100%", borderRadius: 8 }}
                disabled={isLoading}
                onClick={() => handleCheckout(plan)}
              >
                {isLoading ? <Spinner size={14} /> : `Get ${plan.name}`}
              </button>
            </div>
          );
          })}
        </div>

      </div>

      {lightningInvoice && activePlan && (
        <LightningInvoiceOverlay
          invoice={lightningInvoice}
          planName={activePlan.name}
          sats={activePlan.sats_price?.toLocaleString()}
          userPub={userPub}
          onClose={() => {
            setLightningInvoice(null);
            setActivePlan(null);
          }}
        />
      )}
    </section>
  );
}

function CompareTable() {
  return (
    <section className="lp-section" style={{ background: "transparent" }}>
      <div className="lp-section-inner">
        <div
          className="ip-reveal"
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <span className="lp-section-label">Compare plans</span>
          <h2 className="lp-section-title" style={{ color: "#E6EDF3" }}>
            Everything side by side
          </h2>
        </div>
        <div className="lp-compare-table ip-reveal ip-reveal-d1">
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
  );
}

function FaqSection() {
  const [openFaq, setOpenFaq] = useState(null);
  return (
    <section className="lp-section" style={{ background: "transparent" }}>
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
          className="ip-reveal"
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <span className="lp-section-label">FAQ</span>
          <h2 className="lp-section-title" style={{ color: "#E6EDF3" }}>
            Common questions
          </h2>
        </div>
        <div className="lp-faq ip-reveal ip-reveal-d1">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="lp-faq-item"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="lp-faq-trigger">
                <p className="lp-faq-q">{item.q}</p>
                <span className={`lp-faq-icon${openFaq === i ? " open" : ""}`}>
                  +
                </span>
              </div>
              {openFaq === i && <p className="lp-faq-a">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UserHero({ metadata }) {
  const name = metadata?.display_name || metadata?.name || "Creator";
  const image = metadata?.picture || metadata?.image;
  const nip05 = metadata?.nip05;

  return (
    <div className="ip-hero">
      <div className="ip-hero-glow ip-hero-glow-1" />
      <div className="ip-hero-glow ip-hero-glow-2" />

      <div className="ip-hero-inner">
        <div className="ip-hero-identity">
          <div className="ip-hero-avatar-wrap">
            {image ? (
              <img src={image} alt={name} className="ip-hero-avatar" />
            ) : (
              <div className="ip-hero-avatar ip-hero-avatar-fallback">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="ip-hero-avatar-ring" />
          </div>
          <div className="ip-hero-name-block">
            <p className="ip-hero-greeting">Welcome back,</p>
            <h2 className="ip-hero-name">{name}</h2>
            {nip05 && <p className="ip-hero-nip05">✓ {nip05}</p>}
            <Button
              size="s"
              type="gray"
              onClick={logoutUser}
              style={{ width: "fit-content" }}
              label={"Change user"}
              leftIcon={"switch-arrows"}
            />
          </div>
        </div>

        <div className="ip-hero-divider" />

        <div className="ip-hero-copy">
          <h1 className="ip-hero-title">
            Publishing tools built for
            <br />
            <em>creators who own their work.</em>
          </h1>
          <p className="ip-hero-sub">
            Pick a plan that matches how you publish — from Nostr-native
            basics to AI-assisted writing, audience analytics, and Lightning
            monetization.
          </p>
        </div>
      </div>
    </div>
  );
}

function PricingOverlay({ trialEnded, onBack }) {
  const userMetadata = useSelector((state) => state.userMetadata);
  const userKeys = useSelector((state) => state.userKeys);
  const [isLn, setIsLn] = useState(false);

  useReveal(true);

  return (
    <div
      className="ip-root"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000003,
        width: "100vw",
        height: "100dvh",
        overflowY: "auto",
        overflowX: "hidden",
        animation: "slideUpFull .35s cubic-bezier(.4,0,.2,1) both",
      }}
    >
      {onBack && (
        <div
          style={{ position: "fixed", top: "20px", left: "20px", zIndex: 1000004 }}
        >
          <Button
            size="m"
            type="gray"
            label="Back"
            onClick={onBack}
            leftIcon={"arrow"}
            iconTransform={"rotate(90deg)"}
          />
        </div>
      )}

      <UserHero metadata={userMetadata} />

      {trialEnded && (
        <div
          style={{ maxWidth: 860, margin: "32px auto 0", padding: "0 20px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "16px 20px",
              borderRadius: "10px",
              backgroundColor: "rgba(255,167,38,0.08)",
              border: "1px solid rgba(255,167,38,0.35)",
            }}
          >
            <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>⏳</span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 700,
                  color: "#FFA726",
                  fontSize: "0.95rem",
                }}
              >
                Your trial has ended
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "0.85rem",
                  color: "rgba(139,148,158,0.85)",
                  lineHeight: 1.55,
                }}
              >
                Choose a plan below to continue using YakiHonne. Your content,
                keys, and subscriber list are safe — they'll be right here when
                you're back.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="lp-divider-line" />
      <PricingCards isLn={isLn} setIsLn={setIsLn} userPub={userKeys?.pub} />
      <div className="lp-divider-line" />
      <CompareTable />
      <div className="lp-divider-line" />
      <FaqSection />
    </div>
  );
}

export default function IsPremium({ children }) {
  const dispatch = useDispatch();
  const isConnected = useSelector((state) => state.isConnected);
  const loadingConnectedUser = useSelector(
    (state) => state.loadingConnectedUser,
  );
  const subscription = useSelector((state) => state.subscription);

  const authResolved = !loadingConnectedUser;
  const needsSubCheck = authResolved && isConnected;
  const subPending = needsSubCheck && !subscription.loaded;

  const isBlocked =
    needsSubCheck &&
    subscription.loaded &&
    subscription.status?.access_blocked === true;

  const forcePaywall = subscription.forcePaywall;

  if (subPending) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100dvh",
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <>
      {children}

      {isBlocked && <PricingOverlay trialEnded={true} onBack={null} />}

      {!isBlocked && forcePaywall && (
        <PricingOverlay
          trialEnded={false}
          onBack={() => dispatch(setForcePaywall(false))}
        />
      )}
    </>
  );
}
