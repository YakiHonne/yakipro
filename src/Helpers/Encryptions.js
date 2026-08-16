import { bech32 } from "bech32";
import * as secp from "@noble/secp256k1";
import { finalizeEvent, nip04, nip44 } from "nostr-tools";
import { BunkerSigner, parseBunkerInput } from "nostr-tools/nip46";

export const bytesTohex = (bytes) => Buffer.from(bytes).toString("hex");

export const hexToBytes = (hex) => Uint8Array.from(Buffer.from(hex, "hex"));

export const getBech32 = (prefix, hexKey) => {
  const words = bech32.toWords(hexToBytes(hexKey));
  return bech32.encode(prefix, words, 1000);
};

export const getHex = (bech32Key) => {
  try {
    const { words } = bech32.decode(bech32Key, 1000);
    return bytesTohex(bech32.fromWords(words));
  } catch {
    throw new Error(`Invalid bech32 key: ${bech32Key}`);
  }
};

export const isValidHexKey = (key) => {
  try {
    return /^[0-9a-f]{64}$/i.test(key) && secp.utils.isValidPrivateKey(key);
  } catch {
    return false;
  }
};

export const getLoginsParams = async (publicKey, userKeys) => {
  try {
    let content = JSON.stringify({
      pubkey: publicKey,
      sent_at: Math.floor(new Date().getTime() / 1000),
    });

    let password = await encrypt44(
      userKeys,
      process.env.NEXT_PUBLIC_CHECKER_PUBKEY,
      content,
    );

    return { password, pubkey: publicKey };
  } catch (err) {
    console.log(err);
    return { password: false, pubkey: false };
  }
};

export const encrypt44 = async (userKeys, otherPartyPubkey, content) => {
  try {
    let encryptedMessage = "";
    if (userKeys.ext) {
      encryptedMessage = await window.nostr.nip44.encrypt(
        otherPartyPubkey,
        content,
      );
    } else if (userKeys.sec) {
      encryptedMessage = nip44.v2.encrypt(
        content,
        nip44.v2.utils.getConversationKey(
          hexToUint8Array(userKeys.sec),
          otherPartyPubkey,
        ),
      );
    } else {
      encryptedMessage = await encrypt44UsingBunker(
        userKeys,
        otherPartyPubkey,
        content,
      );
    }
    return encryptedMessage;
  } catch (err) {
    return false;
  }
};

export const decrypt44 = async (userKeys, otherPartyPubkey, content) => {
  try {
    let decryptedMessage = "";
    if (userKeys.ext) {
      decryptedMessage = await window.nostr.nip44.decrypt(
        otherPartyPubkey,
        content,
      );
    } else if (userKeys.sec) {
      decryptedMessage = await nip44.v2.decrypt(
        content,
        nip44.v2.utils.getConversationKey(
          hexToUint8Array(userKeys.sec),
          otherPartyPubkey,
        ),
      );
    } else {
      decryptedMessage = await decrypt44UsingBunker(
        userKeys,
        otherPartyPubkey,
        content,
      );
    }
    return decryptedMessage;
  } catch (err) {
    return false;
  }
};

export const decrypt04 = async (event, userKeys) => {
  try {
    let pubkey =
      event.pubkey === userKeys.pub
        ? event.tags.find((tag) => tag[0] === "p")[1]
        : event.pubkey;

    let decryptedMessage = "";
    if (userKeys.ext) {
      decryptedMessage = await window.nostr.nip04.decrypt(
        pubkey,
        event.content,
      );
    } else if (userKeys.sec) {
      decryptedMessage = await nip04.decrypt(
        userKeys.sec,
        pubkey,
        event.content,
      );
    } else {
      decryptedMessage = await decrypt04UsingBunker(
        userKeys,
        pubkey,
        event.content,
      );
    }
    return decryptedMessage;
  } catch (err) {
    return false;
  }
};

