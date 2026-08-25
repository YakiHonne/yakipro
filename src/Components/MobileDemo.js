import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Overlay from "@/Components/Overlay";
import BrandIcon from "@/Components/Icon";
import { MOBILE_APP_LINKS } from "@/config/mobileApp";

// The promo video is still YakiHonne's, so the block is hidden until a YakiPro
// one exists. Set to true to bring it back — the markup below is intact.
const SHOW_PROMO_VIDEO = false;

/**
 * The mobile-app promo overlay: an autoplaying promo video, then a card with
 * the QR code and the store links.
 *
 * The backdrop/sheet behaviour the spec calls for — portal into #portal-root,
 * body-scroll lock, the 0.3s scrim fade, the top:50px→0 spring entry, animated
 * exit, backdrop-click-to-close, and the ≤800px bottom-sheet presentation — is
 * all already implemented by Overlay, so this composes it rather than
 * reimplementing a second modal primitive.
 */
export default function MobileDemo({ exit }) {
  const { t } = useTranslation();

  // Escape closes. Overlay handles the click-outside case itself.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exit]);

  // All four marks come from the legacy v1 icon set; lucide carries no brand
  // icons at all.
  const stores = [
    {
      href: MOBILE_APP_LINKS.ios,
      icon: "apple",
      label: t("AMob004"),
      disabled: MOBILE_APP_LINKS.iosPending,
    },
    { href: MOBILE_APP_LINKS.android, icon: "google", label: t("AMob005") },
    { href: MOBILE_APP_LINKS.zapstore, icon: "zapstore", label: t("AMob006") },
  ];

  return (
    <Overlay width={800} exit={exit}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("AMob010")}
        className="fx-col fx-centered"
        style={{ gap: "16px", padding: "16px", position: "relative" }}
      >
        <button
          className="mobile-demo-close"
          onClick={exit}
          aria-label={t("ACloseBtn")}
        />

        {SHOW_PROMO_VIDEO && (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            controls
            style={{
              width: "100%",
              border: "none",
              zIndex: 0,
              borderRadius: "var(--radius-xl)",
              display: "block",
            }}
          >
            <source src={MOBILE_APP_LINKS.promoVideo} type="video/mp4" />
            {t("AMob008")}
          </video>
        )}

        <div
          className="mobile-demo-card fit-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="fx-centered fit-container"
            style={{ gap: "20px", flexWrap: "wrap" }}
          >
            <div style={{ width: "200px" }}>
              <img
                src={MOBILE_APP_LINKS.qr}
                alt={t("AMob002")}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: "var(--radius-xl)",
                  display: "block",
                }}
              />
            </div>

            <div className="fx-col" style={{ gap: "10px" }}>
              <div className="fx-col fx-centered" style={{ gap: ".25rem" }}>
                <h4 style={{ margin: 0 }}>{t("AMob002")}</h4>
                <p
                  className="p-secondary-c"
                  style={{
                    margin: 0,
                    textAlign: "center",
                    maxWidth: "350px",
                  }}
                >
                  {t("AMob003")}
                </p>
              </div>

              <div
                className="fx-centered"
                style={{ gap: ".5rem", flexWrap: "wrap" }}
              >
                {stores.map((s) =>
                  s.disabled ? (
                    // Kept visible so the platform is still advertised, but
                    // inert: no href, so it cannot be opened by click, middle
                    // click, or keyboard.
                    <button
                      key={s.label}
                      className="btn btn-gray fx-centered fx-gap-h"
                      disabled
                      title={t("AMob009")}
                      // btn-disabled shares btn-gray's background in dark
                      // theme, so the state needs to be shown explicitly.
                      style={{ opacity: 0.45, cursor: "not-allowed" }}
                    >
                      <BrandIcon name={s.icon} size={18} />
                      <span>{s.label}</span>
                    </button>
                  ) : (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      <button className="btn btn-gray fx-centered fx-gap-h">
                        <BrandIcon name={s.icon} size={18} />
                        <span>{s.label}</span>
                      </button>
                    </a>
                  ),
                )}
                <a
                  href={MOBILE_APP_LINKS.github}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                  aria-label="GitHub"
                >
                  <button
                    className="btn btn-gray fx-centered"
                    style={{ aspectRatio: "1 / 1", padding: 0 }}
                  >
                    <BrandIcon name="github-logo" size={18} />
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
