import EmojiPicker from "emoji-picker-react";
import { useTheme } from "next-themes";
import React, { useEffect, useRef, useState } from "react";
import Icon from "@/Components/Icon";

export default function Emojis({ setEmoji }) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = ["dark", "gray"].includes(resolvedTheme);
  const [showEmoji, setShowEmoji] = useState(false);
  const optionsRef = useRef(null);

  useEffect(() => {
    const handleOffClick = (e) => {
      e.stopPropagation();
      if (optionsRef.current && !optionsRef.current.contains(e.target))
        setShowEmoji(false);
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => document.removeEventListener("mousedown", handleOffClick);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={optionsRef}>
      <div className="pointer fx-centered" onClick={() => setShowEmoji(!showEmoji)}>
        <Icon name="emoji" size={24} />
      </div>
      {showEmoji && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            zIndex: 200,
          }}
        >
          <EmojiPicker
            theme={isDarkMode ? "dark" : "light"}
            previewConfig={{ showPreview: false }}
            skinTonesDisabled={true}
            searchDisabled={false}
            height={300}
            onEmojiClick={(data) => {
              setEmoji(data.emoji);
              setShowEmoji(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
