import React from "react";
import { useDispatch } from "react-redux";
import { setToast } from "@/Store/Slices/Extras";
import Icon from "@/Components/LucideIcon";
import Overlay from "@/Components/Overlay";

export default function RawEventDisplay({ event, exit }) {
  const dispatch = useDispatch();
  const json = JSON.stringify(event?.rawEvent() || event, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    dispatch(setToast({ type: 1, desc: "Raw event copied" }));
  };

  return (
    <Overlay exit={exit} width={560}>
      <div
        className="box-pad-h box-pad-v fx-col"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          className="close pos-absolute pos-top-16 pos-right-16 box-pad-s"
          onClick={exit}
        >
          <div />
        </div>

        <div className="fx-centered ">
          <h3>Raw event</h3>
        </div>

        <div
          className="fit-container sc-s-18 bg-sp box-pad-h-m box-pad-v-m fx-col fx-start-v"
          style={{ gap: 6 }}
        >
          <div className="fx-centered fx-start-h" style={{ gap: 8 }}>
            <span className="gray-c ">Kind:</span>
            <span className="p-bold">{event.kind}</span>
          </div>

          <div className="fx-centered fx-start-h" style={{ gap: 8 }}>
            <span className="gray-c ">Created:</span>
            <span className="">
              {new Date(event.created_at * 1000).toLocaleString()}
            </span>
          </div>
        </div>

        <div
          className="fit-container sc-s-18 bg-sp"
          style={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <div
            className="sc-s-18 box-pad-v-s box-pad-h-m fit-container fx-scattered"
            style={{
              position: "sticky",
              top: 0,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              border: "none",
              zIndex: 1,
            }}
          >
            <span className="gray-c p-italic ">json</span>
            <div className="round-icon-small pointer" onClick={handleCopy}>
              <Icon name="copy" size={16} />
            </div>
          </div>

          <pre
            style={{
              margin: 0,
              padding: "12px 16px 16px",
              fontSize: "0.75rem",
              lineHeight: 1.6,
              overflowY: "auto",
              maxHeight: "40vh",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              fontFamily: "ui-monospace, 'Fira Code', monospace",
            }}
          >
            {json}
          </pre>
        </div>
      </div>
    </Overlay>
  );
}
