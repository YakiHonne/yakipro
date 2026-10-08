import { NDKEvent, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { sortEvents } from "nostr-tools";
import { store } from "@/Store/Store";
import { setNostrAuthors } from "@/Store/Slices/Extras";
import { getParsedAuthor, InitEvent } from "./Encryptions";
import axios from "axios";
import {
  getRelayMetadata,
  saveLocalRelaysMetadata,
  setRelayMetadata,
} from "@/Cache/relayMetadataCache";
import { setToast } from "@/Store/Slices/Extras";
import { ndkInstance, relaysOnPlatform } from "./NDKInstance";

function encodeBase64URL(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const getHashFromFile = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], {
    type: file.type || "application/octet-stream",
  });
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const x = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return { x, blob };
};

export const generateAuthorizationHeaderForBlossomServer = async ({
  servers,
  tTag,
  sha256,
  file,
}) => {
  try {
    let sha256_ = sha256;
    if (file) {
      const hash = await getHashFromFile(file);
      sha256_ = hash?.x;
    }
    const tTagsContent = {
      list: "List Image",
      delete: "Delete Image",
      upload: "Upload Image",
    };
    const expiration = `${Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7}`;
    const event = await InitEvent({
      kind: 24242,
      content: tTagsContent[tTag],
      tags: [
        ["t", tTag],
        ...(sha256_ ? [["x", sha256_]] : []),
        ...(servers || []).map((s) => ["server", s]),
        ["expiration", expiration],
      ],
    });
    if (!event) return null;
    return encodeBase64URL(JSON.stringify(event));
  } catch (err) {
    console.error("[generateAuthorizationHeaderForBlossomServer]", err);
    return null;
  }
};

export const mirrorBlossomServerFileUpload = async ({
  isMirror,
  serversList,
  eventHash,
  fileUrl,
  excludeFirst = true,
}) => {
  try {
    const canMirror =
      (isMirror && serversList.length > 1 && excludeFirst) ||
      (isMirror && serversList.length > 0 && !excludeFirst);
    if (!canMirror) return [];
    const targets = excludeFirst
      ? serversList.filter((_, i) => i !== 0)
      : serversList;
    const results = await Promise.allSettled(
      targets.map(async (server) => {
        try {
          const res = await axios.put(
            `${server}/mirror`,
            { url: fileUrl },
            { headers: { Authorization: `Nostr ${eventHash}` } },
          );
          if (!res.data?.url) {
            store.dispatch(setToast({ type: 2, desc: `Could not mirror to ${server}` }));
          }
          return res.data?.url || null;
        } catch (err) {
          store.dispatch(
            setToast({
              type: 2,
              desc: err?.response?.data?.message || `Could not mirror to ${server}`,
            }),
          );
          return null;
        }
      }),
    );
    return results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean);
  } catch (err) {
    store.dispatch(setToast({ type: 2, desc: "Could not mirror to one or more servers" }));
    return [];
  }
};

export const deleteBlossomFile = async ({ sha256, serversList, eventHash }) => {
  try {
    if (!serversList?.length) return [];
    const results = await Promise.allSettled(
      serversList.map(async (server) => {
        try {
          await axios.delete(`${server}/${sha256}`, {
            headers: { Authorization: `Nostr ${eventHash}` },
          });
          return true;
        } catch (err) {
          store.dispatch(setToast({ type: 2, desc: `Could not delete from ${server}` }));
          return false;
        }
      }),
    );
    return results.map((r) => (r.status === "fulfilled" ? r.value : false));
  } catch (err) {
    store.dispatch(setToast({ type: 2, desc: "Could not delete from one or more servers" }));
    return [];
  }
};

// How long a relay still opening its socket is waited for once another relay
// has already answered the query.
const CONNECTING_GRACE_MS = 800;
// Longest the idle timer is held open for relays that are up but have not sent
// EOSE yet, measured from the start of the query.
const RELAY_WAIT_CAP_MS = 2500;
// Relays that held a query to that cap without answering.
const unresponsiveRelays = new Set();

