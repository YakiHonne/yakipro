import { Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React from "react";
import Nip19Preview from "@/Components/Nip19Preview";

/**
 * NodeView renderer — wraps the Nip19Preview component in a block node.
 * Clicking the node is intentionally non-editable; it behaves like an embed.
 */
function NostrEntityView({ node, selected }) {
  const { addr } = node.attrs;
  return (
    <NodeViewWrapper
      contentEditable={false}
      data-drag-handle
      style={{
        outline: selected ? "2px solid var(--color-primary-accent)" : "none",
        outlineOffset: 2,
        borderRadius: 10,
        margin: "6px 0",
        display: "block",
        userSelect: "none",
      }}
    >
      <Nip19Preview addr={addr} />
    </NodeViewWrapper>
  );
}

/**
 * Tiptap extension: renders any nip-19 address (npub, nprofile, naddr, note1, nevent)
 * as a rich embed card inside the article editor.
 *
 * Insert via:
 *   editor.chain().focus().insertNostrEntity({ addr: "naddr1…" }).run()
 *
 * Serialised to Markdown as:   nostr:<addr>
 * Parsed back from Markdown via the addInputRules / paste handler.
 */
const nostrSchemaRe =
  /\b(naddr1|note1|nevent1|npub1|nprofile1)[a-zA-Z0-9]+\b/;

const NostrEntityExtension = Node.create({
  name: "nostrEntity",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  isolating: false,

  addAttributes() {
    return {
      addr: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-nostr-entity]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-nostr-entity": HTMLAttributes.addr }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NostrEntityView);
  },

  addCommands() {
    return {
      insertNostrEntity:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },

  /**
   * tiptap-markdown integration:
   *  • serialize  → writes  `nostr:<addr>`  as a standalone paragraph
   *  • parse      → converts any paragraph whose text matches a nip-19 token
   *                 back into a <div data-nostr-entity="…"> so parseHTML picks it up
   */
  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          state.write(`nostr:${node.attrs.addr}`);
          state.closeBlock(node);
        },
        parse: {
          updateDOM(element) {
            const nostrRe =
              /(?:nostr:)?(naddr1|note1|nevent1|npub1|nprofile1)[a-zA-Z0-9]+/g;
            // Walk every <p> — if its entire text content is a nostr token, replace it
            element.querySelectorAll("p").forEach((p) => {
              const text = p.textContent.trim();
              const match = text.match(
                /^(?:nostr:)?((?:naddr1|note1|nevent1|npub1|nprofile1)[a-zA-Z0-9]+)$/,
              );
              if (match) {
                const div = document.createElement("div");
                div.setAttribute("data-nostr-entity", match[1]);
                div.setAttribute("addr", match[1]);
                p.replaceWith(div);
              }
            });
          },
        },
      },
    };
  },

  /** Input rule: typing `nostr:<addr>` + space auto-converts to embed */
  addInputRules() {
    return [
      {
        find: /(?:^|\s)nostr:(naddr1|note1|nevent1|npub1|nprofile1)[a-zA-Z0-9]+$/,
        handler({ range, match, chain }) {
          const addr = match[0].trim().replace("nostr:", "");
          chain().deleteRange(range).insertContent({ type: "nostrEntity", attrs: { addr } }).run();
        },
      },
      {
        find: /(?:^|\s)(naddr1|note1|nevent1|npub1|nprofile1)[a-zA-Z0-9]+$/,
        handler({ range, match, chain }) {
          const addr = match[0].trim();
          chain().deleteRange(range).insertContent({ type: "nostrEntity", attrs: { addr } }).run();
        },
      },
    ];
  },

  addPasteRules() {
    return [
      {
        find: /(?:nostr:)?(naddr1|note1|nevent1|npub1|nprofile1)[a-zA-Z0-9]+/g,
        handler({ range, match, chain }) {
          const raw = match[0];
          const addr = raw.startsWith("nostr:") ? raw.slice(6) : raw;
          chain().deleteRange(range).insertContent({ type: "nostrEntity", attrs: { addr } }).run();
        },
      },
    ];
  },
});

export default NostrEntityExtension;
