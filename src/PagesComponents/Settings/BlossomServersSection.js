import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { InitEvent } from "@/Helpers/Encryptions";
import { publishEvent } from "@/Helpers/Helpers";
import { setUserBlossomServers } from "@/Store/Slices/UserData";
import { setToast } from "@/Store/Slices/Extras";
import Button from "@/Components/UI/Button";
import Icon from "@/Components/LucideIcon";
import Spinner from "@/Components/Spinner";
import DeleteWarning from "@/Components/DeleteWarning";

const YAKI_BLOSSOM = process.env.NEXT_PUBLIC_BLOSSOM_SERVER;

const stripSlash = (url) => (url || "").replace(/\/+$/, "");

const getHost = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

// A bare host is the common input, so https:// is added rather than rejected.
// Only http(s) survives: AccountInit drops any other scheme when it reads the
// list back, so accepting one here would publish a server that then vanishes.
const normalizeServerUrl = (value) => {
  let trimmed = stripSlash((value || "").trim());
  if (!trimmed) return "";
  if (!/^[a-z]+:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return stripSlash(url.toString());
  } catch {
    return "";
  }
};

// publishEvent resolves false when it cannot read the event back within its 3s
// window, but the event was still sent; only a signing failure counts here.
const publishBlossomList = async (servers) => {
  const eventInitEx = await InitEvent({
    kind: 10063,
    content: "",
    tags: servers.map((url) => ["server", url]),
  });
  if (!eventInitEx) return false;
  await publishEvent(eventInitEx);
  return true;
};

export default function BlossomServersSection() {
  const dispatch = useDispatch();
  const userBlossomServers = useSelector((state) => state.userBlossomServers);
  const [customServer, setCustomServer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [serverToRemove, setServerToRemove] = useState(null);

  // Uploads always go to the YakiHonne server, so it stays on the list: removing
  // it would advertise servers that don't actually hold the user's media.
  const isLocked = (url) => stripSlash(url) === stripSlash(YAKI_BLOSSOM);

  const update = async (servers, action, successMessage) => {
    setBusy(action);
    try {
      const success = await publishBlossomList(servers);
      if (success) {
        dispatch(setUserBlossomServers(servers));
        dispatch(setToast({ type: 1, desc: successMessage }));
      }
      return success;
    } catch (err) {
      console.error("[BlossomServersSection]", err);
      dispatch(setToast({ type: 2, desc: "Failed to update media servers." }));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const addServer = async () => {
    const url = normalizeServerUrl(customServer);
    if (!url) {
      setError("Enter a valid server URL.");
      return;
    }
    if (userBlossomServers.some((s) => stripSlash(s) === url)) {
      setError("This server is already in your list.");
      return;
    }
    const success = await update(
      [...userBlossomServers, url],
      "add",
      "Server added.",
    );
    if (success) setCustomServer("");
  };

  const removeServer = async () => {
    if (!serverToRemove) return;
    await update(
      userBlossomServers.filter((s) => s !== serverToRemove),
      `remove:${serverToRemove}`,
      "Server removed.",
    );
    setServerToRemove(null);
  };

  // The first server tag is the main one other clients upload to (BUD-03).
  const setMainServer = (url) =>
    update(
      [url, ...userBlossomServers.filter((s) => s !== url)],
      `main:${url}`,
      "Main server updated.",
    );

  return (
    <div className="yp-card box-pad-h-m fx-centered fx-col">
      {serverToRemove && (
        <DeleteWarning
          title="Remove media server"
          description={`${serverToRemove} will be removed from your Blossom servers list.`}
          exit={() => setServerToRemove(null)}
          handleDelete={removeServer}
          actionButtonLabel="Remove"
        />
      )}

      {userBlossomServers.map((url, index) => (
        <React.Fragment key={url}>
          {index > 0 && <div className="fit-container border-top" />}
          <div className="fit-container fx-scattered box-pad-v-m fx-gap-h">
            <div className="fx-centered fx-start-h fx-gap-h" style={{ minWidth: 0 }}>
              <div
                className="fx-centered"
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-divider)",
                }}
              >
                <Icon name="server" size={20} />
              </div>
              <div className="fx-col fx-start-v" style={{ gap: 0, minWidth: 0 }}>
                <p className="p-bold p-one-line">{getHost(url)}</p>
                <p className="gray-c p-medium p-one-line">{url}</p>
              </div>
            </div>
            <div className="fx-centered fx-gap-h" style={{ flexShrink: 0 }}>
              {index === 0 ? (
                <div className="sticker sticker-gst-green sticker-small">Main</div>
              ) : (
                <Button
                  label="Set as main"
                  size="s"
                  type="gray"
                  loading={busy === `main:${url}`}
                  disabled={!!busy}
                  onClick={() => setMainServer(url)}
                />
              )}
              {!isLocked(url) &&
                (busy === `remove:${url}` ? (
                  <Spinner size={18} />
                ) : (
                  <div
                    className="pointer fx-centered"
                    onClick={() => !busy && setServerToRemove(url)}
                  >
                    <Icon name="trash" size={18} />
                  </div>
                ))}
            </div>
          </div>
        </React.Fragment>
      ))}

      {userBlossomServers.length === 0 && (
        <p className="fit-container p-centered gray-c box-pad-v-m">
          No media servers yet.
        </p>
      )}

      <div className="fit-container border-top" />

      <div className="fit-container fx-col box-pad-v-m" style={{ rowGap: "8px" }}>
        <p className="p-secondary-c">Add a Blossom server</p>
        <div className="fit-container fx-centered fx-gap-h">
          <input
            type="text"
            className="if ifs-full"
            placeholder="https://"
            value={customServer}
            onChange={(e) => {
              setCustomServer(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && !busy && addServer()}
          />
          <Button
            label="Add"
            type="primary"
            loading={busy === "add"}
            disabled={!!busy || !customServer.trim()}
            onClick={addServer}
          />
        </div>
        {error && <p className="p-medium p-red-c">{error}</p>}
        <p className="gray-c p-medium">
          The main server is the one other Nostr clients upload your media to.
        </p>
      </div>
    </div>
  );
}