// Timing diagnostics, off by default. Enable in the console with
// localStorage.setItem("debugSubData", "1") and reload.
const logSubData = (sub, startedAt, reason, count) => {
  try {
    if (typeof localStorage === "undefined") return;
    if (!localStorage.getItem("debugSubData")) return;
    const relays = Array.from(sub?.relayFilters?.keys() || []).map((url) => {
      const relay = sub?.ndk?.pool?.relays?.get(url);
      return `${url} [${relay?.status}${sub?.eosesSeen?.has(relay) ? " eose" : ""}]`;
    });
    console.log(
      `[getSubData] ${Date.now() - startedAt}ms · ${reason} · ${count} events`,
      JSON.stringify(sub?.filters),
      relays,
    );
  } catch {}
};

export const getSubData = async ({
  filter,
  timeout = 1000,
  relayUrls = [],
  ndk = ndkInstance,
  maxEvents = 1000,
  raw = false,
  cacheUsage = "CACHE_FIRST",
}) => {
  // An empty list means `relayUrls: undefined`, which hands relay choice to NDK's
  // outbox model — that only finds anything once the account's relays are in the
  // pool and connected, so on a cold start it queried nothing. YakiV5 falls back
  // to the platform relays here; this also unions in the account's own, since
  // notes living only on a personal relay are invisible to the defaults.
  const accountRelays = (store.getState()?.userRelays || [])
    .map((relay) => (typeof relay === "string" ? relay : relay?.url))
    .filter((url) => typeof url === "string" && url.startsWith("wss://"));
  const userRelays = [...new Set([...relaysOnPlatform, ...accountRelays])];
  if (!filter || filter.length === 0) return { data: [], pubkeys: [] };

  return new Promise((resolve) => {
    let events = [];
    let pubkeys = [];

    let filter_ = filter.map((_) => {
      let temp = { ..._ };
      if (!_["#t"]) {
        delete temp["#t"];
        return temp;
      }
      return temp;
    });

    if (!filter_ || filter_.length === 0) {
      resolve({ data: [], pubkeys: [] });
      return;
    }
    const startedAt = Date.now();
    let settled = false;
    let firstEoseAt;
    let timer;
    let graceTimer;
    let sub;
    const finish = (reason = "idle") => {
      if (settled) return;
      settled = true;
      logSubData(sub, startedAt, reason, events.length);
      clearTimeout(timer);
      clearTimeout(graceTimer);
      clearTimeout(hardCap);
      sub?.stop();
      resolve({
        data: sortEvents(events),
        pubkeys: [...new Set(pubkeys)],
      });
    };
    // Fallback: resolve once `timeout` passes with no new event. On its own this
    // made every query cost at least `timeout` after the last event, even when
    // every relay had already said it was done.
    //
    // It must not cut off a relay that is up and simply slower: a fast relay's
    // events used to start this timer and end the query before the relay holding
    // the rest (the account's own, or the premium one mid-AUTH) had answered, so
    // right after load a page showed only part of an author's content. The idle
    // window is therefore held open, up to RELAY_WAIT_CAP_MS from the start, for
    // relays that can still answer.
    const startTimer = (delay = timeout) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const remaining = RELAY_WAIT_CAP_MS - (Date.now() - startedAt);
        if (remaining > 0 && cacheUsage !== "ONLY_CACHE" && relaysStillOwed()) {
          startTimer(Math.min(timeout, remaining));
          return;
        }
        noteUnresponsiveRelays();
        finish("idle");
      }, delay);
    };
    // A query where no relay ever answers (no EOSE, no event) would otherwise
    // never settle. Queries that are receiving events keep the idle timer.
    const hardCap = setTimeout(() => {
      if (events.length === 0) finish("hard-cap");
    }, Math.max(timeout, 1000) + 8000);

    // Resolve as soon as every relay that can still answer has sent EOSE. NDK's
    // own "eose" can't be used for this: it also fires once half the relays are
    // done, which is how the fastest relay used to end a query before the one
    // holding the data replied. Relays that are down are left out so they can't
    // hold the query open; one still connecting, or mid-AUTH, is pending,
    // since a premium relay can send an empty EOSE before the handshake and its
    // real results after.
    const allLiveRelaysDone = () => {
      const relayFilters = sub?.relayFilters;
      if (!relayFilters || relayFilters.size === 0) return false;
      for (const url of relayFilters.keys()) {
        // pool.relays rather than getRelay(), which would create a missing one.
        const relay = ndk.pool?.relays?.get(url);
        // Unknown relay: can't tell, so keep waiting (the idle timer still ends it).
        if (!relay) return false;
        const status = relay.status;
        // Relays that are down are skipped: DISCONNECTING (0), DISCONNECTED (1),
        // FLAPPING (3).
        if (status === 0 || status === 1 || status === 3) continue;
        // A relay still CONNECTING (4) / RECONNECTING (2) may yet deliver, so it
        // gets a short window after the first relay answered. Without one, a
        // relay that never finishes its handshake held every query open until the
        // idle timer.
        if (status === 2 || status === 4) {
          if (firstEoseAt && Date.now() - firstEoseAt >= CONNECTING_GRACE_MS)
            continue;
          return false;
        }
        if (status === 6 || status === 7) return false;
        if (!sub.eosesSeen?.has(relay)) return false;
      }
      return true;
    };
    // Relays the idle timer should still wait for. A relay that already sat out a
    // full wait without answering is not waited on again until it does answer —
    // otherwise one that never sends EOSE (or never completes AUTH, as for a
    // watch-only account) would add the whole cap to every query.
    const pendingRelays = () => {
      const pending = [];
      const relayFilters = sub?.relayFilters;
      if (!relayFilters) return pending;
      for (const url of relayFilters.keys()) {
        const relay = ndk.pool?.relays?.get(url);
        if (!relay) continue;
        const status = relay.status;
        if (status === 0 || status === 1 || status === 3) continue;
        if (sub.eosesSeen?.has(relay)) continue;
        pending.push(url);
      }
      return pending;
    };
    const relaysStillOwed = () =>
      pendingRelays().some((url) => !unresponsiveRelays.has(url));
    const noteUnresponsiveRelays = () => {
      if (Date.now() - startedAt < RELAY_WAIT_CAP_MS) return;
      for (const url of pendingRelays()) unresponsiveRelays.add(url);
    };
    const checkDone = () => {
      if (!firstEoseAt) {
        firstEoseAt = Date.now();
        setTimeout(checkDone, CONNECTING_GRACE_MS + 10);
      }
      if (settled || !allLiveRelaysDone()) return;
      // A short grace lets events still being processed land before resolving.
      clearTimeout(graceTimer);
      graceTimer = setTimeout(() => {
        if (allLiveRelaysDone()) finish("all-eose");
      }, 150);
    };

    sub = ndk.subscribe(
      filter_,
      {
        groupable: false,
        skipVerification: true,
        skipValidation: true,
        relayUrls: relayUrls.length > 0 ? relayUrls : userRelays,
        cacheUsage,
      },
      {
        onEvent(event) {
          if (events.length <= maxEvents) {
            pubkeys.push(event.pubkey);
            if (event.id) events.push(raw ? event.rawEvent() : event);
            if (maxEvents === 1) {
              finish("first-event");
              return;
            }
            startTimer();
          }
        },
        onEose() {
          if (events.length === 0) startTimer();
          checkDone();
        },
      },
    );

    // finish() can run during subscribe() when the cache answers synchronously,
    // before `sub` was assigned to stop.
    if (settled) {
      sub?.stop();
      return;
    }

    // NDK reports EOSE per relay only through this method; wrapping it on this
    // instance is how each relay's completion is observed.
    if (typeof sub?.eoseReceived === "function") {
      const eoseReceived = sub.eoseReceived.bind(sub);
      sub.eoseReceived = (relay) => {
        eoseReceived(relay);
        if (relay?.url) unresponsiveRelays.delete(relay.url);
        checkDone();
      };
    }
  });
};

