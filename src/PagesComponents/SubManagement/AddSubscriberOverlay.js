import React, { useState, useCallback, useRef } from "react";
import { nip19 } from "nostr-tools";
import { getSubData, saveUsers } from "@/Helpers/Helpers";
import axiosInstance from "@/Helpers/HTTP_Client";
import Overlay from "@/Components/Overlay";
import Icon from "@/Components/LucideIcon";
import Button from "@/Components/UI/Button";
import Spinner from "@/Components/Spinner";

function resolveQueryToPubkey(query) {
  const trimmed = query.trim();
  try {
    if (trimmed.startsWith("npub1")) {
      const decoded = nip19.decode(trimmed);
      return decoded.type === "npub" ? decoded.data : null;
    }
    if (trimmed.startsWith("nprofile1")) {
      const decoded = nip19.decode(trimmed);
      return decoded.type === "nprofile" ? decoded.data.pubkey : null;
    }
  } catch {
    return null;
  }
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return trimmed;
  return null;
}

function UserResult({ profile, pubkey, onAdd, isAdding, alreadyAdded }) {
  return (
    <div className="fit-container round-corner-m border-all box-pad-h-m box-pad-v-s fx-scattered">
      <div className="fx-centered fx-start-h fx-gap-h">
        <div
          className="bg-cover"
          style={{
            backgroundImage: `url(${profile.picture || ""})`,
            backgroundColor: "var(--color-divider)",
            borderRadius: "50%",
            width: 38,
            height: 38,
            flexShrink: 0,
          }}
        >
          {!profile.picture && (
            <div
              className="fx-centered"
              style={{ width: "100%", height: "100%" }}
            >
              <Icon name="user" size={20} />
            </div>
          )}
        </div>
        <div className="fx-col fx-start-v" style={{ gap: 0, minWidth: 0 }}>
          <p className="p-bold p-one-line">
            {profile.display_name || profile.name || "Unknown"}
          </p>
          <p className="gray-c p-medium p-one-line">
            @{profile.name || pubkey.slice(0, 12) + "…"}
          </p>
        </div>
      </div>
      <Button
        size="s"
        type={alreadyAdded ? "gray" : "primary"}
        label={alreadyAdded ? "Added" : "Add"}
        disabled={alreadyAdded || isAdding}
        loading={isAdding}
        onClick={() => !alreadyAdded && onAdd(pubkey)}
      />
    </div>
  );
}

export default function AddSubscriberOverlay({
  exit,
  onAdd,
  existingPubkeys = [],
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingPubkey, setAddingPubkey] = useState(null);
  const [addedPubkeys, setAddedPubkeys] = useState([]);
  const [error, setError] = useState("");
  const searchTimer = useRef(null);

  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    setError("");
    try {
      const pubkey = resolveQueryToPubkey(trimmed);

      if (pubkey) {
        const res = await saveUsers([pubkey]);
        if (res.length === 0) {
          setResults([]);
          setError("No users found.");
          return;
        }
        const user = res[0];
        setResults([{ pubkey: user.pubkey, profile: user }]);
      } else {
        const { data } = await axiosInstance.get(
          `https://cache-v2.yakihonne.com/api/v1/users/search/${encodeURIComponent(trimmed)}`,
        );
        const list = (Array.isArray(data?.data) ? data.data : []).slice(0, 10);
        const results = list.map((u) => ({ pubkey: u.pubkey, profile: u }));
        setResults(results);
        if (results.length === 0) setError("No users found.");
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) {
      setResults([]);
      setError("");
      return;
    }
    searchTimer.current = setTimeout(() => doSearch(val), 400);
  };

  const handleAdd = useCallback(
    async (pubkey) => {
      setAddingPubkey(pubkey);
      try {
        const result = await onAdd(pubkey);
        if (result) {
          exit();
        }
      } finally {
        setAddingPubkey(null);
      }
    },
    [onAdd, exit],
  );

  const allAdded = (pubkey) =>
    addedPubkeys.includes(pubkey) || existingPubkeys.includes(pubkey);

  return (
    <Overlay exit={exit} width={480}>
      <div className="box-pad-h box-pad-v-m fx-col fx-gap-v-m">
        <div className="fx-scattered">
          <h3 style={{ margin: 0 }}>Add subscriber</h3>
        </div>

        <div
          className="if if-full fx-centered fx-gap-h-s"
          style={{ position: "relative" }}
        >
          <Icon name="search" size={18} />
          <input
            className="if if-full"
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              flex: 1,
            }}
            placeholder="Search by name, npub, nprofile, or hex pubkey…"
            value={query}
            onChange={handleInput}
            autoFocus
          />
          {isSearching && (
            <div style={{ position: "absolute", right: 10 }}>
              <Spinner size={16} />
            </div>
          )}
        </div>

        {error && (
          <p className="p-secondary-c p-medium" style={{ textAlign: "center" }}>
            {error}
          </p>
        )}

        {results.length > 0 && (
          <div
            className="fx-col fx-gap-v fit-container"
            style={{ maxHeight: 380, overflowY: "auto" }}
          >
            {results.map(({ pubkey, profile }) => (
              <UserResult
                key={pubkey}
                pubkey={pubkey}
                profile={profile}
                onAdd={handleAdd}
                isAdding={addingPubkey === pubkey}
                alreadyAdded={allAdded(pubkey)}
              />
            ))}
          </div>
        )}

        {results.length === 0 && !error && !isSearching && (
          <p
            className="p-secondary-c p-medium"
            style={{ textAlign: "center", padding: "16px 0" }}
          >
            Search for a user to add them as a subscriber
          </p>
        )}
      </div>
    </Overlay>
  );
}
