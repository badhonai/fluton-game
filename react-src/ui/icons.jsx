/* UI icon set — Lucide-language stroke icons (Lucide, MIT).
   One visual system for ALL chrome icons: 24 viewBox, 2px round strokes.
   No emoji, no generated PNG icons in UI chrome. */

const P = {
  play:            ['M6 3v18l14-9z'],
  pause:           ['M6 4h4v16H6z', 'M14 4h4v16h-4z'],
  home:            ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  'arrow-left':    ['M19 12H5', 'M12 19l-7-7 7-7'],
  'chevron-right': ['M9 18l6-6-6-6'],
  'chevron-left':  ['M15 18l-6-6 6-6'],
  'volume-2':      ['M11 5L6 9H2v6h4l5 4z', 'M15.5 8.5a5 5 0 0 1 0 7', 'M19 5a10 10 0 0 1 0 14'],
  'volume-x':      ['M11 5L6 9H2v6h4l5 4z', 'M22 9l-6 6', 'M16 9l6 6'],
  lock:            ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  star:            ['M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01z'],
  maximize:        ['M8 3H5a2 2 0 0 0-2 2v3', 'M21 8V5a2 2 0 0 0-2-2h-3', 'M3 16v3a2 2 0 0 0 2 2h3', 'M16 21h3a2 2 0 0 0 2-2v-3'],
  minimize:        ['M8 3v3a2 2 0 0 1-2 2H3', 'M21 8h-3a2 2 0 0 1-2-2V3', 'M3 16h3a2 2 0 0 1 2 2v3', 'M16 21v-3a2 2 0 0 1 2-2h3'],
  'rotate-ccw':    ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
  'trash-2':       ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  'help-circle':   ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3', 'M12 17h.01'],
  'layout-grid':   ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  eye:             ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  clock:           ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'],
  'file-text':     ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  heart:           ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z'],
  shield:          ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
  move:            ['M12 2v20', 'M2 12h20', 'M8 6l4-4 4 4', 'M8 18l4 4 4-4', 'M6 8l-4 4 4 4', 'M18 8l4 4-4 4'],
  yarn:            ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M4.2 8.5c4.5 1.2 9.1 1.2 13.6 0', 'M3.4 14.2c5 1.6 10 1.6 15 0', 'M9.2 3.6c-1.2 5-1.2 10 .4 14.8'],
  trophy:          ['M6 9a6 6 0 0 0 12 0V4H6z', 'M6 6H3a3 3 0 0 0 3 6', 'M18 6h3a3 3 0 0 1-3 6', 'M12 14v4', 'M8 22h8', 'M9 18h6'],
  zap:             ['M13 2 3 14h8l-1 8 10-12h-8z']
};

export function Icon({ name, size = 16, fill = false, className, sw = 2 }) {
  const d = P[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill={fill ? 'currentColor' : 'none'}
         stroke="currentColor" strokeWidth={sw}
         strokeLinecap="round" strokeLinejoin="round"
         className={className} aria-hidden="true" focusable="false">
      {d.map((p, i) => <path key={i} d={p}/>)}
    </svg>
  );
}
export default Icon;
