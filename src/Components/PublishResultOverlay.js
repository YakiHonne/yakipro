import React from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { nip19 } from "nostr-tools";
import Overlay from "@/Components/Overlay";
import Button from "@/Components/UI/Button";
import Icon from "@/Components/LucideIcon";
import useUserProfile from "@/hooks/useUserProfile";

const YAKIHONNE_URL = "https://yakihonne.com";

// A published event is addressed as an nevent for a regular note and an naddr for
// a replaceable one (long-form articles), so the identifier is derived from the
// event's own kind rather than passed in by each caller.
export const encodeEventAddress = (event) => {
  if (!event?.id) return "";
  try {
    const isAddressable = event.kind >= 30000 && event.kind < 40000;
    if (isAddressable) {
      const identifier = (event.tags || []).find((tag) => tag[0] === "d")?.[1];
      if (identifier) {
        return nip19.naddrEncode({
          identifier,
          pubkey: event.pubkey,
          kind: event.kind,
        });
      }
    }
    return nip19.neventEncode({ id: event.id, author: event.pubkey });
  } catch (err) {
    console.error("[PublishResultOverlay] failed to encode address", err);
    return "";
  }
};

const truncate = (text, max) =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

function AuthorRow({ pubkey }) {
  const { t } = useTranslation();
  const { userProfile } = useUserProfile(pubkey);

  return (
    <div className="fx-centered fx-start-h fx-gap-h">
      <div
        className="bg-cover"
        style={{
          backgroundImage: `url(${userProfile?.picture || ""})`,
          backgroundColor: "var(--color-divider)",
          borderRadius: "50%",
          width: 38,
          height: 38,
          flexShrink: 0,
        }}
      >
        {!userProfile?.picture && (
          <div className="fx-centered" style={{ width: "100%", height: "100%" }}>
            <Icon name="user" size={20} />
          </div>
        )}
      </div>
      <div className="fx-col fx-start-v" style={{ gap: 0, minWidth: 0 }}>
        <p className="p-bold p-one-line">{userProfile?.display_name}</p>
        <p className="gray-c p-medium p-one-line">
          {userProfile?.name ? `@${userProfile.name} · ` : ""}
          {t("AJustNow")}
        </p>
      </div>
    </div>
  );
}

export default function PublishResultOverlay({ event, kind, article, exit }) {
  const { t } = useTranslation();
  const router = useRouter();
  const userKeys = useSelector((state) => state.userKeys);
  const address = encodeEventAddress(event);
  const isArticle = kind === "article";

  // Dismissing takes the author to the list their content just joined, rather
  // than back to an editor they are finished with. Both the X and the Close
  // button go through here so the two never diverge.
  const closeAndGoToContent = () => {
    exit();
    router.push(`/content?tab=${isArticle ? "articles" : "notes"}`);
  };

  // Opens in a separate tab and never as a popup: "_blank" plus noopener means the
  // new tab cannot reach back into this one, and the editor stays exactly as the
  // author left it rather than being navigated away from.
  const openOnYakihonne = () => {
    if (!address) return;
    window.open(`${YAKIHONNE_URL}/${address}`, "_blank", "noopener,noreferrer");
  };

  return (
    // The backdrop calls `exit` directly, so it gets the redirect too — otherwise
    // clicking outside would be the one way to dismiss without being taken to the
    // content list.
    <Overlay width={520} exit={closeAndGoToContent}>
      <div
        className="fx-col box-pad-h box-pad-v fit-container relative"
        style={{ gap: "1.25rem" }}
      >
        <div
          className="close"
          style={{ position: "absolute", top: "16px", right: "16px", zIndex: 1 }}
          onClick={closeAndGoToContent}
        >
          <div />
        </div>

        <div
          className="fit-container fx-centered fx-col"
          style={{ gap: ".4rem", marginTop: "1.5rem" }}
        >
          <div
            className="fx-centered"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "rgba(0,192,77,.12)",
            }}
          >
            <Icon name="check" size={26} isColored />
          </div>
          <h3 className="p-centered" style={{ margin: 0 }}>
            {isArticle ? t("AArtPubT") : t("ANotePubT")}
          </h3>
          <p className="gray-c p-centered" style={{ margin: 0 }}>
            {isArticle ? t("AArtPubD") : t("ANotePubD")}
          </p>
        </div>

        {isArticle ? (
          <div
            className="fit-container round-corner-m border-all fx-col"
            style={{ gap: 0, overflow: "hidden" }}
          >
            {article?.image && (
              <div
                className="fit-container bg-cover"
                style={{
                  height: "150px",
                  backgroundImage: `url(${article.image})`,
                  backgroundColor: "var(--color-divider)",
                }}
              />
            )}
            <div
              className="fx-col box-pad-h-m box-pad-v-m"
              style={{ gap: ".6rem" }}
            >
              <p className="p-bold" style={{ margin: 0, fontSize: "1.05rem" }}>
                {article?.title || t("ANoTitle")}
              </p>
              {article?.summary && (
                <p className="gray-c p-medium" style={{ margin: 0 }}>
                  {truncate(article.summary, 220)}
                </p>
              )}
              <div className="fx-centered fx-start-h fx-gap-h">
                {article?.isPremium && (
                  <div className="sticker sticker-small sticker-gst-orange">
                    {t("APremium")}
                  </div>
                )}
                {article?.readTime > 0 && (
                  <p className="gray-c p-medium" style={{ margin: 0 }}>
                    {article.readTime} {t("AMinRead")}
                  </p>
                )}
              </div>
              <div style={{ paddingTop: ".4rem" }}>
                <AuthorRow pubkey={event?.pubkey || userKeys?.pub} />
              </div>
            </div>
          </div>
        ) : (
          <div
            className="fit-container round-corner-m border-all box-pad-h-m box-pad-v-m fx-col"
            style={{ gap: ".75rem" }}
          >
            <AuthorRow pubkey={event?.pubkey || userKeys?.pub} />
            {/* Clamped to 7 lines rather than a character count: a character cap
                cuts at a different visual length for every note, and line-clamp
                ellipsises at the real boundary whatever the content is. */}
            <p
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                display: "-webkit-box",
                WebkitLineClamp: 7,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {event?.content || ""}
            </p>
          </div>
        )}

        <div
          className="fit-container fx-centered fx-gap-h"
          style={{ marginTop: ".5rem" }}
        >
          <Button
            label={t("AViewOnY")}
            type="primary"
            size="m"
            full
            rightIcon="external_link"
            disabled={!address}
            onClick={openOnYakihonne}
          />
          <Button
            label={t("ACloseBtn")}
            type="gray"
            size="m"
            full
            onClick={closeAndGoToContent}
          />
        </div>
      </div>
    </Overlay>
  );
}
