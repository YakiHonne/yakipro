import Overlay from "@/Components/Overlay";
import Button from "@/Components/UI/Button";
import Select from "@/Components/UI/Select";
import { StripeSupportedCountries } from "@/Content/StripeSupportedCountries";
import { enableStripe } from "@/Endpoionts/payment";
import { getCountryCodeFromBrowser } from "@/Helpers/Helpers";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function EnableStripe({ exit }) {
  const { t } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const capabilities = useMemo(() => {
    if (!selectedCountry) return [];
    const country = StripeSupportedCountries.find(
      (c) => c.value === selectedCountry,
    );
    return country ? country.capabilities : [];
  }, [selectedCountry]);
  useEffect(() => {
    const code = getCountryCodeFromBrowser();
    if (code && StripeSupportedCountries.find((c) => c.value === code)) {
      setSelectedCountry(code);
    }
  }, []);

  const caps = {
    card_payments: t("AArGqN7"),
    crypto_payments: t("ADHdLfJ"),
    transfers: t("AMBxvKP"),
  };

  const enableStripeAccount = async () => {
    setLoading(true);
    const data = await enableStripe({ country: selectedCountry });
    if (data) {
      window.open(data);
    }
    setLoading(false);
  };

  return (
    <Overlay exit={exit}>
      <div className="fit-container fx-col fx-centered fx-gap-v-m box-pad-h-m box-pad-v-m round-corner-m border-all">
        <div className="fx-centered fx-col">
          <h1>{t("AHhPGax")}</h1>
          <p className="box-pad-h p-centered p-secondary-c">{t("AOsxQxu")}</p>
        </div>
        <Select
          options={StripeSupportedCountries}
          value={selectedCountry}
          onChange={setSelectedCountry}
          full={true}
        />
        <div className="fit-container">
          <p className="gray-c">{t("AOsxQxu")}</p>

          {capabilities.map((_) => {
            return <p>+ {caps[_]}</p>;
          })}
        </div>
        <Button
          size="m"
          type="primary"
          disabled={!selectedCountry}
          loading={loading}
          full={true}
          onClick={enableStripeAccount}
          label={t("A1jhS42")}
        />
      </div>
    </Overlay>
  );
}