export const getCountryCodeFromBrowser = () => {
  try {
    const locale = navigator.language || navigator.userLanguage;
    if (locale && locale.includes("-")) {
      return locale.split("-")[1].toUpperCase();
    }
    return "";
  } catch (err) {
    return "";
  }
};

export const getEventTags = ({
  gatewayUrl,
  fiat,
  sc,
  lightning,
  enableFiat,
  enableSC,
  enableLightning,
}) => {
  const tags = [
    ["d", process.env.NEXT_PUBLIC_GATEWAY_PUBKEY],
    ["u", gatewayUrl],
    ["gateway", process.env.NEXT_PUBLIC_GATEWAY_PUBKEY],
  ];

  if (enableFiat && fiat && fiat.length > 0) {
    const methodId = "fiat";
    tags.push(["method", methodId, "Fiat", "fiat"]);
    fiat.forEach((plan) => {
      tags.push([
        "price",
        methodId,
        plan.id,
        plan.name,
        plan.amount.toString(),
        plan.interval,
      ]);
      if (
        plan.currency &&
        !tags.find((t) => t[0] === "currency" && t[1] === methodId)
      ) {
        tags.push(["currency", methodId, plan.currency]);
      }
      if (plan.discount > 0) {
        tags.push([
          "discount",
          methodId,
          plan.id,
          plan.discount.toString(),
          "percentage",
        ]);
      }
    });
  }

  if (enableSC && sc && sc.length > 0) {
    const methodId = "stable_coin";
    tags.push(["method", methodId, "Stable Coin", "crypto"]);
    sc.forEach((plan) => {
      tags.push([
        "price",
        methodId,
        plan.id,
        plan.name,
        plan.amount.toString(),
        plan.interval,
      ]);
      if (
        plan.currency &&
        !tags.find((t) => t[0] === "currency" && t[1] === methodId)
      ) {
        tags.push(["currency", methodId, plan.currency]);
      }
      if (plan.discount > 0) {
        tags.push([
          "discount",
          methodId,
          plan.id,
          plan.discount.toString(),
          "percentage",
        ]);
      }
    });
  }
  console.log(lightning);
  if (enableLightning && lightning && lightning.length > 0) {
    const methodId = "lightning";
    tags.push(["method", methodId, "Lightning", "lightning"]);
    lightning.forEach((plan, index) => {
      const planId = `p${index + 1}`;
      tags.push([
        "price",
        methodId,
        planId,
        plan.name,
        plan.amount.toString(),
        plan.interval,
      ]);
      if (!tags.find((t) => t[0] === "currency" && t[1] === methodId)) {
        tags.push(["currency", methodId, "SATS"]);
      }
      if (plan.discount > 0) {
        tags.push([
          "discount",
          methodId,
          planId,
          plan.discount.toString(),
          "percentage",
        ]);
      }
    });
  }

  return tags;
};

