import React, { useMemo, useRef, useEffect, useCallback } from "react";
export function SelectTabs({ selectedTab, tabs, setSelectedTab, small = false }) {
  const containerRef = useRef(null);
  const sliderRef = useRef(null);
  const buttonRefs = useMemo(() => {
    return tabs.map((tab) => ({
      display_name: tab,
      ref: React.createRef(),
    }));
  }, [tabs]);

  const updateSlider = useCallback(() => {
    const selectedButton = buttonRefs[selectedTab]?.ref?.current;
    const slider = sliderRef.current;
    const container = containerRef.current;

    if (selectedButton && slider && container) {
      const { width, left } = selectedButton.getBoundingClientRect();
      const containerLeft = container.getBoundingClientRect().left;
      const remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

      slider.style.width = `${width / remSize}rem`;
      slider.style.transform = `translateX(${(left - containerLeft + container.scrollLeft) / remSize}rem)`;
    }
  }, [selectedTab, buttonRefs]);

  useEffect(() => {
    updateSlider();
  }, [updateSlider]);

  useEffect(() => {
    buttonRefs[selectedTab]?.ref?.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e) => {
      isDown = true;
      container.style.cursor = "grabbing";
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    };
    const onMouseLeave = () => {
      isDown = false;
      container.style.cursor = "grab";
    };
    const onMouseUp = () => {
      isDown = false;
      container.style.cursor = "grab";
    };
    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = x - startX;
      container.scrollLeft = scrollLeft - walk;
      updateSlider();
    };

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mouseleave", onMouseLeave);
    container.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mousemove", onMouseMove);

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("mouseleave", onMouseLeave);
      container.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("mousemove", onMouseMove);
    };
  }, [updateSlider]);

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <div
        ref={containerRef}
        style={{
          gap: 0,
          position: "relative",
          minHeight: small ? "2rem" : "2.8rem",
          padding: small ? ".2rem" : "0 .45rem",
          overflowX: "auto",
          overflowY: "hidden",
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "center",
          cursor: "grab",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          borderRadius: "40px",
          backgroundColor: "var(--color-glass-bg)",
          boxShadow: "var(--color-glass-shadow)",
          transition: "background-color var(--transition-normal), box-shadow var(--transition-normal)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        {buttonRefs.map((button, index) => (
          <div
            className="box-pad-h pointer"
            style={{
              position: "relative",
              zIndex: 1,
              flexShrink: 0,
              whiteSpace: "nowrap",
              userSelect: "none",
              color:
                selectedTab !== index
                  ? "var(--color-text-on-glass-muted)"
                  : "var(--color-text-on-glass)",
              transition: "color 0.2s ease",
            }}
            key={index}
            ref={button.ref}
            onClick={() => setSelectedTab(index)}
          >
            {button.display_name}
          </div>
        ))}
        {selectedTab !== -1 && (
          <div
            ref={sliderRef}
            className="button-slider fit-height"
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
              className="fit-container fit-height"
              style={{
                backgroundColor: "var(--color-glass-slider)",
                borderRadius: "40px",
                transition: "background-color var(--transition-normal)"
              }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
