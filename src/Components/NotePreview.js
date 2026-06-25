import React, { Fragment } from "react";
import Nip19Preview from "@/Components/Nip19Preview";
import LinkPreview from "@/Components/LinkPreview";

const nostrSchemaRegex =
  /\b(naddr1|note1|nevent1|npub1|nprofile1|nsec1|nrelay1)[a-zA-Z0-9]+\b/;

const nostrClients = [
  "nstart.me",
  "yakihonne.com",
  "njump.me",
  "nostr.com",
  "nostr.band",
  "iris.to",
  "primal.net",
  "jumble.social",
  "coracle.social",
  "nostrudel.ninja",
  "phoenix.social",
  "habla.news",
  "nosotros.app",
  "nostter.app",
  "lumilumi.app",
  "fevela.me",
  "jumblekat.com",
];

const doesContainNostrSchema = (url) => {
  try {
    const url_ = new URL(url);
    const domain = url_.hostname.replace(/^www\./, "");
    const isWhitelisted = nostrClients.some((allowed) =>
      domain.endsWith(allowed),
    );
    if (!isWhitelisted) return false;
    return nostrSchemaRegex.test(url);
  } catch {
    return false;
  }
};

function isVid(url) {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtu(?:\.be|be\.com)\/(?:watch\?v=|embed\/)?|vimeo\.com\/)([^?&]+)/;
  const match = url.match(regex);
  if (!match) return false;
  const videoId = match[1];
  if (match[0].includes("youtu"))
    return { isYT: true, videoId: videoId.replace("shorts/", "") };
  if (match[0].startsWith("https://vimeo.com"))
    return { isYT: false, videoId };
  return false;
}

function isImageUrl(url) {
  try {
    if (/^data:image/.test(url)) return { type: "image" };
    if (/^data:video/.test(url)) return { type: "video" };
    if (/(https?:\/\/[^ ]*\.(gif|png|jpg|jpeg|webp))/i.test(url))
      return { type: "image" };
    if (/(https?:\/\/[^ ]*\.(mp4|mov|webm|ogg|avi|qt|m3u8))/i.test(url))
      return { type: "video" };
    if (
      /(\/images\/|cdn\.|img\.)|\/media\/|\/uploads\/|encrypted-tbn0\.gstatic\.com\/images|i\.insider\.com\//i.test(
        url,
      ) &&
      !/\.(mp4|mov|webm|ogg|avi|qt|m3u8)$/i.test(url)
    )
      return { type: "image" };
    if (
      /([?&]format=image|[?&]type=image)/i.test(url) &&
      !/\.(mp4|mov|webm|ogg|avi|qt|m3u8)$/i.test(url)
    )
      return { type: "image" };
    return false;
  } catch {
    return false;
  }
}

function isRelayUrl(el) {
  return /^wss?:\/\/.+/.test(el);
}

function RenderImage({ src, key }) {
  return (
    <Fragment key={key}>
      <img
        src={src}
        alt=""
        loading="lazy"
        style={{
          maxWidth: "100%",
          borderRadius: "8px",
          margin: "6px 0",
          display: "block",
        }}
      />
    </Fragment>
  );
}

function RenderVideo({ src, key }) {
  return (
    <Fragment key={key}>
      <video
        src={src}
        controls
        preload="metadata"
        style={{
          maxWidth: "100%",
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: "8px",
          margin: "6px 0",
          display: "block",
          background: "#000",
        }}
      />
    </Fragment>
  );
}

function RenderYouTube({ videoId, key }) {
  return (
    <Fragment key={key}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: "8px",
          overflow: "hidden",
          margin: "6px 0",
        }}
      >
        <iframe
          loading="lazy"
          style={{ width: "100%", height: "100%", border: "none" }}
          src={`https://www.youtube.com/embed/${videoId}`}
          allowFullScreen
        />
      </div>
    </Fragment>
  );
}

function RenderVimeo({ videoId, key }) {
  return (
    <Fragment key={key}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: "8px",
          overflow: "hidden",
          margin: "6px 0",
        }}
      >
        <iframe
          loading="lazy"
          style={{ width: "100%", height: "100%", border: "none" }}
          src={`https://player.vimeo.com/video/${videoId}`}
          allowFullScreen
        />
      </div>
    </Fragment>
  );
}

function RenderAudio({ src, key }) {
  return (
    <Fragment key={key}>
      <audio
        controls
        src={src}
        style={{ width: "100%", margin: "6px 0", borderRadius: "8px" }}
      />
    </Fragment>
  );
}

function RenderNostrEntity({ addr, key }) {
  return (
    <Fragment key={key}>
      <span style={{ display: "inline-block", verticalAlign: "middle" }}>
        <Nip19Preview addr={addr} />
      </span>{" "}
    </Fragment>
  );
}

function RenderLink({ url, key }) {
  return (
    <Fragment key={key}>
      <LinkPreview url={url} />
    </Fragment>
  );
}