// `exclusive` means "these relays or nothing". NDK falls back to its outbox
// calculation whenever the relay set it is handed is empty or missing, so a set
// that failed to resolve would quietly broadcast to the public pool. For premium
// content that is a paywall leak, not a degraded publish — so it refuses instead.
export const publishEvent = async (event, relays = [], exclusive = false) => {
  return new Promise((resolve) => {
    let ev = new NDKEvent(ndkInstance, event);
    let relaySet = undefined;
    if (relays.length > 0) {
      const ndkRelays = relays
        .map((r) => ndkInstance.pool.getRelay(r))
        .filter(Boolean);
      if (ndkRelays.length > 0) {
        relaySet = new NDKRelaySet(new Set(ndkRelays), ndkInstance);
      }
    }

    if (exclusive && !relaySet) {
      console.error(
        "[publishEvent] refusing exclusive publish: no relays resolved",
        relays,
      );
      resolve(false);
      return;
    }

    ev.publish(relaySet);

    let sub = ndkInstance.subscribe([{ ids: [event.id] }], {
      cacheUsage: "CACHE_FIRST",
      relayUrls: relays.length > 0 ? relays : undefined,
    });

    sub.on("event", () => {
      sub.stop();
      resolve(true);
    });
    let timer = setTimeout(() => {
      clearTimeout(timer);
      resolve(false);
    }, 3000);
  });
};