export const encrypt04 = async (userKeys, otherPartyPubkey, content) => {
  try {
    let encryptedMessage = "";
    if (userKeys.ext) {
      encryptedMessage = await window.nostr.nip04.encrypt(
        otherPartyPubkey,
        content,
      );
    } else if (userKeys.sec) {
      encryptedMessage = await nip04.encrypt(
        userKeys.sec,
        otherPartyPubkey,
        content,
      );
    } else {
      encryptedMessage = await encrypt04UsingBunker(
        userKeys,
        otherPartyPubkey,
        content,
      );
    }
    return encryptedMessage;
  } catch (err) {
    return false;
  }
};

export const decrypt04UsingBunker = async (
  userKeys,
  otherPartyPubkey,
  content,
) => {
  try {
    const bunkerPointer = await parseBunkerInput(userKeys.bunker);
    const bunker = BunkerSigner.fromBunker(
      hexToUint8Array(userKeys.localKeys.sec),
      bunkerPointer,
      {
        onauth: (url) => {
          window.open(
            url,
            "_blank",
            "width=600,height=650,scrollbars=yes,resizable=yes",
          );
        },
      },
    );
    await bunker.connect();
    let data = await bunker.nip04Decrypt(otherPartyPubkey, content);
    return data;
  } catch (err) {
    console.log(err);
    return "";
  }
};

export const encrypt04UsingBunker = async (
  userKeys,
  otherPartyPubkey,
  content,
) => {
  try {
    const bunkerPointer = await parseBunkerInput(userKeys.bunker);
    const bunker = BunkerSigner.fromBunker(
      hexToUint8Array(userKeys.localKeys.sec),
      bunkerPointer,
      {
        onauth: (url) => {
          window.open(
            url,
            "_blank",
            "width=600,height=650,scrollbars=yes,resizable=yes",
          );
        },
      },
    );
    await bunker.connect();

    let data = await bunker.nip04Encrypt(otherPartyPubkey, content);
    return data;
  } catch (err) {
    console.log(err);
    return "";
  }
};

export const encrypt44UsingBunker = async (
  userKeys,
  otherPartyPubkey,
  content,
) => {
  try {
    const bunkerPointer = await parseBunkerInput(userKeys.bunker);
    const bunker = BunkerSigner.fromBunker(
      hexToUint8Array(userKeys.localKeys.sec),
      bunkerPointer,
      {
        onauth: (url) => {
          window.open(
            url,
            "_blank",
            "width=600,height=650,scrollbars=yes,resizable=yes",
          );
        },
      },
    );
    await bunker.connect();

    let data = await bunker.nip44Encrypt(otherPartyPubkey, content);
    return data;
  } catch (err) {
    console.log(err);
    return "";
  }
};

export const decrypt44UsingBunker = async (
  userKeys,
  otherPartyPubkey,
  content,
) => {
  try {
    const bunkerPointer = await parseBunkerInput(userKeys.bunker);
    const bunker = BunkerSigner.fromBunker(
      hexToUint8Array(userKeys.localKeys.sec),
      bunkerPointer,
      {
        onauth: (url) => {
          window.open(
            url,
            "_blank",
            "width=600,height=650,scrollbars=yes,resizable=yes",
          );
        },
      },
    );
    await bunker.connect();

    let data = await bunker.nip44Decrypt(otherPartyPubkey, content);
    return data;
  } catch (err) {
    console.log(err);
    return "";
  }
};

