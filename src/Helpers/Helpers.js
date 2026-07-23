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

export const getSubData = async ({
  filter,
  timeout = 1000,
  relayUrls = [],
  ndk = ndkInstance,
  maxEvents = 1000,
  raw = false,
  cacheUsage = "CACHE_FIRST",
}) => {
  const userRelays = [];
  // const userRelays = relaysOnPlatform;
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
    let sub = ndk.subscribe(
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
              // sub.removeAllListeners();
              sub.stop();
              resolve({
                data: sortEvents(events),
                pubkeys: [...new Set(pubkeys)],
              });
            }
            startTimer();
          }
        },
        onEose() {
          if (events.length === 0) startTimer();
        },
      },
    );
    let timer;
    const startTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // sub.removeAllListeners();
        sub.stop();
        resolve({
          data: sortEvents(events),
          pubkeys: [...new Set(pubkeys)],
        });
      }, timeout);
    };
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

export const publishEvent = async (event, relays = []) => {
  return new Promise((resolve) => {
    let ev = new NDKEvent(ndkInstance, event);
    let relaySet = undefined;
    if (relays.length > 0) {
      const ndkRelays = relays.map((r) => ndkInstance.pool.getRelay(r));
      relaySet = new NDKRelaySet(new Set(ndkRelays), ndkInstance);
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

const fetchRelayMetadata = async (relay) => {
  try {
    const info = await axios.get(relay.replace("wss", "https"), {
      headers: {
        Accept: "application/nostr+json",
      },
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
