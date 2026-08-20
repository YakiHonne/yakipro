import React, { useMemo } from "react";
import DropDown from "./DropDown";
import Icon from "@/Components/LucideIcon";

export default function Select({
  options = [],
  value,
  onChange,
  placeholder,
  disabled = false,
  full = false,
  className = "",
  style = {},
  isColoredIcons = false,
  label = false,
}) {
  const selectedOption = useMemo(() => {
    if (!value) return null;
    const option = options.find((opt) => opt.value === value);
    return option ? option.display_name : null;
  }, [value, options]);

  const optionsList = options.map((option) => (
    <div
      key={option.value}
      onClick={() => onChange && onChange(option.value)}
      className="pointer fx-scattered fit-container option-no-scale"
      style={{ padding: "10px", borderRadius: "10px" }}
    >
      <div className="fx-centered fx-start-h fx-gap-h">
        {option.left_el
          ? option.left_el
          : option.iconLeft && (
              <Icon
                name={option.iconLeft}
                size={16}
                isColored={isColoredIcons}
              />
            )}
        <div className={value === option.value ? "p-primary-c" : "gray-c"}>
          {option.display_name}
        </div>
      </div>
      {option.iconRight && <Icon name={option.iconRight} size={16} isColored={isColoredIcons} />}
    </div>
  ));

  return (
    <DropDown options={optionsList} full={full} disabled={disabled}>
      <div
        className={`if fx-col fx-start-v pointer ${disabled ? "if-disabled" : "bg-hover"
          } ${className}`}
        style={{
          width: full ? "100%" : "auto",
          height: "auto",
          minHeight: label ? "auto" : "2.5rem",
          padding: ".5rem 1rem",
          gap: label ? 0 : "4px",
          justifyContent: "center",
          ...style,
        }}
      >
        {label && (
          <p className="gray-c p-medium" style={{ margin: 0 }}>
            {label}
          </p>
        )}
        <div className="fit-container fx-scattered" style={{ gap: "8px" }}>
          <div>{selectedOption || placeholder || "Select..."}</div>
          <Icon name="arrow" size={12} />
        </div>
      </div>
    </DropDown>
  );
}
