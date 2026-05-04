import React from "react";

export default function Checkbox({
  label,
  id,
  isSelected,
  setIsSelected,
  disabled,
  className = "",
  style = {},
}) {
  return (
    <label
      className={`fit-container round-corner border-all box-pad-h-m box-pad-v-m fx-centered fx-start-h fx-gap-h-l ${
        disabled ? "" : "bg-hover"
      } ${className}`}
      style={{
        borderColor: isSelected ? "var(--v5-c1)" : "var(--v5-pale-gray)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        ...style,
      }}
      onClick={() => (disabled ? null : setIsSelected(id))}
    >
      <div
        style={{
          minHeight: "18px",
          minWidth: "18px",
          backgroundColor: isSelected
            ? "var(--v5-c1)"
            : "var(--v5-very-dim-gray)",
          borderColor: isSelected ? "var(--v5-c1)" : "var(--v5-pale-gray)",
          transition: "all 0.2s ease-in-out",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
        className="round-corner-s border-all"
      >
        {isSelected && (
           <div style={{ width: '8px', height: '8px', backgroundColor: 'white', borderRadius: '2px' }} />
        )}
      </div>
      <p className={`p-medium ${disabled ? "p-placeholder-c" : ""}`} style={{ margin: 0 }}>
        {label}
      </p>
    </label>
  );
}
