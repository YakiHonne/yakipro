import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { nip19 } from "nostr-tools";
import { useFollowersList } from "@/hooks/analytics/useFollowerEvents";
import { saveUsers } from "@/Helpers/Helpers";
import Overlay from "@/Components/Overlay";
import UserRow from "@/Components/UserRow";
import Icon from "@/Components/LucideIcon";

const formatFollowDate = (createdAt) => {
  if (!createdAt) return null;
  const date = new Date(createdAt * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const openProfile = (pubkey) => {
  try {
    const npub = nip19.npubEncode(pubkey);
    window.open(
      `https://yakihonne.com/${npub}`,
      "_blank",
      "noopener,noreferrer",
    );
  } catch (err) {
    console.error("[FollowersListOverlay] failed to open profile", err);
  }
};

export default function FollowersListOverlay({ pubkey, onClose }) {
  const { t } = useTranslation();
  const { items, hasMore, loading, loadMore } = useFollowersList(pubkey);
  const sentinelRef = useRef(null);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    const newest = items.slice(-20).map((r) => r.followerPubkey);
    if (newest.length) saveUsers(newest);
  }, [items.length]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([obs]) => {
        if (obs.isIntersecting) loadMore();
      },
      { threshold: 0.1, rootMargin: "200px 0px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore, items.length]);

  return (
    <Overlay exit={onClose} width={460}>
      <div className="border-bottom-p box-pad-h box-pad-v-m">
        <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }} className="p-medium-c">
          {t("A9TqNxQ")}
        </p>
      </div>

      <div
        className="box-pad-h box-pad-v-m"
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        {items.length === 0 && !loading && (
          <p className="p-secondary-c" style={{ textAlign: "center", padding: "1.5rem 0", fontSize: "0.875rem" }}>
            {t("A70Zdvz")}
          </p>
        )}
        {items.map((row) => {
          const followedOn = formatFollowDate(row.createdAt);
          return (
            <UserRow key={row.followerPubkey} pubkey={row.followerPubkey}>
              <div className="fx-centered fx-gap-h-s">
                {followedOn && (
                  <span
                    className="gray-c p-medium p-one-line"
                    style={{ fontSize: "0.72rem" }}
                    title={t("A5FoLwD", "Followed you")}
                  >
                    {followedOn}
                  </span>
                )}
                <span
                  className="pointer fx-centered"
                  onClick={() => openProfile(row.followerPubkey)}
                  title="Open on yakihonne.com"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <Icon name="external_link" size={16} />
                </span>
              </div>
            </UserRow>
          );
        })}
        {loading && (
          <p className="p-secondary-c" style={{ textAlign: "center", padding: "1rem 0" }}>
            {t("AIUAUcP")}
          </p>
        )}
        {hasMore && <div ref={sentinelRef} />}
      </div>
    </Overlay>
  );
}
