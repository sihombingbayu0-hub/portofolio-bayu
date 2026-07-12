import type { SVGProps } from "react";

export type IconName =
  | "analytics"
  | "calendar"
  | "chart"
  | "check"
  | "chevron-right"
  | "coins"
  | "database"
  | "download"
  | "file"
  | "filter"
  | "history"
  | "home"
  | "income"
  | "info"
  | "money"
  | "moon"
  | "note"
  | "outcome"
  | "palette"
  | "pencil"
  | "plus"
  | "progress"
  | "receipt"
  | "refresh"
  | "search"
  | "settings"
  | "smartphone"
  | "sun"
  | "swap"
  | "tag"
  | "target"
  | "trash"
  | "wallet"
  | "warning";

type AppIconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

function AppIcon({ className = "", name, size = 20, ...props }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`feature-icon ${className}`.trim()}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {renderIcon(name)}
      </g>
    </svg>
  );
}

function renderIcon(name: IconName) {
  switch (name) {
    case "wallet":
      return <><path d="M4 6.5h13.5A2.5 2.5 0 0 1 20 9v8a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h11" /><path d="M15 11h5v4h-5a2 2 0 0 1 0-4Z" /><circle cx="15.5" cy="13" r=".5" fill="currentColor" stroke="none" /></>;
    case "income":
      return <><path d="M5 19 19 5" /><path d="M10 5h9v9" /><path d="M5 12v7h7" /></>;
    case "info":
      return <><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><path d="M12 7h.01" /></>;
    case "outcome":
      return <><path d="m5 5 14 14" /><path d="M12 19h7v-7" /><path d="M5 12V5h7" /></>;
    case "history":
      return <><path d="M4.8 7.2A8 8 0 1 1 4 15" /><path d="M4 4v4h4" /><path d="M12 8v4l2.8 1.8" /></>;
    case "chart":
      return <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>;
    case "home":
      return <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>;
    case "plus":
      return <><path d="M12 5v14" /><path d="M5 12h14" /></>;
    case "settings":
      return <><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7 2-.7Z" /></>;
    case "calendar":
      return <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 10h18" /></>;
    case "swap":
      return <><path d="M7 7h12l-3-3" /><path d="m19 7-3 3" /><path d="M17 17H5l3 3" /><path d="m5 17 3-3" /></>;
    case "tag":
      return <><path d="M20 13 13 20l-9-9V4h7l9 9Z" /><circle cx="8" cy="8" r="1" /></>;
    case "money":
      return <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M7 9H6v1M17 15h1v-1" /></>;
    case "note":
      return <><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 12h7M8 16h7" /></>;
    case "pencil":
      return <><path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Z" /><path d="m13.8 7 3.2 3.2" /></>;
    case "trash":
      return <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></>;
    case "warning":
      return <><path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>;
    case "filter":
      return <><path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" /></>;
    case "search":
      return <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>;
    case "refresh":
      return <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M6.2 8A7 7 0 0 1 18 6l2 5M4 13l2 5a7 7 0 0 0 11.8-2" /></>;
    case "analytics":
      return <><path d="M4 19V9M10 19V5M16 19v-8M22 19H2" /><path d="m4 7 5-4 5 4 6-5" /></>;
    case "receipt":
      return <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>;
    case "target":
      return <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="m16 8 5-5M17 3h4v4" /></>;
    case "coins":
      return <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v4c0 1.7 2.7 3 6 3 1.1 0 2.1-.1 3-.4" /><path d="M3 11v4c0 1.7 2.7 3 6 3" /><ellipse cx="16" cy="15" rx="5" ry="3" /><path d="M11 15v3c0 1.7 2.2 3 5 3s5-1.3 5-3v-3" /></>;
    case "progress":
      return <><path d="M12 3a9 9 0 1 1-9 9" /><path d="M12 3v9h9" /></>;
    case "check":
      return <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.7 2.7L16.5 9" /></>;
    case "database":
      return <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>;
    case "download":
      return <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 20h16" /></>;
    case "file":
      return <><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 12h8M8 16h2M13 16h3" /></>;
    case "palette":
      return <><path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h3a6 6 0 0 0 6-6c0-2.2-4-4-9-4Z" /><circle cx="7.5" cy="9" r=".7" fill="currentColor" stroke="none" /><circle cx="10" cy="6.5" r=".7" fill="currentColor" stroke="none" /><circle cx="15" cy="6.5" r=".7" fill="currentColor" stroke="none" /></>;
    case "sun":
      return <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>;
    case "moon":
      return <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z" />;
    case "smartphone":
      return <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10 5h4M11 19h2" /><path d="M12 8v7M9 12l3 3 3-3" /></>;
    case "chevron-right":
      return <path d="m9 5 7 7-7 7" />;
    default:
      return null;
  }
}

export default AppIcon;
