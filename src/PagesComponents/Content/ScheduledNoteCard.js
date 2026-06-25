import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { getNoteTree } from "@/Components/NotePreview";
import DropDown from "@/Components/UI/DropDown";
import Icon from "@/Components/Icon";
import DeleteWarning from "@/Components/DeleteWarning";
import { setToast } from "@/Store/Slices/Extras";
import { cancelScheduledEvent } from "@/Helpers/EventSchedulerHelper";

const fmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const ThreeDots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

function OptionItem({ icon, label, danger, onClick }) {
  return (
    <div
      className="pointer fx-centered fx-start-h fit-container box-pad-h-s box-pad-v-s option-no-scale"
      onClick={onClick}
    >
      <Icon name={icon} size={24} isColored={danger} />
      <p className={danger ? "p-red-c" : ""}>{label}</p>
    </div>
  );
}

export default function ScheduledNoteCard({ job, onCancelled }) {
  const dispatch = useDispatch();
  const event = job.notePreview;
  const [showCancel, setShowCancel] = useState(false);

  const handleCancel = async () => {
    setShowCancel(false);
    const success = await cancelScheduledEvent({
      jobId: job.jobId,
      relays: event.relays,
    });
    if (success) {
      dispatch(setToast({ type: 1, desc: "Scheduled note cancelled" }));
      onCancelled?.(job.jobId);
    } else {
      dispatch(setToast({ type: 2, desc: "Failed to cancel scheduled note" }));
    }
  };

  const menuOptions = [
    <OptionItem
      key="cancel"
      icon="trash"
      label="Cancel schedule"
      danger
      onClick={() => setShowCancel(true)}
    />,
  ];

  return (
    <>
      {showCancel && (
        <DeleteWarning
          title="Cancel scheduled note?"
          description="This note will no longer be published automatically."
          exit={() => setShowCancel(false)}
          handleDelete={handleCancel}
          actionButtonLabel="Cancel schedule"
        />
      )}

      <div
        className="fit-container box-pad-h-m box-pad-v-m sc-s"
        style={{
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          className="fx-centered fx-start-h"
          style={{ gap: "8px", justifyContent: "space-between" }}
        >
          <div className="fx-centered" style={{ gap: 6 }}>
            <Icon name="calendar" size={14} />
            <span className="p-secondary-c" style={{ fontSize: "0.8rem" }}>
              Will be published on {fmt.format(event.created_at * 1000)}
            </span>
          </div>
          <DropDown options={menuOptions}>
            <div className="round-icon-small pointer fx-centered">
              <ThreeDots />
            </div>
          </DropDown>
        </div>

        <div
          style={{
            lineHeight: "1.6",
            wordBreak: "break-word",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 6,
            WebkitBoxOrient: "vertical",
          }}
          dir="auto"
        >
          {getNoteTree(event.content)}
        </div>
      </div>
    </>
  );
}
