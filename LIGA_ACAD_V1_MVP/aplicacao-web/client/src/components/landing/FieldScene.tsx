/**
 * Stand-in for licensed drone/field photography. Renders a stylised contour-line
 * illustration (terraced field topography + a faint technical grid) in the SIGAR
 * marketing palette. Swap for a real <img>/<video> poster once licensed footage
 * lands — see BackgroundVideo.tsx for where posters are consumed.
 */

const VARIANTS = {
  terraces: [
    "M-40,120 C160,60 320,180 520,110 C680,55 820,140 960,90",
    "M-40,190 C140,140 300,240 520,180 C700,130 840,210 960,160",
    "M-40,260 C150,220 330,300 520,250 C690,205 830,275 960,230",
    "M-40,330 C160,300 320,360 520,320 C700,280 840,345 960,305",
  ],
  ridge: [
    "M-40,90 C120,150 260,40 420,110 C600,190 760,70 960,140",
    "M-40,170 C140,220 280,120 440,180 C610,245 770,150 960,210",
    "M-40,250 C150,290 300,210 460,255 C620,300 780,225 960,275",
  ],
  contour: [
    "M-40,140 C180,90 300,190 480,150 C640,115 780,175 960,130",
    "M-40,200 C190,160 310,240 480,205 C650,170 790,225 960,190",
    "M-40,260 C200,230 320,290 480,260 C660,230 800,275 960,250",
    "M-40,320 C210,300 330,340 480,320 C670,295 810,330 960,315",
  ],
} as const;

export type FieldSceneVariant = keyof typeof VARIANTS;

export function FieldScene({
  variant = "terraces",
  className = "",
}: {
  variant?: FieldSceneVariant;
  className?: string;
}) {
  const paths = VARIANTS[variant];

  return (
    <svg
      viewBox="0 0 960 400"
      preserveAspectRatio="xMidYMid slice"
      className={`h-full w-full ${className}`}
      role="img"
      aria-label="Ilustração esquemática de propriedade rural — imagem provisória"
    >
      <rect width="960" height="400" fill="#161c19" />
      <rect width="960" height="400" fill="url(#sigar-field-fade)" />
      {paths.map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="#a4ad98"
          strokeWidth={1}
          opacity={0.16 + i * 0.05}
        />
      ))}
      <path
        d={paths[Math.floor(paths.length / 2)]}
        fill="none"
        stroke="#e7e3d9"
        strokeWidth={1}
        strokeDasharray="2 6"
        opacity={0.22}
      />
      <defs>
        <radialGradient id="sigar-field-fade" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#34452f" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#161c19" stopOpacity={0.95} />
        </radialGradient>
      </defs>
    </svg>
  );
}
