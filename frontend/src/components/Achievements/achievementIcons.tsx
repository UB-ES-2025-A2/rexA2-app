import type { FC } from "react";

type IconProps = { size?: number; stroke?: string; fill?: string };

// Base icon style helpers
const base = { strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const neonStroke = "#9f8bff";
const neonFill = "url(#badgeGradient)";

const BadgeFrame: FC<{ size?: number; children: React.ReactNode }> = ({ size = 28, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    role="img"
    aria-hidden
    style={{ display: "block" }}
  >
    <defs>
      <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="24" height="24" rx="8" ry="8" fill="none" stroke={neonStroke} strokeWidth={1.4} />
    {children}
  </svg>
);

const CompassIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <circle cx="14" cy="14" r="6" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M11 16.5 14 11l3 5.5-3-1.2Z" fill={neonFill} stroke={neonStroke} {...base} />
    <circle cx="14" cy="14" r="1.1" fill="#0ea5e9" stroke="none" />
  </BadgeFrame>
);

const BootIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M9 10h7v5.5a2.5 2.5 0 0 0 2.5 2.5H9.5a1.5 1.5 0 0 1-1.5-1.5V12a2 2 0 0 1 2-2Z" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M10 15.5h3.5M10 13.5h2" stroke={neonStroke} {...base} />
    <path d="M9 18.5h11" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const MedalIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M11 5.5h6l-2.2 3.6H13.2Z" fill={neonFill} stroke={neonStroke} {...base} />
    <circle cx="14" cy="15" r="5" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="m12.2 15.8 1.1-3.2 1.1 3.2h3.3l-2.7 1.9 1 3-2.7-1.9-2.7 1.9 1-3-2.7-1.9Z" fill={neonFill} stroke="none" />
  </BadgeFrame>
);

const MapIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M9.5 9.5 14 7l4.5 2.5v9L14 21l-4.5-2.5Z" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M14 7v13" stroke={neonStroke} {...base} />
    <path d="M10.5 12.5 13 14l2.5-1.5" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const TrophyIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M10 8h8v3a4 4 0 0 1-4 4h0a4 4 0 0 1-4-4Z" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M12 15h4v2.5a1.5 1.5 0 0 1-1.5 1.5H13.5A1.5 1.5 0 0 1 12 17.5Z" fill={neonFill} stroke={neonStroke} {...base} />
    <path d="M10 9H8.5a2 2 0 0 0-2 2v1.2A2.8 2.8 0 0 0 9 15.5" stroke={neonStroke} {...base} />
    <path d="M18 9h1.5a2 2 0 0 1 2 2v1.2A2.8 2.8 0 0 1 19 15.5" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const PenIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M9.5 17.5 17 10a1.6 1.6 0 0 1 2.3 0 1.6 1.6 0 0 1 0 2.3l-7.5 7.5-3.3.7Z" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M16 11.5 17.5 13" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const ToolboxIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <rect x="8" y="11" width="12" height="8" rx="2" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M11 10.5h6" stroke={neonStroke} {...base} />
    <rect x="12.5" y="13.5" width="3" height="1.8" rx="0.4" fill={neonFill} stroke="none" />
  </BadgeFrame>
);

const RocketIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M14 7.5c2.8 0 5.5 3.4 5.5 7.6 0 .6 0 1.3-.1 2l-4.8-1.8-3.9 1.7c-.5-4.5.7-9.5 3.3-9.5Z" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <circle cx="15.5" cy="12.3" r="1.3" fill={neonFill} stroke={neonStroke} {...base} />
    <path d="M10 19.5c0-1 .8-1.8 1.8-1.8H13" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const CraneIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M9 10h10l-6 3h-2v7" stroke={neonStroke} {...base} />
    <path d="M11 13v2.5" stroke={neonStroke} {...base} />
    <rect x="12.5" y="15.5" width="4" height="3" rx="0.8" fill={neonFill} stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const CastleIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M9 12h10v8H9Z" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M11 12V9.5h2V12m4 0V9.5h-2V12M13 20v-3h2v3" stroke={neonStroke} {...base} />
    <rect x="12" y="14.5" width="4" height="2.5" rx="0.6" fill={neonFill} stroke="none" />
  </BadgeFrame>
);

const LeafIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M10 17c0-4 3-7.5 8-7.5-.5 5-3.5 8.5-7.5 8.5a3 3 0 0 1-3-3c0-3 2.5-5.5 6-6.5" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M11 17.5c2.5-.5 4.5-2 6-5" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const PlateIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <circle cx="14" cy="14" r="6" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M12 14h4M11 11.5h6" stroke={neonStroke} {...base} />
    <rect x="13" y="10" width="2" height="8" rx="0.6" fill={neonFill} stroke="none" />
  </BadgeFrame>
);

const CityIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <rect x="9" y="11" width="4" height="8" rx="1" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <rect x="15" y="9" width="4" height="10" rx="1" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M10.5 12.5v2M10.5 16.5v1M16.5 10.5v2M16.5 14.5v3" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const ClimbIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M10 18.5 14 10l4 2.5" stroke={neonStroke} {...base} />
    <path d="M12 15.5h3l1.5 3" stroke={neonStroke} {...base} />
    <circle cx="14.5" cy="9" r="1.2" fill={neonFill} stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const MaskIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M10 11.5c0 2.5 1.8 5 4 5s4-2.5 4-5c0-.6-.1-1.2-.3-1.7l-3.7-1.3-3.7 1.3c-.2.5-.3 1.1-.3 1.7Z" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M12.5 13.5h1M16.5 13.5h1M12.8 15.5c.5.4 1.1.6 1.7.6s1.2-.2 1.7-.6" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const RunIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <circle cx="14.5" cy="9.5" r="1.2" fill={neonFill} stroke={neonStroke} {...base} />
    <path d="M12 14l2-2.5 2.3 1.2-1.5 2.7 2.2 3" stroke={neonStroke} {...base} />
    <path d="M12 14l-1.5 2.5M13 16l-2.2 1.6" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const TentIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M9.5 18.5 14 10l4.5 8.5" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M14 10v8.5M12.5 15.5h3" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const TrackIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M10 17c0-3 2.5-5.5 6-5.5h1.5v2.5h-1c-1.5 0-3 1.1-3 3v2.5h-2.5a1 1 0 0 1-1-1Z" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M17 11.5c0-1-.8-1.8-1.8-1.8H13" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const MountainIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M9 19.5 14 11l5 8.5Z" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M14 11l1.5 2.5-1.5 1-1-1.5Z" fill={neonFill} stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const ShieldIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M14 6.5 20 9v4.5c0 3.5-2.4 6.6-6 8-3.6-1.4-6-4.5-6-8V9Z" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M14 10v7" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const FlagIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <path d="M11 7v14" stroke={neonStroke} {...base} />
    <path d="M11 8.5h7l-2 3 2 3h-7Z" fill={neonFill} stroke={neonStroke} {...base} />
  </BadgeFrame>
);

const PlaceholderIcon: FC<IconProps> = ({ size }) => (
  <BadgeFrame size={size}>
    <circle cx="14" cy="14" r="4.5" fill="rgba(255,255,255,0.08)" stroke={neonStroke} {...base} />
    <path d="M12.5 14.5 14 13l1.5 1.5M14 16v0" stroke={neonStroke} {...base} />
  </BadgeFrame>
);

type ResolveInput = { code?: string; category?: string; themeId?: string };

export function resolveAchievementIcon({ code, category, themeId }: ResolveInput): FC<IconProps> {
  if (code) {
    if (code.startsWith("completed_routes_")) {
      const map: Record<string, FC<IconProps>> = {
        completed_routes_1: CompassIcon,
        completed_routes_5: BootIcon,
        completed_routes_10: MedalIcon,
        completed_routes_25: MapIcon,
        completed_routes_50: TrophyIcon,
      };
      if (map[code]) return map[code];
    }
    if (code.startsWith("created_routes_")) {
      const map: Record<string, FC<IconProps>> = {
        created_routes_1: PenIcon,
        created_routes_3: ToolboxIcon,
        created_routes_5: RocketIcon,
        created_routes_10: CraneIcon,
        created_routes_20: CastleIcon,
      };
      if (map[code]) return map[code];
    }
    if (code.startsWith("distance_")) {
      const map: Record<string, FC<IconProps>> = {
        distance_10: TrackIcon,
        distance_25: MapIcon,
        distance_50: TentIcon,
        distance_100: MountainIcon,
        distance_250: ShieldIcon,
        distance_500: FlagIcon,
      };
      if (map[code]) return map[code];
    }
    if (code.startsWith("theme_") && themeId) {
      return resolveThemeIcon(themeId);
    }
  }

  if (category === "theme" && themeId) {
    return resolveThemeIcon(themeId);
  }

  return PlaceholderIcon;
}

export function resolveThemeIcon(themeId: string): FC<IconProps> {
  const map: Record<string, FC<IconProps>> = {
    naturaleza: LeafIcon,
    gastronomia: PlateIcon,
    "exploracion-urbana": CityIcon,
    aventura: ClimbIcon,
    cultura: MaskIcon,
    deporte: RunIcon,
    entretenimiento: TentIcon,
  };
  return map[themeId] || PlaceholderIcon;
}
