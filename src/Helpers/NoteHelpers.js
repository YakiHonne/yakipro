import { nip19 } from "nostr-tools";
import { getKeys } from "./Encryptions";

export function extractNip19(note) {
  let words = note.split(/(\s|\n)/g);
  let tags = [];
  let processedNote = [];

  for (let word of words) {
    if (word === "\n") {
      processedNote.push(word);
      continue;
    }
    let decoded = decodeNip19(word);
    if (decoded) {
      tags.push(decoded.tag);
      processedNote.push(decoded.scheme);
    } else if (word.startsWith("#")) {
      const hashContent = word.replaceAll("#", "");
      if (hashContent) tags.push(["t", hashContent]);
      processedNote.push(word);
    } else {
      processedNote.push(word);
    }
  }

  return {
    tags: removeDuplicateTags(tags),
    content: processedNote.join(""),
  };
}

function decodeNip19(word) {
  try {
    let word_ = word
      .replaceAll("@", "")
      .replaceAll("nostr:", "")
      .replaceAll(",", "")
      .replaceAll(".", "")
      .replaceAll(";", "");

    if (word_.startsWith("npub") && word_.length > 30) {
      let decoded = nip19.decode(word_);
      return {
        tag: ["p", decoded.data, "", "mention"],
        scheme: `nostr:${word_}`,
      };
    }
    if (word_.startsWith("nprofile") && word_.length > 30) {
      let decoded = nip19.decode(word_);
      return {
        tag: ["p", decoded.data.pubkey, "", "mention"],
        scheme: `nostr:${word_}`,
      };
    }
    if (word_.startsWith("nevent") && word_.length > 30) {
      let decoded = nip19.decode(word_);
      return {
        tag: ["e", decoded.data.id, "", "mention"],
        scheme: `nostr:${word_}`,
      };
    }
    if (word_.startsWith("note") && word_.length > 30) {
      let decoded = nip19.decode(word_);
      return {
        tag: ["e", decoded.data, "", "mention"],
        scheme: `nostr:${word_}`,
      };
    }
    if (word_.startsWith("naddr") && word_.length > 30) {
      let decoded = nip19.decode(word_);
      return {
        tag: [
          "a",
          `${decoded.data.kind}:${decoded.data.pubkey}:${decoded.data.identifier}`,
          "",
          "mention",
        ],
        scheme: `nostr:${word_}`,
      };
    }
  } catch {
    return false;
  }
  return false;
}

function removeDuplicateTags(tags) {
  return tags.filter(
    (tag, index, self) =>
      self.findIndex((t) => t[0] === tag[0] && t[1] === tag[1]) === index,
  );
}

export function filterImetas({ note, imetas }) {
  if (!note || !imetas || imetas.length === 0) return [];
  const urlRegex = /(https?:\/\/[^\s\n]+)/g;
  const urlsInNote = note.match(urlRegex) || [];
  return imetas.filter((imeta) => {
    const urlTag = imeta.find((tag) => typeof tag === "string" && tag.startsWith("url "));
    if (!urlTag) return false;
    const url = urlTag.replace("url ", "").trim();
    return urlsInNote.some((noteUrl) => noteUrl.includes(url));
  });
}

const DRAFT_STORAGE_KEY = "yp-note-drafts";

export function getNoteDraft() {
  try {
    const keys = getKeys();
    if (!keys) return "";
    const drafts = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "[]");
    const draft = drafts.find((d) => d.pubkey === keys.pub);
    return draft?.note || "";
  } catch {
    return "";
  }
}

export function updateNoteDraft(content) {
  try {
    const keys = getKeys();
    if (!keys) return;
    const drafts = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "[]");
    const index = drafts.findIndex((d) => d.pubkey === keys.pub);
    if (index !== -1) {
      drafts[index].note = content;
    } else {
      drafts.push({ pubkey: keys.pub, note: content });
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
  }
}
