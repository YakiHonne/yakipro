import React from "react";

export default function Input({
  type = "text",
  placeholder,
  value,
  onChange,
  disabled = false,
  noBorder = false,
  large = false,
  full = true,
  className = "",
  style = {},
  ...props
}) {
  const handleOnChange = (e) => {
    let val = e.target.value;
    if (type === "number") {
      val = val.replace(/[^0-9.]/g, "");

      const parts = val.split(".");
      if (parts.length > 2) {
        val = parts[0] + "." + parts.slice(1).join("");
      }

      if (val.length > 1 && val.startsWith("0") && val[1] !== ".") {
        val = val.replace(/^0+/, "");
      }

      if (val !== "" && !val.endsWith(".")) {
        onChange && onChange(parseFloat(val));
      } else {
        onChange && onChange(val === "" ? "" : val);
      }
    } else {
      onChange && onChange(val);
    }
  };

  const handleKeyDown = (e) => {
    if (type === "number" && e.key === "e") {
      e.preventDefault();
    }
  };

  return (
    <input
      type={type === "number" ? "text" : type}
      inputMode={type === "number" ? "decimal" : undefined}
      placeholder={placeholder}
      value={value}
      onChange={!disabled ? handleOnChange : undefined}
      onKeyDown={!disabled ? handleKeyDown : undefined}
      className={`if ${full ? "fit-container" : ""} ${disabled ? "if-disabled" : ""} ${
        noBorder ? "no-border" : ""
      } ${large ? "if-large" : ""} ${className}`}
      disabled={disabled}
      style={style}
      {...props}
    />
  );
}
