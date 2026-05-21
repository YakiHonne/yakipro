import React, { useMemo } from "react";
import DropDown from "./DropDown";
import Icon from "@/Components/Icon";

export default function Select({
  options = [],
  value,
  onChange,
  placeholder,
  disabled = false,
  full = false,
  className = "",
  style = {},
  isColoredIcons = false
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
      className="options-item"
      style={{ cursor: "pointer", padding: "10px 16px" }}
    >
      <div className="fx-centered fx-start-h fx-gap-h">
        {option.iconLeft && <Icon name={option.iconLeft} size={16} isColored={isColoredIcons} />}
        <p
          className={` ${value === option.value ? "orange-c" : "gray-c"}`}
          style={{ margin: 0 }}
        >
          {option.display_name}
        </p>
      </div>
      {option.iconRight && <Icon name={option.iconRight} size={16} isColored={isColoredIcons} />}
    </div>
  ));

  return (
    <DropDown options={optionsList} full={full} disabled={disabled}>
      <div
        className={`if fx-gap-h-l fx-scattered pointer ${disabled ? "if-disabled" : "bg-hover"
          } ${className}`}
        style={{
          width: full ? "100%" : "auto",
          ...style,
        }}
      >
        <p style={{ margin: 0 }}>
          {selectedOption || placeholder || "Select..."}
        </p>
        <Icon name="arrow" size={12} />
      </div>
    </DropDown>
  );
}
