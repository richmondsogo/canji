import React from 'react';

const PATHS = {
  small: {
    outer: [
      'M33.68 71.09 L33.68 184.91 L132.25 241.81 L222.32 189.81 L222.32 170.19 L132.25 222.19 L50.68 175.09 L50.68 80.91 L132.25 33.81 L222.32 85.81 L222.32 66.19 L132.25 14.19Z'
    ],
    inner:
      'M130.96 99.17 L130.96 156.83 L180.89 185.65 L222.32 161.73 L222.32 142.11 L180.89 166.03 L147.96 147.01 L147.96 108.99 L180.89 89.97 L222.32 113.89 L222.32 94.27 L180.89 70.35Z'
  },
  main: {
    outer: [
      'M34.93 72.54 L34.93 183.46 L131.00 238.92 L221.07 186.92 L221.07 171.29 L131.00 223.29 L48.46 175.64 L48.46 80.36 L131.00 32.71 L221.07 84.71 L221.07 69.08 L131.00 17.08Z'
    ],
    inner:
      'M106.99 93.34 L106.99 162.66 L167.02 197.32 L221.07 166.12 L221.07 150.48 L167.02 181.69 L120.53 154.85 L120.53 101.15 L167.02 74.31 L221.07 105.52 L221.07 89.88 L167.02 58.68Z'
  },
  feature: {
    outer: [
      'M34.93 72.54 L34.93 183.46 L131.00 238.92 L221.07 186.92 L221.07 171.29 L131.00 223.29 L48.46 175.64 L48.46 80.36 L131.00 32.71 L221.07 84.71 L221.07 69.08 L131.00 17.08Z',
      'M82.96 86.41 L82.96 169.59 L155.01 211.19 L221.07 173.05 L221.07 157.42 L155.01 195.55 L96.50 161.78 L96.50 94.22 L155.01 60.45 L221.07 98.58 L221.07 82.95 L155.01 44.81Z'
    ],
    inner:
      'M131.00 100.27 L131.00 155.73 L179.03 183.46 L221.07 159.19 L221.07 143.55 L179.03 167.82 L144.54 147.91 L144.54 108.09 L179.03 88.18 L221.07 112.45 L221.07 96.81 L179.03 72.54Z'
  }
};

function resolveCut(size, explicitCut) {
  if (explicitCut && PATHS[explicitCut]) return explicitCut;
  if (size < 32) return 'small';
  if (size >= 120) return 'feature';
  return 'main';
}

export function CanjiSymbol({ size = 20, cut, className = '' }) {
  const activeCut = resolveCut(size, cut);
  const geometry = PATHS[activeCut];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      {geometry.outer.map((d, idx) => (
        <path key={idx} d={d} fill="var(--foreground, #181816)" />
      ))}
      <path d={geometry.inner} fill="var(--accent, #1E6B52)" />
    </svg>
  );
}

export function CanjiLockup({
  size = 20,
  cut,
  wordmarkClassName = 'text-[15px]',
  gapClassName = 'gap-2',
  className = ''
}) {
  return (
    <div className={`inline-flex items-center select-none ${gapClassName} ${className}`}>
      <CanjiSymbol size={size} cut={cut} />
      <span
        className={`font-sans font-bold tracking-[-0.03em] leading-none text-foreground ${wordmarkClassName}`}
      >
        canji
      </span>
    </div>
  );
}
