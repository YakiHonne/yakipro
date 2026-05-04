import React, { useEffect, useRef, useState } from "react";
import { Grid } from "@giphy/react-components";
import { GiphyFetch } from "@giphy/js-fetch-api";
import Icon from "@/Components/Icon";

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || "");

export default function Gifs({ setGif, exit }) {
  const ref = useRef(null);
  const [search, setSearch] = useState("");
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (ref.current) setWidth(ref.current.offsetWidth);
  }, []);

  useEffect(() => {
    const handleOffClick = (e) => {
      e.stopPropagation();
      if (ref.current && !ref.current.contains(e.target)) exit();
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => document.removeEventListener("mousedown", handleOffClick);
  }, []);

  const fetchGifs = (offset) =>
    gf.search(search || "trending", { offset, limit: 10 });

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: 0,
        width: "380px",
        maxHeight: "320px",
        overflow: "scroll",
        zIndex: 200,
        borderRadius: "12px",
      }}
      className="border-all bg-main-c no-scrollbar"
    >
      <div
        className="fit-container box-pad-h-s box-pad-v-s bg-main-c"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        <div className="fx-centered border-all round-corner fit-container ">
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Search GIFs..."
            className="if ifs-full"
            onChange={(e) => setSearch(e.target.value)}
            value={search}
            style={{
              paddingLeft: "6px",
              height: "36px",
              fontSize: "0.85rem",
              border: "none",
            }}
            autoFocus
          />
          {search && (
            <div
              className="pointer"
              onClick={() => setSearch("")}
              style={{ padding: "2px" }}
            >
              <Icon name="crossmark-tt" size={12} />
            </div>
          )}
        </div>
      </div>
      <Grid
        width={width || 196}
        columns={3}
        fetchGifs={fetchGifs}
        key={search}
        onGifClick={(data, e) => {
          e.preventDefault();
          setGif(data.images.original.url);
          exit();
        }}
        hideAttribution={true}
      />
    </div>
  );
}
