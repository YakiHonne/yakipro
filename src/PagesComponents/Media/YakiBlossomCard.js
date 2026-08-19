import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProgressBar from "@/Components/ProgressBar";
import Button from "@/Components/UI/Button";
import Icon from "@/Components/LucideIcon";
import Spinner from "@/Components/Spinner";
import useAccountAccess from "@/hooks/useAccountAccess";
import useAccessFailure from "@/hooks/useAccessFailure";
import { setUserBlossomServers } from "@/Store/Slices/UserData";
import { setToast } from "@/Store/Slices/Extras";
import { InitEvent } from "@/Helpers/Encryptions";
import { publishEvent } from "@/Helpers/Helpers";

export const YAKI_BLOSSOM = process.env.NEXT_PUBLIC_BLOSSOM_SERVER;

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

// Plan storage ceilings. Trial shares the free allowance: a trial is for
// evaluating the product, not for parking 50GB against a plan not paid for.
const PLAN_QUOTAS = {
  free: 500 * MB,
  trial: 500 * MB,
  basic: 50 * GB,
  premium: 100 * GB,
};

export const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < GB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${(bytes / GB).toFixed(2)} GB`;
};

export default function YakiBlossomCard({ used, isLoading }) {
  const dispatch = useDispatch();
  const userBlossomServers = useSelector((state) => state.userBlossomServers);
  const { plan, inTrial, isFree } = useAccountAccess();
  const { showPaymentSheet } = useAccessFailure();
  const [isAdding, setIsAdding] = useState(false);

  const isListed = userBlossomServers.includes(YAKI_BLOSSOM);

  const quota = useMemo(() => {
    if (inTrial) return PLAN_QUOTAS.trial;
    if (isFree) return PLAN_QUOTAS.free;
    return PLAN_QUOTAS[plan] ?? PLAN_QUOTAS.free;
  }, [plan, inTrial, isFree]);

  const consumed = used || 0;
  const percentage = Math.min(100, (consumed / quota) * 100);
  const isFull = consumed >= quota;

  const handleAddToList = async () => {
    if (isAdding || isListed) return;
    setIsAdding(true);
    try {
      const updated = [...userBlossomServers, YAKI_BLOSSOM];
      const event = {
        kind: 10063,
        content: "",
        tags: updated.map((server) => ["server", server]),
      };
      const eventInitEx = await InitEvent(event);
      if (!eventInitEx) {
        setIsAdding(false);
        return;
      }
      await publishEvent(eventInitEx);
      dispatch(setUserBlossomServers(updated));
      dispatch(setToast({ type: 1, desc: "Server added to your list." }));
    } catch (err) {
      console.error("[YakiBlossomCard] failed to add server", err);
      dispatch(setToast({ type: 2, desc: "Could not add this server." }));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="yaki-username-border fit-container">
      <div className="yaki-username-border-spinner" />
      <div className="yaki-username-border-content">
        <div
          className="fit-container fx-scattered box-pad-h-m box-pad-v-m"
          style={{
            backgroundColor: "var(--color-primary-bg)",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div className="fx-col" style={{ gap: "10px", flex: 1, minWidth: 0 }}>
            <div className="fx-centered fx-start-h fx-gap-h">
              <Icon name="crown" size={28} isColored />
              <h3 style={{ margin: 0 }} className="p-one-line">
                {(() => {
                  try {
                    return new URL(YAKI_BLOSSOM).hostname;
                  } catch {
                    return YAKI_BLOSSOM;
                  }
                })()}
              </h3>
            </div>

            {isLoading ? (
              <div className="fx-centered fx-start-h">
                <Spinner size={16} />
              </div>
            ) : (
              <div className="fx-col fit-container" style={{ gap: "12px" }}>
                <ProgressBar percentage={percentage} full />
                <div className="fx-centered fx-start-h fx-gap-h">
                  <span style={{ fontSize: "1rem", fontWeight: 600 }}>
                    {formatBytes(consumed)}{" "}
                    <span
                      className="p-secondary-c"
                      style={{ fontWeight: 400 }}
                    >
                      of {formatBytes(quota)}
                    </span>
                  </span>
                  {isFull && <span className="p-red-c">Storage full</span>}
                </div>
              </div>
            )}
          </div>

          <div className="fx-centered fx-gap-h">
            {isFull && (
              <Button
                label="Upgrade"
                type="primary"
                size="m"
                onClick={() => showPaymentSheet("blossom-storage")}
              />
            )}
            {!isListed && (
              <Button
                label="Add to list"
                type="gray"
                size="m"
                leftIcon="plus"
                loading={isAdding}
                onClick={handleAddToList}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
