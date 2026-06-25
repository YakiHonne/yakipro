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
    useCloseContainer(true, [menuRef]);
  const [optionsPosition, setOptionsPosition] = useState("bottom");
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
  });
  const [mounted, setMounted] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMobile = mounted && window.innerWidth <= 768;

  const closeMenu = () => {
    if (isMobile) {
      setIsContainerOpened(false);
      return;
    }
    setDismissing(true);
    setTimeout(() => {
      setIsContainerOpened(false);
      setDismissing(false);
    }, 180);
  };

  useEffect(() => {
    if (!isContainerOpened) return;

    const handleClick = (e) => {
      if (
        !containerRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isContainerOpened, isMobile]);

  useEffect(() => {
    if (!isContainerOpened || isMobile) return;

    const handleScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    const handleResize = () => closeMenu();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isContainerOpened, isMobile]);

  const handleDropdownToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (isContainerOpened) {
      closeMenu();
      return;
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const distanceFromBottom = window.innerHeight - rect.bottom;
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
    setIsContainerOpened(true);
  };

  useEffect(() => {
    if (isContainerOpened && menuRef.current) {
      menuRef.current.scrollTop = 0;
    }
  }, [isContainerOpened]);

  const getDropdownStyles = () => {
    if (isMobile) {
      return {
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 1000002,
        borderRadius: "20px 20px 0 0",
        maxHeight: "60dvh",
      };
    }

    const style = {
      position: "fixed",
      left: `${coords.left}px`,
      minWidth: `${coords.width}px`,
      zIndex: 1000002,
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
            zIndex: 1000001,
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeMenu();
          }}
        />
      )}
      <div
        ref={menuRef}
        style={
          isMobile
            ? { ...getDropdownStyles(), overflowY: "auto" }
            : { ...getDropdownStyles(), overflowY: "auto", overflowX: "hidden" }
        }
        className={
          isMobile
            ? "slide-up"
            : `bg-dropdown-t di-wrapper${dismissing ? " dismissing" : ""}${optionsPosition === "top" ? " origin-bottom" : ""}`
        }
        onClick={(e) => {
          e.stopPropagation();
          if (e.target !== menuRef.current) {
            closeMenu();
          }
        }}
      >
        <div className="box-pad-h-s box-pad-v-s fx-centered fx-col fx-start-v">
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
