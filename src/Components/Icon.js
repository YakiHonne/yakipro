import { getIcon } from "@/Content/AssetsURLs";
import { getIconv2 } from "@/Content/IconV2URL";
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
  v = 1,
  isBoldThemeColor = false,
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const iconWidth = width || size || 16;
  const iconHeight = height || size || 16;
  const icon = v === 2 ? getIconv2(name) : getIcon(name);

  if (!icon) return null;

  const currentTheme = mounted ? resolvedTheme : "light";
  const isDark = ["dark", "gray", "dark-gray"].includes(currentTheme);

  return (
    <div
      onClick={onClick && onClick}
      className={`${className} ${isBoldThemeColor ? "bold-icon" : ""}`}
      style={{
        backgroundSize: "contain",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        transition: ".2s ease-in-out",
        minWidth: iconWidth,
        minHeight: iconHeight,
        width: iconWidth,
        height: iconHeight,
        opacity: opacity,
        filter: !isColored && !isBoldThemeColor
          ? isDark
            ? "brightness(0) invert()"
            : "brightness(0)"
          : "",
        transform,
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
        ...(isBoldThemeColor
          ? { maskImage: `url(${icon})`, WebkitMaskImage: `url(${icon})` }
          : { backgroundImage: `url(${icon})` }),
      }}
    />
  );
}