function RenderHashtag({ text, key }) {
  return (
    <Fragment key={key}>
      <a
        href={`/search?tab=notes&keyword=${encodeURIComponent(text.replace(/^#+/, ""))}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          color: "var(--color-primary-accent)",
          fontWeight: 500,
          cursor: "pointer",
          textDecoration: "none",
        }}
      >
        {text}
      </a>{" "}
    </Fragment>
  );
}

function RenderRelayUrl({ url, key }) {
  return (
    <Fragment key={key}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          borderRadius: "999px",
          border: "1px solid var(--color-primary-accent)",
          color: "var(--color-primary-accent)",
          fontSize: "0.8rem",
          cursor: "pointer",
        }}
      >
        {url}
      </span>{" "}
    </Fragment>
  );
}

function RenderLnbc({ lnbc, key }) {
  return (
    <Fragment key={key}>
      <span
        style={{
          display: "inline-block",
          background: "var(--color-primary-bg-side)",
          border: "1px solid var(--color-divider)",
          borderRadius: "8px",
          padding: "4px 10px",
          fontSize: "0.78rem",
          wordBreak: "break-all",
          color: "var(--color-text-secondary)",
          margin: "4px 0",
          fontFamily: "monospace",
        }}
      >
        ⚡ {lnbc.substring(0, 24)}…
      </span>{" "}
    </Fragment>
  );
}

function RenderText({ text, key }) {
  return (
    <Fragment key={key}>
      <span style={{ wordBreak: "break-word", verticalAlign: "middle" }}>{text} </span>
    </Fragment>
  );
}

export function getNoteTree(content, minimal = false) {
  if (!content) return null;

  const tree = content
    .trim()
    .split(/(\n)/)
    .flatMap((seg) => (seg === "\n" ? "\n" : seg.split(/\s+/)))
    .filter(Boolean);

  const result = [];

  for (let i = 0; i < tree.length; i++) {
    const el = tree[i].replaceAll("nostr:", "");
    const key = `${el}-${i}`;
    if (!el) continue;

    if (el === "\n") {
      const last1 = result[result.length - 1];
      const last2 = result[result.length - 2];
      if (!(last1?.type === "br" && last2?.type === "br")) {
        result.push(<br key={key} />);
      }
      continue;
    }

    if (
      /(https?:\/\/)/i.test(el) ||
      el.startsWith("data:image") ||
      el.startsWith("data:video")
    ) {
      const cleanUrl = el.replace(/[.,|']+$/, "");

      if (!minimal) {
        const platformVid = isVid(cleanUrl);
        if (platformVid) {
          if (platformVid.isYT)
            result.push(<RenderYouTube videoId={platformVid.videoId} key={key} />);
          else
            result.push(<RenderVimeo videoId={platformVid.videoId} key={key} />);
          continue;
        }

        const checkURL = isImageUrl(cleanUrl);
        if (checkURL) {
          if (checkURL.type === "image")
            result.push(<RenderImage src={cleanUrl} key={key} />);
          else if (checkURL.type === "video")
            result.push(<RenderVideo src={cleanUrl} key={key} />);
          continue;
        }

        if (
          cleanUrl.includes(".mp3") ||
          cleanUrl.includes(".ogg") ||
          cleanUrl.includes(".wav")
        ) {
          result.push(<RenderAudio src={cleanUrl} key={key} />);
          continue;
        }

        if (doesContainNostrSchema(cleanUrl)) {
          const cleanPart = cleanUrl.match(nostrSchemaRegex)?.[0];
          if (cleanPart) {
            result.push(<RenderNostrEntity addr={cleanPart} key={key} />);
            continue;
          }
        }

        result.push(<RenderLink url={cleanUrl} key={key} />);
      } else {
        result.push(<RenderLink url={cleanUrl} key={key} />);
      }
      continue;
    }

    if (isRelayUrl(el)) {
      result.push(<RenderRelayUrl url={el} key={key} />);
      continue;
    }

    if (
      (el.includes("naddr") ||
        el.includes("nprofile") ||
        el.includes("npub") ||
        el.includes("note1") ||
        el.includes("nevent")) &&
      el.length > 30
    ) {
      const nip19add = el.replace("@", "");
      const parts = nip19add.split(/([@.,?!\s:()'"`])/);
      const finalOutput = parts.map((part, idx) => {
        if (
          part?.startsWith("npub1") ||
          part?.startsWith("nprofile1") ||
          part?.startsWith("nevent") ||
          part?.startsWith("naddr") ||
          part?.startsWith("note1")
        ) {
          const cleanedPart = part.replace(/[@.,?!]/g, "");
          return (
            <Fragment key={idx}>
              <RenderNostrEntity addr={cleanedPart} key={`${key}-${idx}`} />
            </Fragment>
          );
        }
        if (part.match(nostrSchemaRegex)?.[0]) {
          return (
            <Fragment key={idx}>
              <RenderNostrEntity
                addr={part.match(nostrSchemaRegex)[0]}
                key={`${key}-${idx}`}
              />
            </Fragment>
          );
        }
        return part;
      });
      result.push(<Fragment key={key}>{finalOutput} </Fragment>);
      continue;
    }

    if (el.match(nostrSchemaRegex)?.[0]) {
      result.push(
        <RenderNostrEntity
          addr={el.match(nostrSchemaRegex)[0]}
          key={key}
        />,
      );
      continue;
    }

    if (el.toLowerCase().startsWith("lnbc") && el.length > 30) {
      result.push(<RenderLnbc lnbc={el} key={key} />);
      continue;
    }

    if (el.startsWith("#") && el.length > 1) {
      const match = el.match(/(#+)([^\s#]+)/);
      if (match) {
        result.push(<RenderHashtag text={el} key={key} />);
        continue;
      }
    }

    result.push(<RenderText text={el} key={key} />);
  }

  return result;
}

export default function NotePreview({ content, minimal = false }) {
  if (!content) return null;

  return (
    <div
      className="fit-container box-pad-h-s box-pad-v-s"
      style={{
        minHeight: "120px",
        maxHeight: "400px",
        overflow: "auto",
        lineHeight: "1.6",
      }}
      dir="auto"
    >
      {getNoteTree(content, minimal)}
    </div>
  );
}
