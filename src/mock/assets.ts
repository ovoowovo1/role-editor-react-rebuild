const SVG_NS = 'http://www.w3.org/2000/svg';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shapeSvg(kind: string, primary: string, secondary: string, label: string, index: number): string {
  const text = escapeXml(label.slice(0, 2).toUpperCase());
  const rotate = (index * 23) % 360;

  if (kind === 'head') {
    return `
      <circle cx="48" cy="44" r="28" fill="${primary}" stroke="#dff8ff" stroke-width="4"/>
      <path d="M26 42 C28 18 68 18 70 42 L62 35 C54 29 42 29 34 35 Z" fill="${secondary}" opacity="0.86"/>
      <circle cx="38" cy="47" r="4" fill="#03131f"/><circle cx="58" cy="47" r="4" fill="#03131f"/>
      <path d="M39 59 Q48 66 57 59" fill="none" stroke="#03131f" stroke-width="4" stroke-linecap="round"/>
      <text x="48" y="88" text-anchor="middle" font-size="13" font-family="Verdana" fill="#fff">${text}</text>`;
  }

  if (kind === 'hand') {
    return `
      <path d="M20 58 C22 34 36 22 48 22 C62 22 76 34 77 55 C71 52 66 49 61 45 L61 73 L51 73 L49 50 L45 73 L35 73 L37 45 C32 50 27 54 20 58 Z" fill="${primary}" stroke="#dff8ff" stroke-width="4"/>
      <circle cx="48" cy="37" r="13" fill="${secondary}" opacity="0.75"/>
      <text x="48" y="88" text-anchor="middle" font-size="13" font-family="Verdana" fill="#fff">${text}</text>`;
  }

  if (kind === 'foot') {
    return `
      <path d="M18 62 C26 45 43 38 55 47 C61 51 69 53 80 53 C84 64 78 73 62 75 L25 75 C18 74 15 69 18 62 Z" fill="${primary}" stroke="#dff8ff" stroke-width="4"/>
      <path d="M31 58 L64 58" stroke="${secondary}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
      <text x="48" y="88" text-anchor="middle" font-size="13" font-family="Verdana" fill="#fff">${text}</text>`;
  }

  if (kind === 'cape') {
    return `
      <path d="M30 14 L66 14 L82 82 Q49 70 16 82 Z" fill="${primary}" stroke="#dff8ff" stroke-width="4"/>
      <path d="M48 17 L48 75" stroke="${secondary}" stroke-width="7" opacity="0.65"/>
      <path d="M29 46 Q48 34 67 46" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.45"/>
      <text x="48" y="88" text-anchor="middle" font-size="13" font-family="Verdana" fill="#fff">${text}</text>`;
  }

  const decoShapes = [
    `<polygon points="48,10 58,36 86,36 63,53 72,82 48,64 24,82 33,53 10,36 38,36" fill="${primary}" stroke="#e7fbff" stroke-width="4"/>`,
    `<circle cx="48" cy="48" r="31" fill="${primary}" stroke="#e7fbff" stroke-width="4"/><circle cx="48" cy="48" r="16" fill="${secondary}" opacity="0.82"/>`,
    `<rect x="18" y="18" width="60" height="60" rx="16" fill="${primary}" stroke="#e7fbff" stroke-width="4" transform="rotate(${rotate} 48 48)"/>`,
    `<path d="M48 10 C63 28 80 35 86 54 C65 54 60 67 48 86 C36 67 31 54 10 54 C16 35 33 28 48 10 Z" fill="${primary}" stroke="#e7fbff" stroke-width="4"/>`,
    `<path d="M48 12 L82 48 L48 84 L14 48 Z" fill="${primary}" stroke="#e7fbff" stroke-width="4"/><path d="M48 27 L67 48 L48 69 L29 48 Z" fill="${secondary}" opacity="0.75"/>`
  ];

  return `
    ${decoShapes[index % decoShapes.length]}
    <path d="M28 48 H68 M48 28 V68" stroke="${secondary}" stroke-width="7" stroke-linecap="round" opacity="0.65" transform="rotate(${rotate} 48 48)"/>
    <text x="48" y="53" text-anchor="middle" font-size="14" font-family="Verdana" font-weight="700" fill="#fff" opacity="0.92">${text}</text>`;
}

export function makeMockAsset(kind: string, primary: string, secondary: string, label: string, index: number): string {
  const svg = `
    <svg xmlns="${SVG_NS}" viewBox="0 0 96 96" width="96" height="96">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#6df0ff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#081622" stop-opacity="0.2"/>
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.55"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="96" height="96" rx="18" fill="url(#bg)"/>
      <g filter="url(#shadow)">${shapeSvg(kind, primary, secondary, label, index)}</g>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
