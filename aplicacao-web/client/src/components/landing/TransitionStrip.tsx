import { TechnicalLabel } from "./TechnicalLabel";

const WORDS = ["Produzir", "Registrar", "Comparar", "Decidir"];

/**
 * Small indicators overlaid on the hero video's bottom edge — no solid band,
 * just the four words with thin dividers, sitting in the darkest part of the
 * hero's gradient scrim for contrast.
 */
export function TransitionStrip() {
  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {WORDS.map((word, i) => (
        <span key={word} className="flex items-center">
          {i > 0 && <span aria-hidden="true" className="mx-4 h-3 w-px bg-paper/25 sm:mx-6" />}
          <TechnicalLabel className="[text-shadow:0_1px_6px_rgba(22,28,25,0.7)]">{word}</TechnicalLabel>
        </span>
      ))}
    </div>
  );
}
