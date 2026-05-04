import axios from "axios";
import { InitEvent } from "./Encryptions";

const SERVER = process.env.NEXT_PUBLIC_BLOSSOM_SERVER || "https://blossom.yakihonne.com";

async function hashFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function encodeBase64URL(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getImageDimensions(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export const FileUpload = async ({ file, userKeys, cb, includeImeta = false }) => {
  try {
    const sha256 = await hashFile(file);

    const expiration = String(Math.floor(Date.now() / 1000) + 120);
    const authEvent = await InitEvent({
      kind: 24242,
      content: "Upload file",
      tags: [
        ["t", "upload"],
        ["x", sha256],
        ["expiration", expiration],
      ],
    });

    if (!authEvent) throw new Error("Failed to sign upload auth event");

    const authorization = encodeBase64URL(JSON.stringify(authEvent));

    const response = await axios.put(`${SERVER}/upload`, file, {
      headers: {
        "Content-Type": file.type,
        "Content-Length": String(file.size),
        Authorization: `Nostr ${authorization}`,
      },
      onUploadProgress: (e) => {
        if (cb && e.total) cb(Math.round((e.loaded * 100) / e.total));
      },
    });

    const url = response.data.url;
    if (!url) throw new Error("No URL in upload response");

    if (includeImeta) {
      const dim = await getImageDimensions(file);
      const imeta = [
        "imeta",
        `url ${url}`,
        `x ${sha256}`,
        `m ${file.type}`,
        ...(dim.width > 0 ? [`dim ${dim.width}x${dim.height}`] : []),
      ];
      return { url, imeta };
    }

    return { url, imeta: null };
  } catch (err) {
    console.error("[FileUpload]", err);
    return false;
  }
};
