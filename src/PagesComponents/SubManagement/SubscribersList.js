import useGatewayAccess from "@/hooks/useGatewayAccess";
import usePlans from "@/hooks/usePlans";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/Components/UI/Button";
import { SelectTabs } from "@/Components/SelectTabs";
import DeleteWarning from "@/Components/DeleteWarning";
import UserRow from "@/Components/UserRow";
import AddSubscriberOverlay from "./AddSubscriberOverlay";

export default function SubscribersList() {
  const { t } = useTranslation();
  const {
    accessEvent,
    followList,
    isLoading,
    publishGatewayAccess,
    directSubscribers,
    removeDirectSubscriber,
    addDirectSubscriber,
  } = useGatewayAccess(process.env.NEXT_PUBLIC_GATEWAY_PUBKEY);
  const { plans } = usePlans();
  const [tab, setTab] = useState(0);
  const [toDelete, setToDelete] = useState(null);
  const [showAddSubscriber, setShowAddSubscriber] = useState(null);

  return (
    <>
      {showAddSubscriber && (
        <AddSubscriberOverlay
          exit={() => setShowAddSubscriber(false)}
          onAdd={addDirectSubscriber}
          existingPubkeys={(directSubscribers || []).map((s) => s.pubkey)}
        />
      )}
      {toDelete && (
        <DeleteWarning
          title={t("AAUycZW")}
          description={t("AQIAfYS")}
          exit={() => {
            setToDelete(null);
          }}
          handleDelete={() => {
            setToDelete(null);
            removeDirectSubscriber(toDelete);
          }}
          actionButtonLabel={t("AvEJw6B")}
        />
      )}
      <div className="fit-container box-pad-h-m box-pad-v-m fx-gap-v-m fx-col no-scrollbar">
        <div className="fx-scattered">
          <h3 className="p-primary-c">{t("A2mdxcf")}</h3>
        </div>
        <div className="fx-scattered fit-container">
          <div>
            <SelectTabs
              tabs={[t("AH90wGL"), t("A14HHPP")]}
              selectedTab={tab}
              setSelectedTab={setTab}
            />
          </div>
          {tab === 1 && (
            <Button
              leftIcon={"plus"}
              type="primary"
              label={t("A6rkFum")}
              onClick={() => setShowAddSubscriber(true)}
            />
          )}
        </div>
        {tab === 0 && (
          <>
            {!(plans.isFiatEnable && plans.isLnEnabled) && !accessEvent && (
              <div className="fit-container fx-col fx-centered fx-gap-v box-pad-h box-pad-v round-corner-m border-all">
                <h3>{t("A65LO6w")}</h3>
                <p className="p-secondary-c p-centered box-pad-h-m">
                  {t("Ayh5F4w")}
                </p>
                <Button
                  label={t("A7noclE")}
                  type="primary"
                  size="m"
                  onClick={publishGatewayAccess}
                  loading={isLoading}
                />
              </div>
            )}
            {(!followList || followList?.length === 0) && accessEvent && (
              <div className="fit-container fx-col fx-centered fx-gap-v box-pad-h box-pad-v round-corner-m border-all">
                <h3>{t("AQG30hM")}</h3>
                <p className="p-secondary-c p-centered box-pad-h-m">
                  {t("AcPmGuk")}
                </p>
              </div>
            )}

            {followList && followList.length > 0 && (
              <div className="fx-col fx-gap-v fit-container">
                {followList.map((pubkey) => (
                  <UserRow key={pubkey} pubkey={pubkey} />
                ))}
              </div>
            )}
          </>
        )}
        {tab === 1 && (
          <>
            {directSubscribers && directSubscribers.length > 0 && (
              <div className="fx-col fx-gap-v fit-container">
                {directSubscribers.map((pubkey) => (
                  <UserRow
                    key={pubkey.pubkey}
                    pubkey={pubkey.pubkey}
                    remove={() => setToDelete(pubkey.id)}
                  />
                ))}
              </div>
            )}
            {directSubscribers && directSubscribers.length === 0 && (
              <div className="fit-container fx-col fx-centered fx-gap-v box-pad-h box-pad-v round-corner-m border-all">
                <h3>{t("AQG30hM")}</h3>
                <p className="p-secondary-c p-centered box-pad-h-m">
                  {t("AcPmGuk")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
