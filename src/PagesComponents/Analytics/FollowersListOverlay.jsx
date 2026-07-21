import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFollowersList } from "@/hooks/analytics/useFollowerEvents";
import { saveUsers } from "@/Helpers/Helpers";
import Overlay from "@/Components/Overlay";
import UserRow from "@/Components/UserRow";

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
        {items.map((row) => (
          <UserRow key={row.followerPubkey} pubkey={row.followerPubkey} />
        ))}
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
