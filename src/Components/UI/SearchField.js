import Icon from "@/Components/LucideIcon";
import useCloseContainer from "@/hooks/useCloseContainer";
import React from "react";
import { useTranslation } from "react-i18next";

export default function SearchField({
  spreadField = false,
  searchValue,
  setSearchValue,
  placeholder,
  className = "",
  style = {},
}) {
  const { t } = useTranslation();
  const { containerRef, isContainerOpened, setIsContainerOpened } =
    useCloseContainer(spreadField || !!searchValue);

  return (
    <div
      ref={containerRef}
      className={`fx-centered ${
        isContainerOpened ? "fx-start-h" : ""
      } border-all round-corner ${
        !isContainerOpened ? "bg-hover pointer" : ""
      } ${className}`}
      style={{
        padding: "8px 12px",
        height: "44px",
        width: isContainerOpened ? "300px" : "44px",
        overflow: "hidden",
        transition: "width 0.2s ease-in-out",
        ...style,
      }}
      onClick={() => setIsContainerOpened(true)}
    >
      <Icon name="search" size={20} />
      {isContainerOpened && (
        <input
          type="text"
          style={{
            border: "none",
            padding: "0 0 0 12px",
            height: "100%",
            background: "transparent",
            outline: "none",
            fontSize: '1rem'
          }}
          placeholder={placeholder || t("search") || "Search..."}
          value={searchValue}
          className="fit-container"
          onChange={(e) => setSearchValue(e.target.value)}
          autoFocus={!spreadField}
        />
      )}
    </div>
  );
}
