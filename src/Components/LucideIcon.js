import LegacyIcon from "@/Components/Icon";
import {
  TriangleAlert,
  Clapperboard,
  Smile,
  Search,
  X,
  XCircle,
  Copy,
  ChevronDown,
  User,
  Calendar,
  Trash2,
  Check,
  Infinity as InfinityIcon,
  Server,
  NotebookPen,
  KeyRound,
  Puzzle,
  Zap,
  Heart,
  StickyNote,
  Eye,
  Download,
  Plus,
  ArrowLeftRight,
  Repeat2,
  Wallet,
  Lock,
  Link as LinkIcon,
  Code,
  EyeOff,
  LogOut,
  Crown,
  Image,
  Upload,
  MoreHorizontal,
  BarChart2,
  FileText,
  Camera,
  CreditCard,
  Star,
  Settings,
  Cloud,
  ExternalLink,
  Sparkles,
  TrendingUp,
  TrendingDown,
  PartyPopper,
  BookImage,
  RefreshCw,
  Circle,
  CircleCheck,
  CircleAlert,
  Minus,
} from "lucide-react";

const iconsMap = {
  // v1 (kebab-case, AssetsURLs.js)
  warning: TriangleAlert,
  emoji: Smile,
  search: Search,
  "crossmark-tt": XCircle,
  copy: Copy,
  arrow: ChevronDown,
  user: User,
  calendar: Calendar,
  cancel: XCircle,
  trash: Trash2,
  checkmark: Check,
  check: Check,
  infinity: InfinityIcon,
  server: Server,
  "add-note": NotebookPen,
  "key-icon": KeyRound,
  puzzle: Puzzle,
  bolt: Zap,
  "bolt-bold": Zap,
  heart: Heart,
  buzz: Zap,
  repost: Repeat2,
  "note-bold": StickyNote,
  "eye-opened": Eye,
  "eye-closed": EyeOff,
  download: Download,
  plus: Plus,
  "switch-arrows": ArrowLeftRight,
  wallet: Wallet,
  lock: Lock,
  link: LinkIcon,
  code: Code,
  logout: LogOut,
  crown: Crown,
  book_image: BookImage,

  // v2 (snake_case, IconV2URL.js)
  close_md: X,
  file_upload: Upload,
  file_download: Download,
  more_horizontal: MoreHorizontal,
  trash_full: Trash2,
  cloud_upload: Cloud,
  clapperboard: Clapperboard,
  image_01: Image,
  chart_line: BarChart2,
  file_blank: FileText,
  camera: Camera,
  credit_card_01: CreditCard,
  add_plus: Plus,
  user_01: User,
  star: Star,
  settings: Settings,
  external_link: ExternalLink,
  sparkles: Sparkles,
  trend_up: TrendingUp,
  trend_down: TrendingDown,
  celebrate: PartyPopper,
  refresh: RefreshCw,
  circle: Circle,
  circle_check: CircleCheck,
  circle_warning: CircleAlert,
  remove_minus: Minus,
  check_big: Check,
};

// Icons whose original artwork carries fixed, meaningful color (status badges),
// preserved regardless of theme when isColored/isBoldThemeColor is set.
const fixedColors = {
  checkmark: "#00C04D",
  check: "#00C04D",
  warning: "#ee7700",
};

// Brand marks with no lucide equivalent — kept on the legacy image-based Icon.
const brandNames = new Set(["google", "yaki-logomark", "yakihonne-logo"]);

export default function LucideIcon(props) {
  if (brandNames.has(props.name)) {
    return <LegacyIcon {...props} />;
  }

  const {
    name,
    size,
    width,
    height,
    isColored = false,
    onClick,
    transform = "unset",
    className = "",
    opacity = "initial",
    v = 1,
    isBoldThemeColor = false,
  } = props;

  const LucideComponent = iconsMap[name];

  if (!LucideComponent) return null;

  const iconWidth = width || size || 16;
  const iconHeight = height || size || 16;

  let color;
  if (isBoldThemeColor) {
    color = "var(--color-primary-accent)";
  } else if (isColored) {
    color = fixedColors[name] || "currentColor";
  } else {
    color = "var(--color-text)";
  }

  return (
    <div
      onClick={onClick && onClick}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: ".2s ease-in-out",
        minWidth: iconWidth,
        minHeight: iconHeight,
        width: iconWidth,
        height: iconHeight,
        opacity: opacity,
        color,
        transform,
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
      }}
    >
      <LucideComponent width="100%" height="100%" color={color} />
    </div>
  );
}
