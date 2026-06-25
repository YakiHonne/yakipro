import { generateSecretKey, getPublicKey, nip44 } from "nostr-tools";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  getKeys,
  InitEvent,
  encrypt44,
  decrypt44,
  bytesTohex,
  hexToUint8Array,
} from "./Encryptions";
import { getSubData, publishEvent } from "./Helpers";

const DVM_PUBKEY =
  process.env.NEXT_PUBLIC_SCHEDULE_DVM_PUBKEY ||
  "fb04b2aadb3cf9d3b97af52d3f544e1159ee1a4b8548334549d13b7cac4f8769";

const b64uToBytesSafe = (b64u) => {
  if (!b64u) return new Uint8Array();
  const b64 = b64u
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(b64u.length / 4) * 4, "=");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const deriveMasterKey = (payload) => {
  const rootkey = b64uToBytesSafe(payload.kr);
  const salt = new Uint8Array();
  const ksubmitInfo = new TextEncoder().encode("pidgeon:v3:key:submit");
  const mboxInfo = new TextEncoder().encode("pidgeon:v3:key:mailbox");
  const ksubmit = hkdf(sha256, rootkey, salt, ksubmitInfo, 32);
  const mbox = hkdf(sha256, rootkey, salt, mboxInfo, 32);
  return { ksubmit, mbox, mb: payload.mb, relays: payload.relays };
};

const getCachedDVMMasterKey = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    if (!payload.kr) return false;
    return deriveMasterKey(payload);
  } catch {
    return false;
  }
};

const setCachedDVMMasterKey = ({ key, payload }) => {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    return deriveMasterKey(payload);
  } catch {
    return false;
  }
};

export const masterKeyRequest = async () => {
  const userKeys = getKeys();
  const ephemeralSK = generateSecretKey();

  const request = {
    kind: 5901,
    content: JSON.stringify({ t: "pidgeon-master-request", v: 3 }),
    tags: [
      ["p", DVM_PUBKEY],
      ["k", "3"],
    ],
  };
  const signedRequest = await InitEvent(request);
  if (!signedRequest) return false;

  const encryptedRequest = await encrypt44(
    userKeys,
    DVM_PUBKEY,
    JSON.stringify(request),
  );
  if (!encryptedRequest) return false;

  const seal = { kind: 13, content: encryptedRequest, tags: [] };
  const signedSeal = await InitEvent(seal);
  if (!signedSeal) return false;

  const ephemeralKeys = { sec: bytesTohex(ephemeralSK) };
  const encryptedSeal = await encrypt44(
    ephemeralKeys,
    DVM_PUBKEY,
    JSON.stringify(signedSeal),
  );
  if (!encryptedSeal) return false;

  const wrap = {
    kind: 1059,
    tags: [["p", DVM_PUBKEY]],
    content: encryptedSeal,
  };
  const signedWrap = await InitEvent({
    ...wrap,
    userKeys_: { pub: getPublicKey(ephemeralSK), sec: bytesTohex(ephemeralSK) },
  });
  if (!signedWrap) return false;

  await publishEvent(signedWrap);
  return true;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getMasterKey = async (attempt = 0) => {
  const userKeys = getKeys();
  const cacheKey = `master-key-${userKeys.pub}`;
  const cached = getCachedDVMMasterKey(cacheKey);
  if (cached) return cached;

  const rumors = await getSubData({
    filter: [{ kinds: [1059], "#p": [userKeys.pub], "#t": ["pidgeon-master-v3"] }],
    raw: true,
    timeout: 2000,
  });
  const rumor = rumors.data.length > 0 ? rumors.data[0] : false;

  if (!rumor) {
    if (attempt === 0) {
      const requested = await masterKeyRequest();
      console.log("[EventSchedulerHelper] master key requested from DVM:", requested);
    }
    if (attempt >= 8) {
      console.error("[EventSchedulerHelper] DVM never responded with a master key rumor");
      return false;
    }
    await sleep(1500);
    return getMasterKey(attempt + 1);
  }

  const seal = await decrypt44(userKeys, rumor.pubkey, rumor.content);
  if (!seal) {
    console.error("[EventSchedulerHelper] failed to decrypt master key seal");
    return false;
  }
  const parsedSeal = JSON.parse(seal);
  const unwrap = await decrypt44(userKeys, DVM_PUBKEY, parsedSeal.content);
  if (!unwrap) {
    console.error("[EventSchedulerHelper] failed to decrypt master key rumor");
    return false;
  }
  const parsedUnwrap = JSON.parse(unwrap);
  const masterPayload = JSON.parse(parsedUnwrap.content);

  return setCachedDVMMasterKey({ key: cacheKey, payload: masterPayload });
};

const getScheduleRumor = async ({ event, relays, kSubmit }) => {
  const eventData = JSON.stringify({
    tags: [["i", JSON.stringify(event), "text"]],
  });
  const encryptedData = nip44.v2.encrypt(eventData, kSubmit);
  if (!encryptedData) return false;

  const rumorEvent = {
    kind: 5905,
    content: encryptedData,
    tags: [
      ["p", DVM_PUBKEY],
      ["k", "3"],
      ["relays", ...relays],
    ],
  };
  return InitEvent(rumorEvent);
};

const getScheduleSeal = async ({ event, relays, kSubmit, userKeys }) => {
  const rumor = await getScheduleRumor({ event, relays, kSubmit });
  if (!rumor) return false;

  const encryptedData = await encrypt44(userKeys, DVM_PUBKEY, JSON.stringify(rumor));
  if (!encryptedData) return false;

  const seal = { kind: 13, content: encryptedData, tags: [] };
  return InitEvent(seal);
};

const getScheduleWrap = async ({ event, relays, kSubmit, userKeys }) => {
  const ephemeralSK = generateSecretKey();
  const seal = await getScheduleSeal({ event, relays, kSubmit, userKeys });
  if (!seal) return false;

  const ephemeralKeys = { sec: bytesTohex(ephemeralSK) };
  const encryptedSeal = await encrypt44(ephemeralKeys, DVM_PUBKEY, JSON.stringify(seal));
  if (!encryptedSeal) return false;

  const wrap = {
    kind: 1059,
    content: encryptedSeal,
    tags: [["p", DVM_PUBKEY]],
  };
  return InitEvent({
    ...wrap,
    userKeys_: { pub: getPublicKey(ephemeralSK), sec: bytesTohex(ephemeralSK) },
  });
};

export const publishScheduledEvent = async ({ event, relays }) => {
  const userKeys = getKeys();
  const masterKey = await getMasterKey();
  console.log("[EventSchedulerHelper] masterKey", masterKey);
  if (!masterKey) return false;

  const wrap = await getScheduleWrap({
    event,
    relays,
    kSubmit: masterKey.ksubmit,
    userKeys,
  });
  console.log("[EventSchedulerHelper] scheduled wrap event", wrap);
  if (!wrap) return false;

  const targetRelays = masterKey.relays?.length > 0 ? masterKey.relays : relays;
  console.log("[EventSchedulerHelper] publishing wrap to", targetRelays);
  const published = await publishEvent(wrap, targetRelays);
  console.log("[EventSchedulerHelper] publish result", published);
  return true;
};

export const cancelScheduledEvent = async ({ jobId, relays }) => {
  const deleteTags = [
    ["e", jobId],
    ["p", DVM_PUBKEY],
  ];
  const deletion = await InitEvent({
    kind: 5,
    content: "Cancel scheduled job",
    tags: deleteTags,
  });
  if (!deletion) return false;
  await publishEvent(deletion, relays);
  return true;
};

export const DVM_PUBLIC_KEY = DVM_PUBKEY;
