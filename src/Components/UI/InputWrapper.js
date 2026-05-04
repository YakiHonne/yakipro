import React from "react";

export default function InputWrapper({ children, rightLabel }) {
  return (
    <div className="fit-container pos-relative">
      {children}
      {rightLabel && (
        <span className="pos-absolute pos-right-0 pos-top-0 fx-centered fit-height">
          <div className="box-pad-h-m">{rightLabel}</div>
        </span>
      )}
    </div>
  );
}