export const InitEvent = async ({
  kind,
  content = "",
  tags,
  created_at,
  userKeys_ = false,
}) => {
  try {
    let userKeys = userKeys_ || getKeys();
    let temCreatedAt = created_at || Math.floor(Date.now() / 1000);
    let tempEvent = {
      created_at: temCreatedAt,
      kind,
      content,
      tags,
    };

    if (userKeys.ext) {
      try {
        tempEvent = await window.nostr.signEvent(tempEvent);
      } catch (err) {
        console.log(err);
        return false;
      }
    } else if (userKeys.bunker) {
      const bunkerPointer = await parseBunkerInput(userKeys.bunker);
      const bunker = BunkerSigner.fromBunker(
        hexToUint8Array(userKeys.localKeys.sec),
        bunkerPointer,
        {
          onauth: (url) => {
            window.open(
              url,
              "_blank",
              "width=600,height=650,scrollbars=yes,resizable=yes",
            );
          },
        },
      );
      tempEvent = await bunker.signEvent(tempEvent);
    } else {
      tempEvent = finalizeEvent(tempEvent, hexToUint8Array(userKeys.sec));
    }

    return tempEvent;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const getEmptyuserMetadata = (pubkey) => {
  let backupName = "";
  if (pubkey) {
    backupName = pubkey.substring(0, 10);
  }
  return {
    kind: 0,
    name: backupName,
    display_name: backupName,
    picture: "",
    banner: "",
    about: "",
    lud06: "",
    lud16: "",
    nip05: "",
    website: "",
    pubkey,
    created_at: 0,
  };
};

export const getParsedAuthor = (data) => {
  let content = {};
  try {
    content = data.content ? JSON.parse(data.content) : {};
  } catch (err) {
    console.log(err);
  }
  let tempAuthor = {
    kind: 0,
    display_name:
      content?.display_name || content?.name || data.pubkey.substring(0, 10),
    name: content?.name || content?.display_name || data.pubkey.substring(0, 10),
    picture: content?.picture || "",
    pubkey: data.pubkey,
    banner: content?.banner || "",
    about: content?.about || "",
    lud06: content?.lud06 || "",
    lud16: content?.lud16 || "",
    website: content?.website || "",
    nip05: content?.nip05 || "",
  };
  return tempAuthor;
};

export const getKeys = () => {
  try {
    let keys = localStorage.getItem("_nostruserkeys");
    keys = JSON.parse(keys);
    return keys;
  } catch (err) {
    return false;
  }
};

export function hexToUint8Array(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return array;
}

// Mirrors the download used on YakiV5 for wallet credentials. `allowMobile` is
// false there because a touch device typically has nowhere to put the file, and
// silently "downloading" it would strand the only copy of the NWC secret.
export const downloadAsFile = (
  text,
  type = "application/json",
  name,
  allowMobile = true,
) => {
  if (typeof window === "undefined") return false;
  const isTouchScreen = window.matchMedia("(pointer: coarse)").matches;
  if (isTouchScreen && !allowMobile) return false;

  const content =
    type === "application/json" ? JSON.stringify(text, null, 2) : text;

  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  return true;
};

const LNURL_REGEX =
  /^(?:http.*[&?]lightning=|lightning:)?(lnurl[0-9]{1,}[02-9ac-hj-np-z]+)/;
const LN_ADDRESS_REGEX =
  /^((?:[^<>()\[\]\\.,;:\s@"]+(?:\.[^<>()\[\]\\.,;:\s@"]+)*)|(?:".+"))@((?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(?:(?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const LNURLP_REGEX = /^lnurlp:\/\/.*/;

const parseLnUrl = (url) => {
  if (!url) return null;
  const result = LNURL_REGEX.exec(url.toLowerCase());
  return result ? result[1] : null;
};

const parseLightningAddress = (address) => {
  if (!address) return null;
  const result = LN_ADDRESS_REGEX.exec(address);
  return result ? { username: result[1], domain: result[2] } : null;
};

const parseLnurlp = (url) => {
  if (!url) return null;

  const parsedUrl = url.toLowerCase();
  if (!LNURLP_REGEX.test(parsedUrl)) return null;

  const protocol = parsedUrl.includes(".onion") ? "http://" : "https://";
  return parsedUrl.replace("lnurlp://", protocol);
};

export const decodeUrlOrAddress = (lnUrlOrAddress) => {
  const bech32Url = parseLnUrl(lnUrlOrAddress);
  if (bech32Url) {
    const decoded = bech32.decode(bech32Url, 20000);
    return Buffer.from(bech32.fromWords(decoded.words)).toString();
  }

  const address = parseLightningAddress(lnUrlOrAddress);
  if (address) {
    const { username, domain } = address;
    const protocol = domain.match(/\.onion$/) ? "http" : "https";
    return `${protocol}://${domain}/.well-known/lnurlp/${username}`;
  }

  return parseLnurlp(lnUrlOrAddress);
};

export const encodeLud06 = (url) => {
  try {
    let words = bech32.toWords(Buffer.from(url, "utf8"));
    return bech32.encode("lnurl", words, 2000);
  } catch {
    return "";
  }
};
