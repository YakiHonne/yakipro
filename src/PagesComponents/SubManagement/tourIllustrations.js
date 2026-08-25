import React from "react";

/**
 * Animated SVG illustrations for the Sub-management tour.
 *
 * Glass style: frosted panels + accent glow, matching the onboarding card.
 *
 * These are miniatures of the REAL Manage subs screen, not an abstract
 * metaphor: a relay row (round icon, name, crown, button/sticker) and the
 * Delegated / Direct / Payment history tab pills. Seeing a shrunk version of
 * the actual UI mid-action is what makes the real screen legible the first
 * time the user opens it. "Relay" is used freely: Nostr users already know it.
 *
 * Legibility rules these obey, because breaking them is what made an earlier
 * pass read as cluttered:
 *  - ONE animated focal point per slide. Two things moving at once reads as
 *    flicker at this size, not as a sequence.
 *  - At most three text strings in the SVG. The description sits directly
 *    below the art; anything restated here is noise at half the size.
 *  - Nothing below 6.4px, which is the floor for readability at card width.
 *  - Everything on the same 288px-wide row grid at x=16, so the slides
 *    feel like one screen rather than six separate drawings.
 *
 * All animation is declarative SMIL/CSS inside the SVG so nothing needs JS,
 * and every loop is infinite. Colors come from the app's CSS custom
 * properties so the illustrations follow the active theme.
 */

const ACCENT = "var(--color-primary-accent)";
const TEXT = "var(--color-primary-text)";
const MUTED = "var(--color-secondary-text)";
const GREEN = "var(--color-green-main)";

const VB = "0 0 320 180";

/**
 * Proportions taken from the real Manage subs row (RelaysList.js), expressed
 * as ratios of row height so the miniature reads at the same weight as the
 * screen it is teaching:
 *
 *   row 56  ->  avatar 38 (.68)   crown 20 (.36)   name 16 (.29)   url 12 (.21)
 *
 * Earlier passes ran name/row at .16, which is why the art looked amateur:
 * the furniture was full-size but the type was half-size.
 */
const ROW = 44;
const FS_NAME = 12.6;
const FS_URL = 9.4;
const FS_LABEL = 10.4;
const FS_SMALL = 9.4;
const AV_R = 14.9;

/* ─────────────────────────── shared primitives ─────────────────────────── */

const Frame = ({ children, label }) => (
  <svg
    viewBox={VB}
    width="100%"
    height="100%"
    role="img"
    aria-label={label}
    style={{
      display: "block",
      overflow: "visible",
      // Without this the SVG falls back to the generic serif and every bold
      // label renders as heavy Times, nothing like the app.
      fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    }}
  >
    {children}
  </svg>
);

const GlassDefs = () => (
  <defs>
    <linearGradient id="gPanel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.03" />
    </linearGradient>
    <linearGradient id="gAccent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor={ACCENT} stopOpacity="0.55" />
      <stop offset="100%" stopColor={ACCENT} stopOpacity="0.12" />
    </linearGradient>
    <radialGradient id="gGlow">
      <stop offset="0%" stopColor={ACCENT} stopOpacity="0.42" />
      <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
    </radialGradient>
    <filter id="gBlur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="7" />
    </filter>
  </defs>
);

const Glow = ({ cx, cy, r = 40, dur = "4.5s" }) => (
  <circle cx={cx} cy={cy} r={r} fill="url(#gGlow)" filter="url(#gBlur)">
    <animate attributeName="opacity" values="0.55;1;0.55" dur={dur} repeatCount="indefinite" />
  </circle>
);

// The app's fallback avatar: a head and shoulders inside a circle.
const Avatar = ({ x, y, r = AV_R, accent }) => (
  <g>
    <circle
      cx={x}
      cy={y}
      r={r}
      fill="url(#gPanel)"
      stroke={accent ? ACCENT : "#ffffff"}
      strokeOpacity={accent ? 0.55 : 0.2}
      strokeWidth="1"
    />
    <circle cx={x} cy={y - r * 0.26} r={r * 0.34} fill={accent ? ACCENT : MUTED} opacity="0.75" />
    {/* Shoulders: a shallow cap, not a smile. An earlier version used a deep
        arc at .38 depth which read as a grinning face at card size. */}
    <path
      d={`M${x - r * 0.56} ${y + r * 0.62} a${r * 0.56} ${r * 0.5} 0 0 1 ${r * 1.12} 0`}
      fill="none"
      stroke={accent ? ACCENT : MUTED}
      strokeWidth={r * 0.16}
      strokeLinecap="round"
      opacity="0.75"
    />
  </g>
);

