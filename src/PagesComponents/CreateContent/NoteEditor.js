import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { setToPublish, setToast } from "@/Store/Slices/Publishers";
import EnergyMapperGraph from "./EnergyMapperGraph";
import { analyzeNoteEnergy } from "@/Endpoionts/EnergyMapperAI";
import {
  extractNip19,
  filterImetas,
  getNoteDraft,
  updateNoteDraft,
} from "@/Helpers/NoteHelpers";
import { SelectTabs } from "@/Components/SelectTabs";
import Toggle from "@/Components/Toggle";
import NotePreview from "@/Components/NotePreview";
import UploadFile from "@/Components/UploadFile";
import Emojis from "@/Components/Emojis";
import Gifs from "@/Components/Gifs";
import DatePicker from "@/Components/DatePicker";
import Icon from "@/Components/LucideIcon";
import TextArea from "@/Components/UI/TextArea";
import Button from "@/Components/UI/Button";
import { InitEvent } from "@/Helpers/Encryptions";
import { publishEvent } from "@/Helpers/Helpers";
import { publishScheduledEvent } from "@/Helpers/EventSchedulerHelper";
import { getRelayMetadata } from "@/Cache/relayMetadataCache";
import useFeatureQuota, { QUOTA_FEATURES } from "@/hooks/useFeatureQuota";
import useAccessFailure from "@/hooks/useAccessFailure";

const CLIENT_TAG = [
  "client",
  "Yakihonne",
  "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
];

const fmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default function NoteEditor() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const userKeys = useSelector((state) => state.userKeys);
  const userRelays = useSelector((state) => state.userRelays);
  const { handleAccessFailure } = useAccessFailure();
  const { quotas, refresh: refreshUsage } = useFeatureQuota([
    QUOTA_FEATURES.energyMapper,
  ]);
  const energyQuota = quotas[QUOTA_FEATURES.energyMapper];
  const energyExhausted = !!energyQuota?.exhausted;

  const [note, setNote] = useState(() => getNoteDraft());
  const [imetas, setImetas] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(undefined);
  const [energyData, setEnergyData] = useState(null);
  const [energyLoading, setEnergyLoading] = useState(false);
  const [showEnergyMap, setShowEnergyMap] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    updateNoteDraft(note);
  }, [note]);

  useEffect(() => {
    adjustHeight();
  }, [note, selectedTab]);

  const adjustHeight = () => {
    if (textareaRef.current && selectedTab === 0) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const insertAtCursor = (text) => {
    const el = textareaRef.current;
    if (!el) {
      setNote((prev) => prev + (prev ? " " : "") + text);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const updated = note.slice(0, start) + ` ${text}` + note.slice(end);
    setNote(updated);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length + 1;
      el.focus();
    }, 0);
  };

  const publishNote = async () => {
    if (isLoading || !userKeys) return;
    if (!note.trim()) {
      dispatch(
        setToast({ type: 2, desc: "Write something before publishing." }),
      );
      return;
    }

    setIsLoading(true);

    const premiumRelays = userRelays
      .filter((r) => {
        const metadata = getRelayMetadata(r.url);
        return metadata?.supported_nips?.includes(63) && (r.read || r.write);
      })
      .map((r) => r.url);

    // Publishing premium content with an empty relay list falls through to NDK's
    // default pool — i.e. it would broadcast paywalled content to every public
    // relay. Refuse instead: no premium relay means there is nowhere safe to put it.
    if (isPremium && premiumRelays.length === 0) {
      dispatch(setToast({ type: 2, desc: t("AsXohpb") }));
      setIsLoading(false);
      return;
    }

    const { content, tags: contentTags } = extractNip19(note);
    const filteredImetas = filterImetas({ note, imetas });

    const tags = [
      CLIENT_TAG,
      ...contentTags,
      ...filteredImetas,
      ...(isPremium ? [["-"], ["nip63"]] : []),
    ];

    const eventInitEx = await InitEvent({
      kind: 1,
      content,
      tags,
      created_at: scheduledAt,
    });
    if (!eventInitEx) {
      setIsLoading(false);
      return;
    }

    const relaysToPublish = isPremium ? premiumRelays : [];

    if (scheduledAt) {
      const scheduled = await publishScheduledEvent({
        event: eventInitEx,
        // Only fall back to the full relay list for non-premium notes. For premium
        // ones `relaysToPublish` is guaranteed non-empty by the check above, and
        // must never widen to every relay the user has.
        relays: isPremium
          ? relaysToPublish
          : relaysToPublish.length > 0
            ? relaysToPublish
            : userRelays.map((r) => r.url),
      });
      if (!scheduled) {
        dispatch(setToast({ type: 2, desc: "Failed to schedule note." }));
        setIsLoading(false);
        return;
      }
      dispatch(setToast({ type: 1, desc: "Note scheduled." }));
    } else {
      await publishEvent(eventInitEx, relaysToPublish);
    }

    updateNoteDraft("");
    setNote("");
    setImetas([]);
    setIsPremium(false);
    setScheduledAt(undefined);
    setIsLoading(false);
  };

  const testPublish = async () => {
    let ev = {
      content: "",
      kind: 1163,
      tags: [
        [
          "p",
          "a93be9fb02e46c40476a84f56975db5835ffead918ffb2bd022904996d3fdc0c",
        ],
      ],
    };
    const eventInitEx = await InitEvent(ev);
    if (!eventInitEx) {
      return;
    }

    const premiumRelays = userRelays
      .filter((r) => {
        const metadata = getRelayMetadata(r.url);
        return metadata?.supported_nips?.includes(63) && (r.read || r.write);
      })
      .map((r) => r.url);

    const relaysToPublish = premiumRelays;
    const success = await publishEvent(eventInitEx, relaysToPublish);
  };

  const handleEnergyMap = async () => {
    const text = note;
    if (!text || !text.trim() || energyExhausted) return;
    setShowEnergyMap(true);
    setEnergyLoading(true);
    setEnergyData(null);
    try {
      const result = await analyzeNoteEnergy(text);
      setEnergyData(result);
    } catch (err) {
      if (!handleAccessFailure(err, { source: "energy-mapper", autoOpen: false }))
        console.error("Energy map failed:", err);
      setShowEnergyMap(false);
    } finally {
      setEnergyLoading(false);
      refreshUsage();
    }
  };

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        publishNote();
      }
    },
    [note, userKeys, isLoading, isPremium, imetas, scheduledAt],
  );

  return (
    <div
      className="fit-container round-corner-m border-all fx-centered fx-col fx-start-v"
      style={{ overflow: "visible" }}
    >
      <div
        className="fit-container fx-scattered box-pad-h-m box-pad-v-s"
        style={{ borderBottom: "1px solid var(--pale-gray)" }}
      >
        <div>
          <SelectTabs
            tabs={["Write", "Preview"]}
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
          // small
          />
        </div>
        <Button
          size="m"
          label={energyExhausted ? "Limit reached" : "Energy mapper"}
          type="gray"
          loading={energyLoading}
          leftIcon={energyExhausted ? "warning" : undefined}
          onClick={() => {
            handleEnergyMap();
          }}
          disabled={energyLoading || energyExhausted || !note.trim()}
          style={
            energyExhausted
              ? { color: "var(--c1)", cursor: "not-allowed" }
              : undefined
          }
        />
      </div>
      <div
        className="fit-container box-pad-h-m box-pad-v-m"
        style={{ minHeight: "180px" }}
      >
        {selectedTab === 0 ? (
          <TextArea
            ref={textareaRef}
            value={note}
            onChange={(value) => setNote(value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind? Use #hashtags or paste nostr: identifiers."
          />
        ) : (
          <NotePreview content={note} />
        )}
      </div>

      {showEnergyMap && (
        <div
          className="fit-container box-pad-h-m"
          style={{ paddingBottom: "8px" }}
        >
          <EnergyMapperGraph
            data={energyData}
            isLoading={energyLoading}
            onClose={() => {
              setShowEnergyMap(false);
              setEnergyData(null);
            }}
          />
        </div>
      )}

      {scheduledAt && (
        <div
          className="fit-container fx-centered fx-start-h box-pad-h-m pointer"
          style={{
            borderTop: "1px solid var(--pale-gray)",
            color: "var(--color-primary-accent)",
            gap: "6px",
            paddingTop: "10px",
            paddingBottom: "10px",
          }}
          onClick={() => setShowDatePicker(true)}
        >
          <Icon name="calendar" size={20} />
          <p className="p-secondary-c">
            Scheduled for {fmt.format(scheduledAt * 1000)}
          </p>
        </div>
      )}

      <div
        className="fit-container fx-scattered box-pad-h-m box-pad-v-m"
        style={{
          borderTop: "1px solid var(--pale-gray)",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div className="fx-centered" style={{ gap: "12px" }}>
          <div className="fx-centered pointer" title="Upload image">
            <UploadFile
              kind="image/*,video/*"
              setImageURL={(url) => insertAtCursor(url)}
              setImetas={(newImetas) =>
                setImetas((prev) => [...prev, ...newImetas])
              }
            />
          </div>

          <div style={{ position: "relative" }}>
            <div
              className="pointer border-all fx-centered"
              title="Add GIF"
              onClick={() => setShowGifs(!showGifs)}
              style={{
                padding: "2px 6px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: showGifs
                  ? "var(--color-primary-accent)"
                  : "transparent",
                color: showGifs ? "white" : "inherit",
              }}
            >
              GIF
            </div>
            {showGifs && (
              <Gifs
                setGif={(url) => {
                  insertAtCursor(url);
                  setShowGifs(false);
                }}
                exit={() => setShowGifs(false)}
              />
            )}
          </div>
          <Emojis setEmoji={(emoji) => insertAtCursor(emoji)} />
          <div
            className="pointer fx-centered"
            title={scheduledAt ? "Change schedule" : "Schedule post"}
            onClick={() => setShowDatePicker(true)}
          >
            <Icon v={2} name="calendar" opacity=".5" size={24} />
          </div>
          <div
            className="fx-centered fx-gap-h round-corner border-all box-pad-h-s box-pad-v-xs"
            title="Mark as premium content"
          >
            <Icon name={"crown"} />
            <p>Premium content</p>

            <Toggle status={isPremium} setStatus={setIsPremium} small />
          </div>
        </div>

        <div className="fx-centered" style={{ gap: "10px" }}>
          {note.length > 0 && (
            <span className="gray-c p-medium" style={{ fontSize: "0.75rem" }}>
              {note.length}
            </span>
          )}
          <p className="gray-c p-medium" style={{ fontSize: "0.72rem" }}>
            ⌘+Enter
          </p>
          <Button
            label={isLoading ? "Publishing..." : "Publish"}
            onClick={publishNote}
            disabled={isLoading || !note.trim()}
            loading={isLoading}
            size="m"
          />
          {/* <Button
            label={isLoading ? "Publishing..." : "Publish"}
            onClick={testPublish}
            loading={isLoading}
            size="m"
          /> */}
        </div>
      </div>

      {showDatePicker && (
        <DatePicker
          close={() => setShowDatePicker(false)}
          selected={scheduledAt}
          onSelect={(ts) => {
            setScheduledAt(ts);
            setShowDatePicker(false);
          }}
        />
      )}
    </div>
  );
}
