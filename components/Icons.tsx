import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (d: React.ReactNode, p: P) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {d}
  </svg>
);

export const IconChevron = (p: P) => base(<path d="m9 6 6 6-6 6" />, p);
export const IconCopy = (p: P) => base(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></>, p);
export const IconPath = (p: P) => base(<><path d="M4 7h4l3 10h4" /><circle cx="18" cy="17" r="2" /><circle cx="4" cy="7" r="0.5" /></>, p);
export const IconSearch = (p: P) => base(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>, p);
export const IconUp = (p: P) => base(<path d="m6 15 6-6 6 6" />, p);
export const IconDown = (p: P) => base(<path d="m6 9 6 6 6-6" />, p);
export const IconX = (p: P) => base(<path d="M6 6l12 12M18 6 6 18" />, p);
export const IconUpload = (p: P) => base(<><path d="M12 15V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>, p);
export const IconDownload = (p: P) => base(<><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>, p);
export const IconSun = (p: P) => base(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>, p);
export const IconMoon = (p: P) => base(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />, p);
export const IconSidebar = (p: P) => base(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>, p);
export const IconWand = (p: P) => base(<><path d="m4 20 11-11" /><path d="m14 4 .8 1.7L16.5 6.5l-1.7.8L14 9l-.8-1.7-1.7-.8 1.7-.8Z" /><path d="M19 11l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5Z" /></>, p);
export const IconMinify = (p: P) => base(<><path d="M4 9h5V4" /><path d="M20 15h-5v5" /><path d="M9 9 3 3M15 15l6 6" /></>, p);
export const IconFocus = (p: P) => base(<><circle cx="12" cy="12" r="3" /><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /></>, p);
export const IconSwap = (p: P) => base(<><path d="M7 4 3 8l4 4" /><path d="M3 8h14" /><path d="m17 20 4-4-4-4" /><path d="M21 16H7" /></>, p);
export const IconKeyboard = (p: P) => base(<><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7 14h10" /></>, p);
