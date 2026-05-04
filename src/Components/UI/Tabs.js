import React, { useMemo, useRef, useEffect } from "react";

export function Tabs({ selectedTab, tabs, setSelectedTab, small = false }) {
  const sliderRef = useRef(null);
  const buttonRefs = useMemo(() => {
    return tabs.map((tab) => ({
      display_name: tab,
      ref: React.createRef(),
    }));
  }, [tabs]);

  useEffect(() => {
    const selectedButton = buttonRefs[selectedTab]?.ref?.current;
    const slider = sliderRef.current;

    if (selectedButton && slider) {
      const { width } = selectedButton.getBoundingClientRect();
      const offsetLeft = selectedButton.offsetLeft;
      const remSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize || "16"
      );

      slider.style.width = `${width / remSize}rem`;
      slider.style.transform = `translateX(${offsetLeft / remSize}rem)`;
    }
  }, [selectedTab, buttonRefs]);

  return (
    <div
      className="fx-centered fx-start-h border-all round-corner box-pad-v-s no-scrollbar"
      style={{
        gap: 0,
        position: "relative",
        height: small ? "2rem" : "3.4rem",
        padding: small ? ".2rem" : "0 .45rem",
        overflowX: "auto",
        overflowY: "hidden",
        maxWidth: "100%",
        width: "max-content",
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch"
      }}
    >
      {buttonRefs.map((button, index) => (
        <div
          className={`box-pad-h pointer`}
          style={{ position: "relative", zIndex: 1, flexShrink: 0, whiteSpace: "nowrap" }}
          key={index}
          ref={button.ref}
          onClick={() => setSelectedTab(index)}
        >
          <p
            className={`p-medium p-bold ${selectedTab !== index ? "p-secondary-c" : "p-primary-c"}`}
            style={{ transition: ".2s ease-in-out", margin: 0 }}
          >
            {button.display_name}
          </p>
        </div>
      ))}
      <div
        ref={sliderRef}
        className="fit-height"
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          zIndex: 0,
          transition: ".2s ease-in-out",
          padding: small ? ".2rem 0" : ".45rem 0",
        }}
      >
        <div
          className="fit-container fit-height round-corner"
          style={{
            backgroundColor: "var(--color-primary-bg-side2)",
          }}
        ></div>
      </div>
    </div>
  );
}
