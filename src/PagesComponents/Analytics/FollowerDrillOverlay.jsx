import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { intervalLabel, intervalBounds } from "./BarDrillOverlay";
import { useFollowersForDay } from "@/hooks/analytics/useFollowerEvents";
import { saveUsers } from "@/Helpers/Helpers";
import Overlay from "@/Components/Overlay";
import UserRow from "@/Components/UserRow";
import Icon from "@/Components/LucideIcon";

export default function FollowerDrillOverlay({ drill, pubkey, onClose }) {
  const { t } = useTranslation();
  const { title, dateStr, bucket, value } = drill;
  const [since, until] = intervalBounds(dateStr, bucket);

  const rows = useFollowersForDay(pubkey, since, until);

  useEffect(() => {
    if (!rows || rows.length === 0) return;
    saveUsers(rows.map((r) => r.followerPubkey));
  }, [rows]);

  const subtitle = intervalLabel(dateStr, bucket);

  return (
    <Overlay exit={onClose} width={460}>
      <div
        className="border-bottom-p box-pad-h box-pad-v-m"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#6366f122",
              flexShrink: 0,
            }}
            className="fx-centered"
          >
            <Icon name="user-followed" size={18} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }} className="p-medium-c">
              {title}
            </p>
            <p style={{ margin: 0, fontSize: "0.8rem" }} className="p-secondary-c">
              {subtitle}
            </p>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#6366f1", lineHeight: 1 }}>
            {value.toLocaleString()}
          </p>
          <p style={{ margin: 0, fontSize: "0.7rem" }} className="p-secondary-c">
            {t("AtlqBGm")}
          </p>
        </div>
      </div>

      <div
        className="box-pad-h box-pad-v-m"
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        {rows === undefined && (
          <p className="p-secondary-c" style={{ textAlign: "center", padding: "1.5rem 0" }}>
            {t("AIUAUcP")}
          </p>
        )}
        {rows && rows.length === 0 && (
          <p className="p-secondary-c" style={{ textAlign: "center", padding: "1.5rem 0", fontSize: "0.875rem" }}>
            {t("A70Zdvz")}
          </p>
        )}
        {rows && rows.map((row) => (
          <UserRow key={row.followerPubkey} pubkey={row.followerPubkey} />
        ))}
      </div>
    </Overlay>
  );
}
