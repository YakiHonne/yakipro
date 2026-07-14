import React from "react";
import { useTranslation } from "react-i18next";
import Icon from "@/Components/LucideIcon";
import Button from "./UI/Button";
import Overlay from "./Overlay";

export default function DeleteWarning({
  title,
  description,
  exit,
  handleDelete,
  actionButtonLabel,
}) {
  const { t } = useTranslation();
  return (
    <Overlay exit={exit} width={450}>
      <div className="fx-centered fx-col box-pad-h box-pad-v fx-gap-v-m">
        <Icon name="warning" size={54} isColored />

        {title && (
          <h3 className="p-centered" style={{ wordBreak: "break-word" }}>
            {title}
          </h3>
        )}
        {description && <p className="p-centered gray-c ">{description}</p>}
        <div className="fx-centered fit-container fx-gap-h">
          <Button
            label={actionButtonLabel || t("Almq94P")}
            type="red"
            size="m"
            onClick={handleDelete}
            full={true}
          />
          <Button
            label={t("AepwLlB")}
            type="gst"
            size="m"
            onClick={exit}
            full={true}
          />
        </div>
      </div>
    </Overlay>
  );
}