// The server glyph the app shows when a relay has no icon (Icon name="server",
// 24px inside a 38px circle -> .63 of the circle).
const ServerGlyph = ({ x, y, r }) => {
  const w = r * 1.05;
  const h = r * 0.42;
  return (
    <g opacity="0.9">
      <g stroke={MUTED} strokeWidth={r * 0.09} fill="none">
        <rect x={x - w / 2} y={y - h - r * 0.09} width={w} height={h} rx={h * 0.3} />
        <rect x={x - w / 2} y={y + r * 0.09} width={w} height={h} rx={h * 0.3} />
      </g>
      <circle cx={x - w / 2 + h * 0.55} cy={y - h / 2 - r * 0.09} r={r * 0.06} fill={MUTED} />
      <circle cx={x - w / 2 + h * 0.55} cy={y + h / 2 + r * 0.09} r={r * 0.06} fill={MUTED} />
    </g>
  );
};

// The real crown, from lucide-react, sized as a ratio of the row like the app
// does (20px icon in a 56px row).
const Crown = ({ x, y, size = ROW * 0.36 }) => (
  <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 24})`}>
    <g
      fill="none"
      stroke={ACCENT}
      // lucide authors at 2px on a 24px grid; scaling the glyph down thins the
      // stroke, so scale it back up to keep the crown's weight matched to the
      // status icons beside it.
      strokeWidth={2 * (24 / size) * 0.68}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"
        fill={ACCENT}
        fillOpacity="0.2"
      />
      <path d="M5 21h14" />
    </g>
  </g>
);

// A relay row, at the real screen's proportions.
const RelayRow = ({ x = 16, y, w = 288, h = ROW, premium, name, url, glow, children }) => {
  const mid = y + h / 2;
  const avR = (h * 38) / 56 / 2;
  const avX = x + h * 0.34 + avR * 0.2;
  return (
    <g>
      {glow && <Glow cx={avX} cy={mid} r={h * 0.72} dur="3.2s" />}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={h * 0.34}
        fill="url(#gPanel)"
        stroke={premium ? ACCENT : "#ffffff"}
        strokeOpacity={premium ? 0.55 : 0.14}
        strokeWidth="1"
      />
      <circle cx={avX} cy={mid} r={avR} fill="#ffffff" fillOpacity="0.07" />
      <ServerGlyph x={avX} y={mid} r={avR * 0.86} />
      <text
        x={avX + avR + h * 0.24}
        y={url ? mid - h * 0.06 : mid + FS_NAME * 0.35}
        fontSize={FS_NAME}
        fill={TEXT}
        fontWeight="600"
      >
        {name}
      </text>
      {url ? (
        <text x={avX + avR + h * 0.24} y={mid + FS_URL * 1.07} fontSize={FS_URL} fill={MUTED}>
          {url}
        </text>
      ) : null}
      {children}
    </g>
  );
};

// A pill, matching .btn / .sticker-* : text at .62 of the pill height.
const Pill = ({ x, y, w, h = ROW * 0.5, label, tone = "muted", filled }) => {
  const stroke = tone === "accent" ? ACCENT : tone === "green" ? GREEN : "#ffffff";
  const textColor = tone === "accent" ? ACCENT : tone === "green" ? GREEN : MUTED;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={h / 2}
        fill={filled ? "url(#gAccent)" : "url(#gPanel)"}
        stroke={stroke}
        strokeOpacity={tone === "muted" ? 0.22 : 0.7}
        strokeWidth="1"
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + h * 0.175}
        textAnchor="middle"
        fontSize={h * 0.5}
        fill={textColor}
        fontWeight="500"
      >
        {label}
      </text>
    </g>
  );
};

// A switch, at the app's proportions: track 2.1:1, knob .78 of track height.
// `on` drives both the knob position and the track fill.
const Toggle = ({ x, y, h = 22, children }) => {
  const w = h * 2.1;
  const kr = (h * 0.78) / 2;
  return (
    <g>
      <rect x={x} y={y - h / 2} width={w} height={h} rx={h / 2} fill="#ffffff" fillOpacity="0.10" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1" />
      {children({ x, y, w, h, kr })}
    </g>
  );
};

// Tick / cross marks, sized like the app's 20px status icons.
const Tick = ({ x, y, size = 15, color = GREEN }) => (
  <path
    d={`M${x - size * 0.3} ${y} l${size * 0.22} ${size * 0.22} l${size * 0.42} -${size * 0.48}`}
    fill="none"
    stroke={color}
    strokeWidth={size * 0.13}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

const AcceptMark = ({ x, y, begin = "0s", dur = "3.6s" }) => (
  <g opacity="0">
    <circle cx={x} cy={y} r="10" fill={GREEN} opacity="0.16" />
    <Tick x={x} y={y} size={15} />
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.75;1" dur={dur} begin={begin} repeatCount="indefinite" />
  </g>
);

const RejectMark = ({ x, y, begin = "0s", dur = "3.6s" }) => (
  <g opacity="0">
    <circle cx={x} cy={y} r="10" fill={MUTED} opacity="0.12" />
    <g stroke={MUTED} strokeWidth="1.9" strokeLinecap="round">
      <line x1={x - 3.6} y1={y - 3.6} x2={x + 3.6} y2={y + 3.6} />
      <line x1={x + 3.6} y1={y - 3.6} x2={x - 3.6} y2={y + 3.6} />
    </g>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.6;1" dur={dur} begin={begin} repeatCount="indefinite" />
  </g>
);

// A subscriber row: avatar + name, status slot on the right.
const SubRow = ({ top, h = ROW, name, accent, children }) => {
  const mid = top + h / 2;
  const avR = (h * 38) / 56 / 2;
  const avX = 16 + h * 0.34 + avR * 0.2;
  return (
    <g>
      <rect x={16} y={top} width={288} height={h} rx={h * 0.34} fill="url(#gPanel)" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
      <Avatar x={avX} y={mid} r={avR} accent={accent} />
      <text x={avX + avR + h * 0.24} y={mid + FS_NAME * 0.35} fontSize={FS_NAME} fill={TEXT} fontWeight="600">
        {name}
      </text>
      {children}
    </g>
  );
};

// The tab switcher, matching SelectTabs.js.
const TabSwitcher = ({ x = 16, y, labels, w = 288, h = ROW * 0.66 }) => {
  // The real SelectTabs sizes each cell to its label; equal thirds made
  // "Payment history" overflow its 96px cell. Weight the cells by text length
  // so the long one gets the room it needs.
  const weights = labels.map((l) => l.length + 4);
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((wt) => (wt / total) * w);
  const offsets = widths.reduce((acc, cw, i) => [...acc, (acc[i] ?? 0) + cw], [0]);
  const xs = labels.map((_, i) => x + offsets[i] + 2);
  const xValues = [xs[0], xs[0], xs[1], xs[1], xs[2], xs[2], xs[0]].join(";");
  const keyTimes = "0;0.325;0.335;0.66;0.67;0.995;1";
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="url(#gPanel)" stroke="#ffffff" strokeOpacity="0.12" />
      <rect x={xs[0]} y={y + 2} width={widths[0] - 4} height={h - 4} rx={(h - 4) / 2} fill="url(#gAccent)">
        <animate attributeName="width" values={[widths[0], widths[0], widths[1], widths[1], widths[2], widths[2], widths[0]].map((v) => v - 4).join(";")} keyTimes={keyTimes} dur="8.4s" repeatCount="indefinite" />
        <animate attributeName="x" values={xValues} keyTimes={keyTimes} dur="8.4s" repeatCount="indefinite" />
      </rect>
      {labels.map((l, i) => (
        <text key={l} x={x + offsets[i] + widths[i] / 2} y={y + h / 2 + h * 0.14} textAnchor="middle" fontSize={h * 0.40} fill={TEXT} fontWeight="500">
          {l}
          <animate
            attributeName="fill-opacity"
            values={i === 0 ? "1;1;0.55;0.55;0.55;0.55;1" : i === 1 ? "0.55;0.55;1;1;0.55;0.55;0.55" : "0.55;0.55;0.55;0.55;1;1;0.55"}
            keyTimes={keyTimes}
            dur="8.4s"
            repeatCount="indefinite"
          />
        </text>
      ))}
    </g>
  );
};

/* ══════════════════════════════ the 6 slides ═════════════════════════════ */

const glass = {
  // Three relay rows; only the crowned one accepts the paid post.
  // 3 x 44 rows with 12 gaps = 156, centred in 180 -> 12 top / 12 bottom.
  premium: (
    <Frame label="Only a premium relay accepts a paid post">
      <GlassDefs />
      <RelayRow y={12} name="relay.example.com">
        <RejectMark x={276} y={34} begin="0.9s" />
      </RelayRow>
      <RelayRow y={68} premium glow name="premium.yakihonne.com">
        <Crown x={244} y={90} />
        <AcceptMark x={276} y={90} begin="1.8s" />
      </RelayRow>
      <RelayRow y={124} name="nos.lol">
        <RejectMark x={276} y={146} begin="1.35s" />
      </RelayRow>
    </Frame>
  ),

  // The join flow: paste the operator's code, the row flips to Member.
  join: (
    <Frame label="Joining a premium relay with an invite code">
      <GlassDefs />

      <RelayRow y={32} premium glow name="creator.relay">
        <Crown x={196} y={54} />
        <g opacity="1">
          <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.60;0.66;0.94;1" dur="6s" repeatCount="indefinite" />
          <Pill x={222} y={54 - 11} w={72} h={22} label="Join relay" tone="accent" />
        </g>
        <g opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.62;0.68;0.96;1" dur="6s" repeatCount="indefinite" />
          <Pill x={222} y={54 - 11} w={72} h={22} label="Member" tone="green" />
        </g>
      </RelayRow>

      <g>
        <rect x={16} y={104} width={288} height={ROW} rx={ROW * 0.34} fill="url(#gPanel)" stroke={ACCENT} strokeOpacity="0.45" strokeWidth="1" />
        <text x={32} y={126 + FS_URL * 0.35} fontSize={FS_URL} fill={MUTED}>
          Invitation code
        </text>
        <text x={168} y={126 + FS_NAME * 0.35} fontSize={FS_NAME} fill={TEXT} fontWeight="600" fontFamily="monospace">
          <tspan opacity="0">
            7F2A
            <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.10;0.16;0.94;1" dur="6s" repeatCount="indefinite" />
          </tspan>
          <tspan opacity="0">
            -9KDQ
            <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.34;0.40;0.94;1" dur="6s" repeatCount="indefinite" />
          </tspan>
        </text>
        <rect y={117} width="1.6" height={FS_NAME} fill={ACCENT}>
          <animate attributeName="x" values="168;204;204;246;246" keyTimes="0;0.16;0.34;0.46;1" dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.52;0.58;0.96;1" dur="6s" repeatCount="indefinite" />
        </rect>
      </g>
    </Frame>
  ),

  // Auto-join: the plan hands membership down; the row settles on its own.
  auto: (
    <Frame label="Your plan already joined you to our relay">
      <GlassDefs />

      <g>
        <rect x={96} y={24} width={128} height={26} rx={13} fill="url(#gAccent)" />
        <text x={160} y={37 + FS_SMALL * 0.35} textAnchor="middle" fontSize={FS_SMALL} fill={TEXT} fontWeight="600">
          your paid plan
        </text>
      </g>

      <path d="M160 56 L160 86" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" opacity="0.85">
        <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1.6s" repeatCount="indefinite" />
      </path>
      <circle r="3" fill={ACCENT}>
        <animateMotion dur="2.6s" repeatCount="indefinite" path="M160,56 L160,86" />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.82;1" dur="2.6s" repeatCount="indefinite" />
      </circle>

      {/* No crown on this row: at 12.6px the full hostname plus a crown plus a
          Member pill does not fit 288px. The accent border already marks it as
          premium, and slide 1 is where the crown is taught. */}
      <RelayRow y={96} h={52} premium glow name="premium.yakihonne.com" url="wss://premium.yakihonne.com">
        <g opacity="0">
          <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.26;0.34;1" dur="4.4s" repeatCount="indefinite" />
          <Pill x={222} y={122 - 11} w={72} h={22} label="Member" tone="green" />
        </g>
        <g opacity="1">
          <animate attributeName="opacity" values="1;1;1;0;0" keyTimes="0;0.04;0.26;0.34;1" dur="4.4s" repeatCount="indefinite" />
          <circle cx={258} cy={122} r="9" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeDasharray="28 16">
            <animateTransform attributeName="transform" type="rotate" from="0 258 122" to="360 258 122" dur="0.8s" repeatCount="indefinite" />
          </circle>
        </g>
      </RelayRow>
    </Frame>
  ),

  // Allow delegation once, and the subscriber list fills itself.
  delegation: (
    <Frame label="Allow delegation once, and your subscriber list fills itself">
      <GlassDefs />

      <RelayRow y={10} premium name="premium.yakihonne.com">
        {/* No inline "Allow delegation" caption: the hostname already runs to
            x=205 and the caption would need x=118..196, a straight overlap.
            The toggle is the affordance, and the slide title carries the name
            of the control. */}
        <Toggle x={252} y={32} h={22}>
          {({ x, y, w, h, kr }) => (
            <>
              <rect x={x} y={y - h / 2} width={w} height={h} rx={h / 2} fill={GREEN} opacity="0">
                <animate attributeName="opacity" values="0;0;0.3;0.3;0" keyTimes="0;0.10;0.14;0.985;1" dur="9s" repeatCount="indefinite" />
              </rect>
              <circle cy={y} r={kr} fill={MUTED}>
                <animate attributeName="cx" values={`${x + h / 2};${x + h / 2};${x + w - h / 2};${x + w - h / 2};${x + h / 2}`} keyTimes="0;0.10;0.14;0.985;1" dur="9s" repeatCount="indefinite" />
                <animate attributeName="fill" values={`${MUTED};${MUTED};${GREEN};${GREEN};${MUTED}`} keyTimes="0;0.10;0.14;0.985;1" dur="9s" repeatCount="indefinite" />
              </circle>
            </>
          )}
        </Toggle>
      </RelayRow>

      <text x={18} y={72} fontSize={FS_URL} fill={MUTED}>
        Your subscribers
      </text>

      {[
        { name: "nostr_writer", top: 82, begin: 0.26 },
        { name: "zap_enjoyer", top: 130, begin: 0.46 },
      ].map((r) => (
        <g key={r.name} opacity="0">
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes={`0;${r.begin};${(r.begin + 0.05).toFixed(2)};0.97;1`}
            dur="9s"
            repeatCount="indefinite"
          />
          <SubRow top={r.top} h={40} name={r.name}>
            <text x={270} y={r.top + 20 + FS_SMALL * 0.35} textAnchor="end" fontSize={FS_SMALL} fill={GREEN}>
              added for you
            </text>
            <Tick x={290} y={r.top + 20} size={14} />
          </SubRow>
        </g>
      ))}
    </Frame>
  ),

  // The three tabs, each with a representative panel.
  subscribers: (
    <Frame label="Delegated, Direct and Payment history">
      <GlassDefs />
      <TabSwitcher y={14} labels={["Delegated", "Direct", "Payment history"]} />

      <g opacity="0">
        <animate attributeName="opacity" values="1;1;0;0;1;1" keyTimes="0;0.325;0.33;0.995;1;1" dur="8.4s" repeatCount="indefinite" />
        <SubRow top={62} name="nostr_writer" accent>
          <Pill x={214} y={73} w={80} h={22} label="Active" tone="green" />
        </SubRow>
        <SubRow top={118} name="zap_enjoyer" accent>
          <Pill x={214} y={129} w={80} h={22} label="Canceling" tone="muted" />
        </SubRow>
      </g>

      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.33;0.335;0.66;0.665;1" dur="8.4s" repeatCount="indefinite" />
        <SubRow top={62} name="a_friend">
          <Pill x={214} y={73} w={80} h={22} label="Comped" tone="muted" />
        </SubRow>
        <g>
          <rect x={16} y={118} width={288} height={ROW} rx={ROW * 0.34} fill="none" stroke={ACCENT} strokeOpacity="0.45" strokeWidth="1" strokeDasharray="6 5" />
          {/* plus + label centred as a unit on the box's midline (x=160):
              the label is ~76px at 10.4px, the plus 12px, gap 8 -> 96 total,
              so the pair starts at 160-48=112 and the text at 112+20=132. */}
          <g stroke={ACCENT} strokeWidth="1.9" strokeLinecap="round">
            <line x1="112" y1="140" x2="124" y2="140" />
            <line x1="118" y1="134" x2="118" y2="146" />
          </g>
          <text x={132} y={140 + FS_LABEL * 0.35} fontSize={FS_LABEL} fill={ACCENT} fontWeight="600">
            Add subscriber
          </text>
        </g>
      </g>

      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.665;0.67;0.995;1;1" dur="8.4s" repeatCount="indefinite" />
        {[
          { amt: "21,000 sats", who: "nostr_writer", when: "Aug 21" },
          { amt: "5,000 sats", who: "zap_enjoyer", when: "Aug 19" },
        ].map((row, i) => {
          const top = 62 + i * 56;
          const mid = top + ROW / 2;
          return (
            <g key={row.when}>
              <rect x={16} y={top} width={288} height={ROW} rx={ROW * 0.34} fill="url(#gPanel)" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
              <text x={32} y={mid - 3} fontSize={FS_NAME} fill={TEXT} fontWeight="600">
                {row.amt}
              </text>
              <text x={32} y={mid + FS_URL * 1.07} fontSize={FS_URL} fill={MUTED}>
                {row.who}
              </text>
              <text x={288} y={mid + FS_SMALL * 0.35} textAnchor="end" fontSize={FS_SMALL} fill={MUTED}>
                {row.when}
              </text>
            </g>
          );
        })}
      </g>
    </Frame>
  ),

  // Publishing premium content: the same control appears in both editors -
  // a bordered capsule holding crown + "Premium content" + a toggle. Taken
  // from NoteEditor.js:433 and ArticlePublishModalV2.js:449, which render
  // identical markup. Both toggles flip on together, because the point is
  // that it is the same switch wherever you write.
  publish: (
    <Frame label="Turn Premium content on in either editor">
      <GlassDefs />

      {[
        { label: "Note editor", top: 22 },
        { label: "Article editor", top: 104 },
      ].map((ed, i) => {
        const capTop = ed.top + 22;
        const mid = capTop + 19;
        return (
          <g key={ed.label}>
            <text x={18} y={ed.top + FS_URL * 0.35} fontSize={FS_URL} fill={MUTED}>
              {ed.label}
            </text>

            {/* the control capsule, as the editors draw it */}
            <rect
              x={16}
              y={capTop}
              width={224}
              height={38}
              rx={12}
              fill="url(#gPanel)"
              stroke="#ffffff"
              strokeOpacity="0.16"
              strokeWidth="1"
            />
            <Crown x={38} y={mid} size={17} />
            <text x={56} y={mid + FS_LABEL * 0.35} fontSize={FS_LABEL} fill={TEXT} fontWeight="500">
              Premium content
            </text>
            <Toggle x={186} y={mid} h={19}>
              {({ x, y, w, h, kr }) => (
                <>
                  <rect x={x} y={y - h / 2} width={w} height={h} rx={h / 2} fill={GREEN} opacity="0">
                    <animate attributeName="opacity" values="0;0;0.3;0.3;0" keyTimes="0;0.18;0.24;0.94;1" dur="7s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
                  </rect>
                  <circle cy={y} r={kr} fill={MUTED}>
                    <animate attributeName="cx" values={`${x + h / 2};${x + h / 2};${x + w - h / 2};${x + w - h / 2};${x + h / 2}`} keyTimes="0;0.18;0.24;0.94;1" dur="7s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
                    <animate attributeName="fill" values={`${MUTED};${MUTED};${GREEN};${GREEN};${MUTED}`} keyTimes="0;0.18;0.24;0.94;1" dur="7s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
                  </circle>
                </>
              )}
            </Toggle>

            {/* once on, the post is marked premium */}
            <g opacity="0">
              <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.26;0.32;0.94;1" dur="7s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
              <Pill x={250} y={mid - 11} w={60} h={22} label="Premium" tone="accent" />
            </g>
          </g>
        );
      })}
    </Frame>
  ),
};

export const ILLUSTRATION_STYLES = {
  glass: {
    label: "Glass",
    hint: "Miniature of the real Manage subs screen",
    set: glass,
  },
};

export const STYLE_KEYS = Object.keys(ILLUSTRATION_STYLES);
