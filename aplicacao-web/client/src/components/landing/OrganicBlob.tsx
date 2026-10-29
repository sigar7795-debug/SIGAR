/**
 * Smooth, controlled organic shape — deliberately NOT a scalloped/cloud/sticker
 * outline. Stretches to fill its wrapping container (sized by the text it sits
 * behind), so it works at any line length/viewport without per-breakpoint tuning.
 */
export function OrganicBlob({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 100"
      preserveAspectRatio="none"
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    >
      <path
        d="M28,4 C120,-6 210,2 268,14 C296,20 300,42 292,58 C284,76 260,86 208,92 C140,100 62,98 26,84 C-4,72 -6,40 6,22 C12,12 18,6 28,4 Z"
        fill="currentColor"
      />
    </svg>
  );
}
