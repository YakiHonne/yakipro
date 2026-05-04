import useCloseContainer from "@/hooks/useCloseContainer";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function DropDown({
  options = [],
  children,
  full = false,
  disabled,
}) {
  const menuRef = useRef(null);
  const { containerRef, isContainerOpened, setIsContainerOpened } =
    useCloseContainer(false, [menuRef]);
  const [optionsPosition, setOptionsPosition] = useState("bottom");
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDropdownToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (!isContainerOpened && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const distanceFromBottom = window.innerHeight - rect.bottom;
      // Estimate height: 40px per option + some padding
      const menuHeight = 40 * options.length;
      const pos = distanceFromBottom < menuHeight ? "top" : "bottom";

      setOptionsPosition(pos);
      setCoords({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
      });
    }
    setIsContainerOpened((prev) => !prev);
  };

  const isMobile = mounted && window.innerWidth <= 768;

  const getDropdownStyles = () => {
    if (isMobile) {
      return {
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 6000,
        backgroundColor: "var(--color-primary-bg)",
        borderTopLeftRadius: "24px",
        borderTopRightRadius: "24px",
        padding: "16px 16px 32px 16px",
        boxShadow: "0 -4px 10px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        maxHeight: "60dvh",
        overflowY: "auto",
      };
    }

    const style = {
      position: "fixed",
      left: `${coords.left}px`,
      minWidth: `${coords.width}px`,
      zIndex: 2000,
      backgroundColor: "var(--color-primary-bg)",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      borderRadius: "8px",
      border: "1px solid var(--color-divider)",
      overflowY: "auto",
    };

    if (optionsPosition === "bottom") {
      style.top = `${coords.bottom + 5}px`;
      style.maxHeight = `${Math.min(400, window.innerHeight - coords.bottom - 20)}px`;
    } else {
      style.bottom = `${window.innerHeight - coords.top + 5}px`;
      style.maxHeight = `${Math.min(400, coords.top - 20)}px`;
    }

    return style;
  };

  const menuContent = isContainerOpened && (
    <>
      {isMobile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 5999,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsContainerOpened(false);
          }}
        />
      )}
      <div
        ref={menuRef}
        style={getDropdownStyles()}
        className={isMobile ? "slide-up" : "fade-in"}
        onClick={(e) => {
          e.stopPropagation();
          if (e.target !== menuRef.current) {
            setIsContainerOpened(false);
          }
        }}
      >
        {isMobile && (
          <div className="fx-centered" style={{ paddingBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "4px",
                backgroundColor: "var(--color-divider)",
                borderRadius: "4px",
              }}
            ></div>
          </div>
        )}
        {options.map((option, index) => (
          <div key={index} className="fit-container">
            {option}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div
      style={{ position: "relative" }}
      ref={containerRef}
      className={full ? "fit-container" : "fit-content"}
    >
      <div onClick={handleDropdownToggle}>{children}</div>
      {mounted &&
        createPortal(
          menuContent,
          document.querySelector("#__next") || document.body,
        )}
    </div>
  );
}
