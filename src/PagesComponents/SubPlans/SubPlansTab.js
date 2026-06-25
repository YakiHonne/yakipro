import Button from "@/Components/UI/Button";
import usePlans from "@/hooks/usePlans";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import EnableStripe from "./EnableStripe";
import LoadingData from "@/Components/LoadingData";
import Icon from "@/Components/Icon";
import Toggle from "@/Components/Toggle";
import { StripeSupportedCountries } from "@/Content/StripeSupportedCountries";
import FiatPricings from "./FiatPricings";
import StableCoinsPricings from "./StableCoinsPricings";
import LightningPricings from "./LightningPricings";
import {
  changeStatus,
  postProducts,
  removeProduct,
} from "@/Endpoionts/payment";
import { getEventTags, publishEvent } from "@/Helpers/Helpers";
import { InitEvent } from "@/Helpers/Encryptions";
import { useDispatch } from "react-redux";
import { setToast } from "@/Store/Slices/Extras";

export default function SubPlansTab() {
  const { t } = useTranslation();
  const {
    plans,
    loading,
    stripeAccount,
    loginAccount,
    finishSetup,
    gatewayUrl,
    refresh,
  } = usePlans();
  const [showEnableStripe, setShowEnableStripe] = useState(false);
  const [enableFiat, setEnableFiat] = useState(false);
  const [enableSC, setEnableSC] = useState(false);
  const [enableLightning, setEnableLightning] = useState(false);
  const [fiatPricings, setFiatPricings] = useState([]);
  const [scPricings, setScPricings] = useState([]);
  const [lightningPricings, setLightningPricings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const enableSaving = useMemo(() => {
    return (
      enableFiat !== plans.isFiatEnable ||
      enableSC !== plans.isCryptoEnabled ||
      enableLightning !== plans.isLnEnabled ||
      fiatPricings.length !== plans.fiat.length ||
      scPricings.length !== plans.crypto.length ||
      lightningPricings.length !== plans.ln.length
    );
  }, [
    enableFiat,
    enableSC,
    enableLightning,
    fiatPricings,
    scPricings,
    lightningPricings,
    plans,
  ]);

  useEffect(() => {
    if (plans) {
      setFiatPricings(plans.fiat);
      setScPricings(plans.crypto);
      setLightningPricings(plans.ln);
      setEnableFiat(plans.isFiatEnable);
      setEnableSC(plans.isCryptoEnabled);
      setEnableLightning(plans.isLnEnabled);
    }
  }, [plans]);

  const caps = useMemo(() => {
    let cap = StripeSupportedCountries.find(
      (_) => _.value == stripeAccount?.country,
    );
    if (!cap) return { fiat: false, sc: false };
    return {
      fiat: cap.capabilities.includes("card_payments"),
      sc: cap.capabilities.includes("crypto_payments"),
    };
  }, [stripeAccount]);
  const currency = useMemo(() => {
    let cur = StripeSupportedCountries.find(
      (_) => _.value == stripeAccount?.country,
    );
    if (!cur) return "USD";
    return cur.currency;
  }, [stripeAccount]);

  const dispatch = useDispatch();
  const handleSave = async () => {
    setIsLoading(true);
    try {
      let fiat = await postProducts({
        pricings: fiatPricings,
        currency,
        method: "fiat",
      });
      let sc = await postProducts({
        pricings: scPricings,
        currency: "usdc",
        method: "crypto",
      });
      let lightning = lightningPricings;
      if (plans.isFiatEnable !== enableFiat) {
        await changeStatus({ method: "fiat" });
      }
      if (plans.isCryptoEnabled !== enableSC) {
        await changeStatus({ method: "crypto" });
      }
      let tags = getEventTags({
        gatewayUrl,
        fiat,
        sc,
        lightning,
        enableFiat,
        enableSC,
        enableLightning,
      });
      let event = {
        kind: 30164,
        tags,
        content: "",
      };
      let event_ = await InitEvent(event);
      if (!event_) {
        dispatch(setToast({ type: 2, desc: "Failed to sign event" }));
        setIsLoading(false);
        return;
      }
      let published = await publishEvent(event_);
      if (published) {
        dispatch(setToast({ type: 1, desc: "Successfully saved plans" }));
      } else {
        dispatch(setToast({ type: 2, desc: "Failed to publish event" }));
      }
      refresh();
      setIsLoading(false);
    } catch (err) {
      console.log(err);
      dispatch(setToast({ type: 2, desc: "Failed to save plans" }));
      setIsLoading(false);
    }
  };
  const handleArchivePrice = async ({ method, price_id }) => {
    setIsLoading(true);
    try {
      let response = await removeProduct({
        price_id,
        method,
      });

      let updatedPrices = response.data;
      dispatch(setToast({ type: 1, desc: response.message }));

      let lightning = lightningPricings;
      let tags = getEventTags({
        gatewayUrl,
        fiat: method === "fiat" ? updatedPrices : fiatPricings,
        sc: method === "crypto" ? updatedPrices : scPricings,
        lightning,
        enableFiat,
        enableSC,
        enableLightning,
      });
      let event = {
        kind: 30164,
        tags,
        content: "",
      };
      let event_ = await InitEvent(event);
      if (!event_) {
        dispatch(setToast({ type: 2, desc: "Failed to sign event" }));
        setIsLoading(false);
        return;
      }
      let published = await publishEvent(event_);
      if (published) {
        dispatch(setToast({ type: 1, desc: "Successfully saved plans" }));
      } else {
        dispatch(setToast({ type: 2, desc: "Failed to publish event" }));
      }
      refresh();
      setIsLoading(false);
    } catch (err) {
      console.log(err);
      dispatch(setToast({ type: 2, desc: "Failed to save plans" }));
      setIsLoading(false);
    }
  };

  return (
    <>
      {showEnableStripe && (
        <EnableStripe exit={() => setShowEnableStripe(false)} />
      )}
      <LoadingData isLoading={loading} height="50dvh">
        <h3 className="p-primary-c">{t("AWmDftG")}</h3>
        <div className="fit-container round-corner-m border-all">
          <div className="fx-scattered box-pad-h-m box-pad-v-m border-bottom">
            <p>{t("AHhPGax")}</p>
            <Toggle
              status={!stripeAccount?.is_setup ? false : enableFiat}
              setStatus={setEnableFiat}
              disabled={!stripeAccount?.is_setup}
            />
          </div>

          <div className="fx-scattered box-pad-h-m box-pad-v-m ">
            <div>
              {stripeAccount?.account_id && (
                <div className="box-pad-h-s border-all round-corner-m fx-centered fx-gap-h bg-hover pointer">
                  <p>#{stripeAccount.account_id}</p>
                  <Icon name={"copy"} />
                </div>
              )}
            </div>
            {!stripeAccount && (
              <Button
                size="m"
                label={t("A1jhS42")}
                onClick={() => setShowEnableStripe(true)}
                type="primary"
                loading={loading}
                disabled={loading}
              />
            )}
            {stripeAccount && stripeAccount?.is_setup && (
              <Button
                size="m"
                label={t("Aai65RJ")}
                onClick={loginAccount}
                type="gray"
                loading={loading}
                disabled={loading}
              />
            )}
            {stripeAccount && !stripeAccount?.is_setup && (
              <Button
                size="m"
                label={t("Alz0E9Y")}
                onClick={finishSetup}
                type="secondary"
                loading={loading}
                disabled={loading}
              />
            )}
          </div>
        </div>
        <div className="fit-container fx-scattered box-pad-h-m box-pad-v-m round-corner-m border-all">
          <p>{t("AHMARaK")}</p>
          <Toggle status={enableLightning} setStatus={setEnableLightning} />
        </div>
        <div className="fit-container fx-scattered">
          <h3 className="p-primary-c">{t("AO0OqWT")}</h3>
          {enableSaving && (
            <div className="slide-left">
              <Button
                size="m"
                type="primary"
                loading={isLoading}
                label={t("A1IsKJ0")}
                onClick={handleSave}
              />
            </div>
          )}
        </div>
        {enableFiat && (
          <FiatPricings
            currency={currency}
            setFiatPricings={setFiatPricings}
            fiatPricings={plans.fiat}
            handleArchivePrice={handleArchivePrice}
          />
        )}
        {enableSC && (
          <StableCoinsPricings
            scPricings={plans.crypto}
            setScPricings={setScPricings}
            handleArchivePrice={handleArchivePrice}
          />
        )}
        {enableLightning && (
          <LightningPricings
            lightningPricings={plans.ln}
            currency={"SATs"}
            setLightningPricings={setLightningPricings}
          />
        )}
        {!enableFiat && !enableSC && !enableLightning && (
          <div className="fit-container fx-centered border-all round-corner-m box-pad-h box-pad-v fx-centered fx-col fx-gap-v">
            <h4>{t("A8YL3m4")}</h4>
            <p className="p-secondary-c">{t("AVUI6uC")}</p>
          </div>
        )}
      </LoadingData>
    </>
  );
}
