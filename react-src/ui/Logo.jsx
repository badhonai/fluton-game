/* Shared UI atoms: Fluton diamond mark (inline SVG) */
export function Logo({ className }){
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <g transform="rotate(45 20 20)">
        <rect x="9.5" y="9.5" width="21" height="21" rx="2"
              fill="none" stroke="currentColor" strokeWidth="3.2"/>
      </g>
      <circle cx="15.5" cy="24" r="4.4" fill="none" stroke="currentColor" strokeWidth="3"/>
      <path d="M15.5 19.4 L25.5 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
