import type { ServiceKey } from "@/data/services";

/**
 * Line icons drawn on a 24x24 grid at a single stroke weight so the set reads
 * as one family alongside the lion emblem.
 */
const paths: Record<ServiceKey, React.ReactNode> = {
  facility: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V6l7-3 7 3v15" />
      <path d="M9 21v-5h6v5" />
      <path d="M9 10h.01M15 10h.01" />
    </>
  ),
  static: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.8 7.6-7 9-4.2-1.4-7-4.8-7-9V6l7-3z" />
      <path d="M12 8v8" />
    </>
  ),
  surveillance: (
    <>
      <path d="M3 8l14-4 1.6 5.6L4.6 13.6 3 8z" />
      <path d="M6 13.5V17a2 2 0 0 0 2 2h1" />
      <path d="M18.6 9.6L22 8.6" />
      <circle cx="12" cy="19" r="2" />
    </>
  ),
  mobile: (
    <>
      <path d="M3 15h18" />
      <path d="M5 15V9l3-4h8l3 4v6" />
      <circle cx="8" cy="18" r="2" />
      <circle cx="16" cy="18" r="2" />
      <path d="M8 9h8" />
    </>
  ),
  k9: (
    <>
      <path d="M4 6l3 2v3c0 3.5 2.2 6 5 6s5-2.5 5-6V8l3-2v6a8 8 0 0 1-16 0V6z" />
      <path d="M10 11h.01M14 11h.01" />
      <path d="M12 14v2" />
    </>
  ),
  cit: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9v6M9 12h6" />
    </>
  ),
  armored: (
    <>
      <path d="M2 16V10h11l4 3h5v3" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <path d="M7 10V7l4-2 4 2v3" />
    </>
  ),
  erp: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2.8A.8.8 0 0 1 9.8 2h4.4a.8.8 0 0 1 .8.8V4" />
      <path d="M9 11l2 2 4-4" />
      <path d="M9 17h6" />
    </>
  ),
  crisis: (
    <>
      <path d="M12 3l9 16H3l9-16z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  medevac: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  camp: (
    <>
      <path d="M12 4L3 20h18L12 4z" />
      <path d="M12 4v16" />
      <path d="M8.5 20l3.5-6 3.5 6" />
    </>
  ),
  supply: (
    <>
      <path d="M8 3c2.5 3 4 5.2 4 7a4 4 0 0 1-8 0c0-1.8 1.5-4 4-7z" />
      <path d="M15 21V8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v13" />
      <path d="M15 12h6" />
    </>
  ),
  equipment: (
    <>
      <path d="M3 19h18" />
      <path d="M5 19v-4h6v4" />
      <path d="M11 15l3-8h3" />
      <path d="M17 7l3 6-4 2" />
      <circle cx="7" cy="19" r="0.01" />
    </>
  ),
};

export default function ServiceIcon({
  name,
  className,
}: {
  name: ServiceKey;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}
