import React, { useEffect, useRef } from "react";

export default function TextArea({
  placeholder,
  value,
  onChange,
  disabled,
  className = "",
  onKeyDown = () => null,
  style = {},
  maxHeight = "300px",
  minHeight = "120px",
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  };

  const handleOnChange = (e) => {
    let val = e.target.value;
    onChange && onChange(val);
  };

  return (
    <textarea
      ref={textareaRef}
      placeholder={placeholder}
      value={value}
      onChange={!disabled ? handleOnChange : undefined}
      disabled={disabled}
      className={`txt-area fit-container ${className}`}
      onKeyDown={onKeyDown}
      style={{
        maxHeight,
        minHeight,
        maxWidth: "100%",
        minWidth: "100%",
        ...style,
      }}
    />
  );
}
