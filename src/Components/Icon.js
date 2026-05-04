import { getIcon } from "@/Content/AssetsURLs";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Icon({
  name,
  size,
  width,
  height,
  isColored = false,
  onClick,
  transform = "unset",
  className = "",
  opacity = "initial",
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const iconWidth = width || size || 16;
  const iconHeight = height || size || 16;
  const icon = getIcon(name);

  if (!icon) return null;

  // Final theme determination
  const currentTheme = mounted ? resolvedTheme : "light";
  const isDark = ["dark", "gray", "dark-gray"].includes(currentTheme);

  return (
    <div
      onClick={onClick && onClick}
      className={className}
      style={{
        backgroundImage: `url(${icon})`,
        backgroundSize: "contain",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        transition: ".2s ease-in-out",
        minWidth: iconWidth,
        minHeight: iconHeight,
        width: iconWidth,
        height: iconHeight,
        opacity: opacity,
        filter: !isColored
          ? isDark
            ? "brightness(0) invert()"
            : "brightness(0)"
          : "",
        transform,
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
      }}
    />
  );
}
