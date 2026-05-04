import useGatewayAccess from "@/hooks/useGatewayAccess";
import usePlans from "@/hooks/usePlans";
import useUserProfile from "@/hooks/useUserProfile";
import React from "react";
import { useTranslation } from "react-i18next";
import Icon from "@/Components/Icon";
import Button from "@/Components/UI/Button";

const SubscriberRow = ({ pubkey }) => {
  const { userProfile } = useUserProfile(pubkey);
  return (
    <div className="fit-container round-corner-m border-all box-pad-h-m box-pad-v-s fx-scattered">
      <div className="fx-centered fx-start-h fx-gap-h">
        <div
          className="bg-cover"
          style={{
            backgroundImage: `url(${userProfile.picture || ""})`,
            backgroundColor: "var(--color-divider)",
            borderRadius: "50%",
            width: 38,
            height: 38,
          }}
        >
          {!userProfile.picture && (
            <div
              className="fx-centered"
              style={{ width: "100%", height: "100%" }}
            >
              <Icon name="user" size={20} />
            </div>
          )}
        </div>
        <div className="fx-col fx-start-v" style={{ gap: 0 }}>
          <p className="p-bold p-one-line">{userProfile.display_name}</p>
          <p className="gray-c p-medium p-one-line">@{userProfile.name}</p>
        </div>
      </div>
    </div>
  );
};

export default function SubscribersList() {
  const { t } = useTranslation();
  const { accessEvent, followList, isLoading, publishGatewayAccess } =
    useGatewayAccess(process.env.NEXT_PUBLIC_GATEWAY_PUBKEY);
  const { plans } = usePlans();
  return (
    <div className="fit-container box-pad-h-m box-pad-v-m fx-gap-v-m fx-col no-scrollbar">
      <div className="fx-scattered">
        <h3 className="p-primary-c">{t("A2mdxcf")}</h3>
      </div>
      {!(plans.isFiatEnable && plans.isLnEnabled) && !accessEvent && (
        <div className="fit-container fx-col fx-centered fx-gap-v box-pad-h box-pad-v round-corner-m border-all">
          <h3>{t("A65LO6w")}</h3>
          <p className="p-secondary-c p-centered box-pad-h-m">{t("Ayh5F4w")}</p>
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
          <p className="p-secondary-c p-centered box-pad-h-m">{t("AcPmGuk")}</p>
        </div>
      )}

      {followList && followList.length > 0 && (
        <div className="fx-col fx-gap-v fit-container">
          {followList.map((pubkey) => (
            <SubscriberRow key={pubkey} pubkey={pubkey} />
          ))}
        </div>
      )}
    </div>
  );
}
