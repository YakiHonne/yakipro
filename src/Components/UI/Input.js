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
      // Allow only digits and decimal point
      val = val.replace(/[^0-9.]/g, "");

      // Prevent multiple decimal points
      const parts = val.split(".");
      if (parts.length > 2) {
        val = parts[0] + "." + parts.slice(1).join("");
      }

      // Remove leading zeros ("01" -> "1") but preserve "0.x"
      if (val.length > 1 && val.startsWith("0") && val[1] !== ".") {
        val = val.replace(/^0+/, "");
      }

      // If the value is a valid numeric string, we convert to number
      // but we skip the conversion if it ends with "." to allow typing "1."
      if (val !== "" && !val.endsWith(".")) {
        onChange && onChange(parseFloat(val));
      } else {
        // Pass empty string or "0" if that's the current state
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
