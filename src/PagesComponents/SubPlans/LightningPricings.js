import Icon from "@/Components/LucideIcon";
import Button from "@/Components/UI/Button";
import Input from "@/Components/UI/Input";
import InputWrapper from "@/Components/UI/InputWrapper";
import HorizontalScrollWrapper from "@/Components/UI/HorizontalScrollWrapper";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import NumberShrink from "@/Components/NumberShrink";
import Select from "@/Components/UI/Select";
import PricingInterval from "@/Content/PricingInterval";

export default function LightningPricings({
  currency,
  setLightningPricings,
  lightningPricings,
}) {
  const { t } = useTranslation();
  const [pricing, setPricing] = useState(lightningPricings);
  const [tempName, setTempName] = useState("");
  const [tempAmount, setTempAmount] = useState("");
  const [tempDiscount, setTempDiscount] = useState("");
  const [selectedInterval, setSelectedInterval] = useState(
    PricingInterval[0].value,
  );

  const handleAddPricing = () => {
    if (!tempName || !tempAmount) return;
    let temp = [
      ...pricing,
      {
        name: tempName,
        amount: tempAmount,
        discount: tempDiscount || 0,
        interval: selectedInterval,
      },
    ];
    setPricing(temp);
    setLightningPricings(temp);
    setTempName("");
    setTempAmount("");
    setTempDiscount("");
  };

  const handleRemovePricing = (index) => {
    let temp = pricing.filter((_, i) => i !== index);
    setPricing(temp);
    setLightningPricings(temp);
  };

  return (
    <div className=" border-all round-corner-m">
      <div className="fit-container fx-col fx-start-h fx-start-v box-pad-h-m box-pad-v-m border-bottom">
        <div className="fx-centered fx-gap-h-m">
          <h4>{t("Aag9u1h")}</h4>
          <div className="box-pad-h-s border-all round-corner-m fx-centered fx-gap-h bg-hover pointer">
            <p>{currency}</p>
          </div>
        </div>
        <p className="p-primary-c">{t("AMvUjqZ")}</p>
      </div>
      <div className="box-pad-h-m box-pad-v-m border-bottom fx-scattered fx-end-v fx-gap-h">
        <div className="fx-1">
          <p className="p-secondary-c">{t("A89Qqmt")}</p>
          <Input
            type="text"
            placeholder={t("A89Qqmt")}
            value={tempName}
            onChange={setTempName}
          />
        </div>
        <div className="fx-1">
          <p className="p-secondary-c">{t("A4ZQj8F")}</p>
          <Input
            type="number"
            placeholder={0}
            value={tempAmount}
            onChange={setTempAmount}
          />
        </div>
        <div className="fx-1">
          <p className="p-secondary-c">{t("A6enIP3")}</p>
          <InputWrapper rightLabel={"%"}>
            <Input
              type="number"
              placeholder={0}
              value={tempDiscount}
              onChange={setTempDiscount}
            />
          </InputWrapper>
        </div>
        <div className="fx-1">
          <p className="p-secondary-c">{t("Ar5VgpT")}</p>
          <Select
            options={PricingInterval}
            value={selectedInterval}
            onChange={setSelectedInterval}
            full={true}
          />
        </div>
        <div className="fx-1 fx-end-v fx">
          <p className="p-secondary-c"> </p>
          <Button
            iconTransform={"scale(.8)"}
            rightIcon={"plus"}
            label={t("AKvHyxG")}
            size="m"
            type="gray"
            full={true}
            onClick={handleAddPricing}
          />
        </div>
      </div>
      <div className="fit-container">
        {pricing.length === 0 && (
          <div
            className="fit-container fx-centered"
            style={{ height: "150px" }}
          >
            <p className="p-secondary-c">{t("A04okTg")}</p>
          </div>
        )}
        {pricing.length > 0 && (
          <HorizontalScrollWrapper>
            {pricing.map((item, index) => {
              return (
                <div
                  className="fx-centered fx-col fx-start-h fx-start-v fx-gap-v box-pad-h-m box-pad-v-m round-corner-l border-all fx-shrink"
                  style={{ width: "280px" }}
                >
                  <div className="fit-container fx-scattered">
                    <div
                      className="box-pad-h-m p-caps border-all round-corner-m fx-centered fx-gap-h bg-hover pointer"
                      style={{ padding: ".25rem 1rem" }}
                    >
                      {item.name}
                    </div>

                    <Icon
                      name={"trash"}
                      size={20}
                      onClick={() => handleRemovePricing(index)}
                    />
                  </div>
                  <div className="fx-centered fx-gap-h fx-start-h">
                    <p className="p-secondary-c">SATS</p>
                    <h2 className="plan-price">
                      <NumberShrink value={item.amount} />
                    </h2>
                    <p className="p-secondary-c">/ {item.interval}</p>
                  </div>

                  {item.discount > 0 && (
                    <h4 className="p-primary-c">{12}% Off</h4>
                  )}
                </div>
              );
            })}
          </HorizontalScrollWrapper>
        )}
      </div>
    </div>
  );
}
