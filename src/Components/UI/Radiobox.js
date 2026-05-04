import React from "react";

export default function Radiobox({
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
      className={`fit-container round-corner border-all box-pad-h-m box-pad-v-s fx-centered fx-start-h fx-gap-h-l ${
        disabled ? "" : "bg-hover"
      } ${className}`}
      style={{
        borderColor: isSelected ? "var(--v5-c1)" : "var(--v5-pale-gray)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.8 : 1,
        ...style,
      }}
      onClick={() => (disabled ? null : setIsSelected(id))}
    >
      <div
        style={{
          height: "18px",
          width: "18px",
          backgroundColor: isSelected ? "var(--v5-c1)" : "var(--v5-very-dim-gray)",
          borderColor: isSelected ? "var(--v5-c1)" : "var(--v5-pale-gray)",
          padding: "4px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transition: "all 0.2s ease-in-out",
        }}
        className="round-corner-xl border-all"
      >
        {isSelected && (
          <div
            style={{
              backgroundColor: "white",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
            }}
          ></div>
        )}
      </div>
      <p className="p-medium" style={{ margin: 0 }}>{label}</p>
    </label>
  );
}
