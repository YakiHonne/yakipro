# What is YakiPro?

A creator workspace on `Nostr` for long-form & notes publishing. YakiPro is where you write, schedule, paywall, and measure your content, articles and notes signed with your own key and published to relays you control.

It is a companion to [YakiHonne](https://yakihonne.com), the decentralized social client, and speaks the same protocol: the same key, the same relays, the same events.

YakiHonne runs its own relays under [nostr-01.yakihonne.com](https://nostr-01.yakihonne.com) and [nostr-02.yakihonne.com](https://nostr-02.yakihonne.com) for creators to publish their content, free of charge. The relay is based on [strfry](https://github.com/hoytech/strfry) and written in cpp if you would like to check it out.

# 1. Features

## 1.1 Accounts & sign-in

- [x] Private key sign-in: `nsec` or raw hex (NIP-19)
- [x] Browser extension signing (NIP-07)
- [x] Remote signer support (NIP-46), by `bunker://` URI or a scannable `nostrconnect://` QR code
- [x] Google sign-in, with FROST threshold key splitting — the key is sharded across signer operators with a user-chosen threshold, so no single server ever holds the whole key. The app then signs over NIP-46 and never holds the secret locally
- [x] On-the-go account creation, with credentials force-downloaded before the account is completed
- [x] Account-scoped caches, wiped on every login and logout so nothing leaks between accounts

## 1.2 Content

| Type | Route | Kinds |
|---|---|---|
| Notes | `/create-content`, `/content` | 1 |
| Long-form articles | `/article/[naddr]`, `/create-content` | 30023 |
| Article drafts (on relay) | `/content`, `/edit-content/[naddr]` | 30024 |
| Scheduled notes | `/create-content`, `/content` | 1, queued over 30078 |
| Premium content | same editors, premium toggle | 1 / 30023 + `nip63` |

- [x] Publishing to your own write relays, resolved from your relay list rather than a fixed pool
- [x] Note scheduling through a DVM, with jobs NIP-44 encrypted and sealed as gift wraps (NIP-59), readable back and cancellable
- [x] Local autosave for articles, plus on-relay drafts you can reopen from any device
- [x] Editing and republishing existing articles by `naddr`

## 1.3 Article editor

- [x] TipTap-based WYSIWYG that serializes to markdown
- [x] Nostr entity embeds rendered inline (`nevent`, `naddr`, `npub`, `note`, `nprofile`)
- [x] Tables, math (KaTeX), syntax-highlighted code blocks, text alignment, highlight, sub/superscript, images
- [x] PDF-to-Markdown import, including embedded images
- [x] Markdown import and export
- [x] AI writing assistant, applied through a per-hunk accept/reject diff view inside the editor
- [x] Second Reader — AI personas that react to your draft as you write, with paragraph-level feedback
- [x] Energy Mapper for notes, visualising how a note reads before you send it
- [x] Image uploads attached as `imeta` tags (NIP-94)

## 1.4 Premium content

- [x] Paywalled notes and articles, gated at the relay rather than in the client
- [x] Premium events are tagged protected (NIP-70) and published **exclusively** to relays that advertise support in their NIP-11 document — if none resolve, publishing is refused rather than falling back to the public pool
- [x] Pre-flight warning when you toggle premium without a premium relay or monetization set up
- [x] Reader-side access resolved from the gateway's follow list on the premium relays

## 1.5 Media & relays

- [x] Blossom media servers for uploads, with a management page at `/media`
- [x] Blossom server lists read and seeded as kind 10063, with per-server upload, mirroring, and deletion
- [x] Storage quota and usage display
- [x] Relay management, with relay lists read and published as kind 10002 (NIP-65)
- [x] Relay authentication (NIP-42), including waiting for the AUTH exchange to settle before reading
- [x] Relay metadata checked against each relay's own NIP-11 document
- [x] Premium relay discovery, verified rather than trusted from a directory

## 1.6 Analytics

- [x] Follower growth, top content, and engagement over time, computed from relay events
- [x] Live activity ticker and a "while you were away" digest
- [x] A sync engine that pages history from your relays and stays subscribed for new events
- [x] Everything stored locally in IndexedDB — your stats are derived from Nostr, not from a tracker
- [x] On-demand resync

## 1.7 Interface

- [x] 12 interface languages: Arabic, Chinese, English, French, Hindi, Hungarian, Italian, Japanese, Portuguese, Russian, Spanish, Thai
- [x] Right-to-left layout for Arabic
- [x] Light and dark themes, plus system
- [x] Yaki Points, earned for publishing and engagement

## 1.8 Supported NIPs

NIP-01, NIP-04, NIP-05, NIP-07, NIP-11, NIP-19, NIP-23, NIP-42, NIP-44, NIP-46, NIP-59, NIP-63, NIP-63a, NIP-65, NIP-70, NIP-78, NIP-94.

Kind 9735 zap receipts are consumed for analytics. NIP-63 is used for premium relay-gated content; it is a YakiHonne-side spec rather than a mainline NIP.

Media uploads additionally implement the [Blossom](https://github.com/hzrd149/blossom) (BUD) spec, which is not a NIP.

## 1.9 Relay

[nostr-01.yakihonne.com](https://nostr-01.yakihonne.com) and [nostr-02.yakihonne.com](https://nostr-02.yakihonne.com) are fully based on the [strfry](https://github.com/hoytech/strfry) implementation.

[premium.yakihonne.com](https://premium.yakihonne.com) is fully based on the [strfry](https://github.com/hoytech/strfry) implementation and supports NIP-63.

# 2. Tech stack

- [Next.js](https://nextjs.org) 16 (pages router) with React 19
- [NDK](https://github.com/nostr-dev-kit/ndk) for Nostr, with a Dexie/IndexedDB cache adapter and the outbox model enabled
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) for key handling and NIP-19 encoding
- Redux Toolkit for state
- i18next + react-i18next, locales fetched at runtime from `public/locales/{lng}/common.json`
- TipTap 3 for the article editor, serialized with `tiptap-markdown`
- Dexie for local analytics and AI chat storage
- Plain CSS in `src/styles/`, themed with `next-themes`

# 3. Getting started

Requires [pnpm](https://pnpm.io).

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev
```

The dev server runs on [http://localhost:3700](http://localhost:3700).

```bash
pnpm build   # production build
pnpm start   # serve the production build
pnpm lint
```

Pages live in `src/pages`, shared components in `src/Components`, page-level components in `src/PagesComponents`, Nostr and signing logic in `src/Helpers`, and relay-backed data hooks in `src/hooks`.
