import Icon from "@/Components/LucideIcon";
import Button from "@/Components/UI/Button";
import Input from "@/Components/UI/Input";
import InputWrapper from "@/Components/UI/InputWrapper";
import Select from "@/Components/UI/Select";
import HorizontalScrollWrapper from "@/Components/UI/HorizontalScrollWrapper";
import PricingInterval from "@/Content/PricingInterval";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import NumberShrink from "@/Components/NumberShrink";
import DeleteWarning from "@/Components/DeleteWarning";

export default function StableCoinsPricings({
  setScPricings,
  handleArchivePrice,
}) {
  const { t } = useTranslation();
  const [selectedInterval, setSelectedInterval] = useState(
    PricingInterval[0].value,
  );
  const [pricing, setPricing] = useState([]);
  const [tempName, setTempName] = useState("");
  const [tempAmount, setTempAmount] = useState("");
  const [tempDiscount, setTempDiscount] = useState("");
  const [initiateRemoval, setInitiateRemoval] = useState(false);

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
    setScPricings(temp);
    setTempName("");
    setTempAmount("");
    setTempDiscount("");
    setSelectedInterval(PricingInterval[0].value);
  };

  const handleRemovePricing = (index) => {
    let temp = pricing.filter((_, i) => i !== index);
    setPricing(temp);
    setScPricings(temp);
  };

  return (
    <>
      {initiateRemoval && (
        <DeleteWarning
          title={t("AAZJZMU")}
          description={t("AJDdA3h")}
          exit={() => setInitiateRemoval(false)}
          handleDelete={() => {
            handleArchivePrice({ method: "crypto", price_id: initiateRemoval });
            setInitiateRemoval(false);
          }}
          actionButtonLabel={t("ADuKAP4")}
        />
      )}

      <div className=" border-all round-corner-m">
        <div className="fit-container fx-scattered box-pad-h-m box-pad-v-m border-bottom">
          <div className="fx-centered fx-gap-h-m">
            <h4>{t("AghKyAt")}</h4>
          </div>
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
                    className="fx-centered fx-col fx-start-h fx-start-v fx-gap-v box-pad-h-m box-pad-v-m round-corner-l fx-shrink border-all"
                    style={{ width: "280px" }}
                  >
                    <div className="fit-container fx-scattered">
                      <div
                        className="box-pad-h-m p-caps border-all round-corner-m fx-centered fx-gap-h bg-hover pointer"
                        style={{ padding: ".25rem 1rem" }}
                      >
                        {item.name}
                      </div>
                      {!item.id && (
                        <Icon
                          name={"trash"}
                          size={20}
                          onClick={() => handleRemovePricing(index)}
                        />
                      )}
                      {item.id && (
                        <Button
                          label={t("ADuKAP4")}
                          size="s"
                          type="primary"
                          onClick={() => setInitiateRemoval(item.id)}
                        />
                      )}
                    </div>
                    <div className="fx-centered fx-gap-h fx-start-h">
                      <p className="p-secondary-c">{item.currency}</p>
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
    </>
  );
}
