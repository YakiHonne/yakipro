import React from "react";

export default function Spinner({ size = 20, color = "var(--color-primary-text)" }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid rgba(255, 255, 255, 0.25)",
        borderTopColor: color,
        borderRadius: "50%",
        animation: "login-spin 0.7s linear infinite",
        verticalAlign: "middle",
      }}
    />
  );
}
