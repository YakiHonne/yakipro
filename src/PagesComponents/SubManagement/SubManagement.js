import IsUserOnline from "@/Components/IsUserOnline";
import Button from "@/Components/UI/Button";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import RelaysList from "./RelaysList";
import SubscribersList from "./SubscribersList";

export default function SubManagement() {
  const { t } = useTranslation();
  return (
    <IsUserOnline>
      <div
        className="fit-container box-pad-h-m box-pad-v-m fx-gap-v-m fx-col no-scrollbar"
        style={{ height: "100dvh", overflow: "scroll" }}
      >
        <div className="fit-container fx-scattered">
          <div>
            <h1>{t("AYIXG83")}</h1>
            <p className="gray-c">{t("AVysZ1s")}</p>
          </div>
          <Link href={"/sub-plans"}>
            <Button
              size="m"
              label={t("AVG3Uga")}
              type="gray"
              rightIcon={"share-icon"}
            />
          </Link>
        </div>
        <RelaysList />
        <SubscribersList />
      </div>
    </IsUserOnline>
  );
}
