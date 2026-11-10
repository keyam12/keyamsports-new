import type { ReactNode } from 'react';

export type IconName = 'basketball' | 'baseball' | 'football' | 'soccer' | 'search' | 'chart' | 'link' | 'arrowDown' | 'check' | 'news' | 'mail';

// Generic geometric symbols, drawn for KEYAM. No official league/team artwork.
const paths: Record<IconName, ReactNode> = {
  basketball: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M5.6 5.6c5.6 2.2 7.2 7.2 0 12.8M18.4 5.6c-5.6 2.2-7.2 7.2 0 12.8" /></>,
  baseball: <><circle cx="12" cy="12" r="9" /><path d="M6 5.3c4 3.3 4 10.1 0 13.4M18 5.3c-4 3.3-4 10.1 0 13.4" strokeDasharray="2 2.5" /></>,
  football: <><path d="M3.4 20.6C1 13 7 1 20.6 3.4 23 11 17 23 3.4 20.6Z" /><path d="m8 16 8-8m-6 2 4 4m-1-7 4 4M7 13l4 4M3 15l6 6M15 3l6 6" /></>,
  soccer: <><circle cx="12" cy="12" r="9" /><path d="m12 7 4.8 3.5-1.8 5.6H9l-1.8-5.6L12 7Zm0-4v4m-8.6 2.2 3.8 1.3m9.6 0 3.8-1.3M6.6 19.2 9 16.1m6 0 2.4 3.1" /></>,
  search: <><circle cx="10.7" cy="10.7" r="6.7" /><path d="m16 16 4.5 4.5" /></>,
  chart: <><path d="M4 20V12h3v8m3 0V8h3v12m3 0V4h3v16M3 20h18" /></>,
  link: <><path d="m10 13.5 4-4m-5.5 6  -1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m1 1 1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0" transform="translate(1 1)" /></>,
  arrowDown: <path d="M12 4v16m-6-6 6 6 6-6" />,
  check: <path d="m5 12 4 4L19 6" />,
  news: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
};

export function sportIconName(category: string): IconName {
  return ['basketball', 'baseball', 'football', 'soccer'].includes(category) ? category as IconName : 'news';
}

/** Decorative icons keep their adjacent text as the accessible label. */
export default function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>{paths[name]}</svg>;
}
