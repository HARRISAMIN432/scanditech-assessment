const PATHS = {
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z",
  refresh: "M20 11a8 8 0 10-2.3 5.7M20 4v7h-7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  pencil: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  upload: "M12 16V4m0 0L7 9m5-5l5 5M4 20h16",
  download: "M12 4v12m0 0l-5-5m5 5l5-5M4 20h16",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3",
  x: "M6 6l12 12M18 6L6 18",
  inbox: "M4 13l2.5-7h11L20 13v6H4v-6zm0 0h4l1 2h6l1-2h4",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "icon" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Spinner() {
  return <span className="spinner" role="status" aria-label="Loading" />;
}