export const removeEventFromCache = async (event) => {
  try {
    const ev = new NDKEvent(ndkInstance, event);
    const cacheId = ev.tagId();
    await ndkInstance.cacheAdapter?.deleteEventIds?.([cacheId]);
  } catch (err) {
    console.error("[removeEventFromCache]", err);
  }
};

export const saveUsers = async (pubkeys) => {
  try {
    if (!pubkeys || pubkeys.length === 0) return;
    const users_pubkeys = [...new Set(pubkeys)].filter(
      (_) => typeof _ === "string",
    );

    const res = await getSubData({
      filter: [{ kinds: [0], authors: users_pubkeys }],
      timeout: 500,
    });

    let users = res.data;
    if (users.length === 0) return;

    let sortedUsers = sortEvents(users);
    let parsedAuthors = sortedUsers
      .filter((item, index, self) => {
        return self.findIndex((_) => _.pubkey === item.pubkey) === index;
      })
      .map((user) => {
        try {
          return getParsedAuthor(user);
        } catch (err) {
          return false;
        }
      })
      .filter((_) => _);

    if (parsedAuthors.length > 0) {
      const currentState = store.getState();
      const existingAuthors = currentState.nostrAuthors || [];
      const newAuthorsMap = new Map();

      existingAuthors.forEach((a) => newAuthorsMap.set(a.pubkey, a));
      parsedAuthors.forEach((a) => newAuthorsMap.set(a.pubkey, a));

      store.dispatch(setNostrAuthors(Array.from(newAuthorsMap.values())));
    }

    return parsedAuthors;
  } catch (err) {
    console.log("[saveUsers] Error:", err);
    return [];
  }
};

// Lightning prices live ONLY in the published kind:30164 event, so they must be
// parsed from its tags. (Fiat/crypto prices are read from the server instead —
// see getSubPlans / usePlans.)
export const extractLightningPlans = (tags) => {
  if (!tags || !Array.isArray(tags)) return [];
  const priceTags = tags.filter(
    (t) => t[0] === "price" && t[1] === "lightning",
  );
  const discountTags = tags.filter(
    (t) => t[0] === "discount" && t[1] === "lightning",
  );

  return priceTags.map((t) => {
    const id = t[2];
    const name = t[3];
    const amount = t[4];
    const interval = t[5];
    const discountTag = discountTags.find((d) => d[2] === id);
    return {
      id,
      name,
      amount,
      discount: discountTag ? discountTag[3] : 0,
      interval,
    };
  });
};

export const saveRelayMetadata = async (relays) => {
  if (!relays || relays.length === 0) return;
  let onlyUnsavedRelays = relays.filter((relay) => {
    let metadata = getRelayMetadata(relay);
    if (metadata?.isEmpty || typeof metadata?.isEmpty === undefined)
      return true;
    return false;
  });
  let relaysMetadata = await Promise.all(
    onlyUnsavedRelays.map((relay) => fetchRelayMetadata(relay)),
  );
  relaysMetadata = relaysMetadata.filter((_) => _);
  let pubkeys = relaysMetadata.map((_) => _.pubkey).filter((_) => _);

  relaysMetadata.forEach((_) => {
    setRelayMetadata(_.url, _);
  });

  saveLocalRelaysMetadata();
  return relaysMetadata;
};

// A relay that accepts the connection but never answers would otherwise hang
// every caller (premium publish included) indefinitely. Past this, the relay is
// treated as unresolved and simply left out.
const RELAY_METADATA_TIMEOUT = 3000;

const fetchRelayMetadata = async (relay) => {
  try {
    const info = await axios.get(relay.replace("wss", "https"), {
      headers: {
        Accept: "application/nostr+json",
      },
      timeout: RELAY_METADATA_TIMEOUT,
    });
    if (typeof info.data !== "object") return false;
    return { url: relay, ...info.data };
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const sleepTimer = async (duration = 2000) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(false);
    }, duration);
  });
};

export const copyText = (value, message, event) => {
  event?.stopPropagation();
  navigator.clipboard.writeText(value);
  store.dispatch(
    setToast({
      type: 1,
      desc: `${message}`,
    }),
  );
};
