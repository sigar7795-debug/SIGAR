import { useEffect, useRef, useState } from "react";
import "./entry-loading-screen.css";

const ENTRY_LOADER_SESSION_KEY = "sigar-entry-loader-seen";
const DISPLAY_THRESHOLD_MS = 300;
const ANIMATION_DURATION_MS = 1900;
const REDUCED_MOTION_DURATION_MS = 800;

type EntryLoadingScreenProps = {
  /** Whether the application is still resolving its initial data. */
  loading: boolean;
  /** Development-only affordance used to review the full sequence locally. */
  forcePreview?: boolean;
};

type LoaderState = "waiting" | "visible" | "complete";

function canUseSessionStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    return false;
  }
}

function hasReducedMotionPreference() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Branded entry loader for SIGAR.
 *
 * It waits for the 300 ms loading threshold, gives the full-screen sequence a
 * strict upper bound and then yields to the application's own skeleton states.
 */
export function EntryLoadingScreen({
  loading,
  forcePreview = false,
}: EntryLoadingScreenProps) {
  const loadingRef = useRef(loading);
  const [state, setState] = useState<LoaderState>("waiting");
  const [reducedMotion] = useState(hasReducedMotionPreference);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const alreadySeen =
      !forcePreview &&
      canUseSessionStorage() &&
      window.sessionStorage.getItem(ENTRY_LOADER_SESSION_KEY) === "true";

    if (alreadySeen) {
      setState("complete");
      return;
    }

    const thresholdTimer = window.setTimeout(
      () => {
        if (!forcePreview && !loadingRef.current) {
          setState("complete");
          return;
        }

        if (!forcePreview && canUseSessionStorage()) {
          window.sessionStorage.setItem(ENTRY_LOADER_SESSION_KEY, "true");
        }

        setState("visible");
      },
      forcePreview ? 40 : DISPLAY_THRESHOLD_MS
    );

    return () => window.clearTimeout(thresholdTimer);
  }, [forcePreview]);

  useEffect(() => {
    if (state !== "visible") return;

    document.documentElement.dataset.sigarLoading = "true";
    const finishTimer = window.setTimeout(
      () => setState("complete"),
      reducedMotion ? REDUCED_MOTION_DURATION_MS : ANIMATION_DURATION_MS
    );

    return () => {
      window.clearTimeout(finishTimer);
      delete document.documentElement.dataset.sigarLoading;
    };
  }, [reducedMotion, state]);

  if (state !== "visible") return null;

  return (
    <section
      className="sigar-loading-screen"
      data-reduced-motion={reducedMotion || undefined}
      role="status"
      aria-live="polite"
      aria-label="Carregando informações do SIGAR"
    >
      <span className="sigar-loading-screen__sr-only">
        Carregando informações do SIGAR
      </span>

      <div className="sigar-loading-screen__frame" aria-hidden="true">
        <div className="sigar-loading-screen__eyebrow">
          <span>Sistema integrado</span>
          <span className="sigar-loading-screen__eyebrow-line" />
          <span>Gestão rural</span>
        </div>

        <svg
          className="sigar-loading-screen__landscape"
          viewBox="0 0 960 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="sigar-landscape-clip">
              <rect x="56" y="96" width="848" height="318" />
            </clipPath>
            <symbol id="sigar-cattle" viewBox="0 0 104 55">
              <path
                d="M16.5 19.8c5-5.7 14.3-8.5 27.7-8.5h23.1c6 0 10.8 1.1 14.4 3.4l8.7-3.2 3.7 3.7-4.2 5.1 4.8 3.5-2.8 4.3-9.2-2.2-7.3 7.2h-8.7l-2.5-9.4-2.5.4 1.2 24.4h-6.4L53 28.8H31.1l-3.3 19.7h-6.4l.9-24.7-6.8 4.7-3.5-2.8 4.5-5.9Z"
                fill="currentColor"
              />
              <path
                d="m86.6 13.4 4.2-6.1 1.9 6.7m-4.3.4 7.2-3.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M16.8 20.2C10 17 7.2 11.7 8.2 5.1"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </symbol>
          </defs>

          <g clipPath="url(#sigar-landscape-clip)">
            <path
              className="sigar-loading-screen__horizon"
              d="M88 232H872"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              className="sigar-loading-screen__far-ground"
              d="M88 232c50-16 99-20 146-11 42 8 83 7 124-2 62-14 121-10 178 8 52 17 108 17 168 1 49-13 105-12 168 4"
              stroke="currentColor"
              strokeWidth="1"
            />

            <g className="sigar-loading-screen__field-lines">
              <path d="M334 232 90 401" />
              <path d="M352 232 184 401" />
              <path d="M370 232 278 401" />
              <path d="M389 232 372 401" />
              <path d="M407 232 466 401" />
              <path d="M426 232 560 401" />
              <path d="M106 382c102-29 227-36 421-22" />
              <path d="M143 347c95-24 210-30 357-18" />
              <path d="M190 311c79-16 172-20 282-12" />
              <path d="M247 275c59-9 124-10 196-5" />
            </g>

            <g className="sigar-loading-screen__property-lines">
              <path d="M484 244h122l31 35h171" />
              <path d="M524 259v74l68 31" />
              <path d="M638 279v92" />
              <path d="M704 279v92" />
              <path d="M770 279v92" />
              <path d="M485 333h323" />
            </g>

            <g className="sigar-loading-screen__fence">
              <path d="M489 251c79 8 183 8 314-1" />
              <path d="M498 261c77 7 178 7 299-1" />
              <path d="M511 246v21m58-13v16m62-14v16m63-17v17m62-18v16" />
            </g>

            <g className="sigar-loading-screen__herd">
              <g className="sigar-loading-screen__cow sigar-loading-screen__cow--one">
                <use
                  href="#sigar-cattle"
                  x="556"
                  y="213"
                  width="72"
                  height="38"
                />
              </g>
              <g className="sigar-loading-screen__cow sigar-loading-screen__cow--two">
                <use
                  href="#sigar-cattle"
                  x="655"
                  y="222"
                  width="59"
                  height="31"
                />
              </g>
              <g className="sigar-loading-screen__cow sigar-loading-screen__cow--three">
                <use
                  href="#sigar-cattle"
                  x="751"
                  y="215"
                  width="67"
                  height="35"
                />
              </g>
            </g>

            <g className="sigar-loading-screen__collector">
              <circle cx="249" cy="356" r="8" fill="var(--sigar-paper)" />
              <circle cx="249" cy="356" r="4.5" fill="currentColor" />
            </g>

            <g className="sigar-loading-screen__grid">
              <rect x="485" y="279" width="323" height="92" />
              <path d="M485 307h323M485 333h323" />
              <path d="M566 279v92M647 279v92M728 279v92" />
            </g>

            <g className="sigar-loading-screen__data-fields">
              <g>
                <text x="500" y="296">
                  RECEITAS
                </text>
                <text x="500" y="322">
                  CUSTOS
                </text>
                <text x="500" y="348">
                  RESULTADOS
                </text>
              </g>
              <g>
                <rect x="581" y="289" width="32" height="5" />
                <rect x="581" y="315" width="49" height="5" />
                <rect x="581" y="341" width="23" height="5" />
              </g>
              <g>
                <rect x="662" y="289" width="48" height="5" />
                <rect x="662" y="315" width="29" height="5" />
                <rect x="662" y="341" width="41" height="5" />
              </g>
              <g>
                <rect x="743" y="289" width="29" height="5" />
                <rect x="743" y="315" width="50" height="5" />
                <rect x="743" y="341" width="37" height="5" />
              </g>
            </g>
          </g>

          <g className="sigar-loading-screen__brand">
            <text x="480" y="454" textAnchor="middle">
              SIGAR
            </text>
            <path d="M342 468H618" />
          </g>
          <text
            className="sigar-loading-screen__message"
            x="480"
            y="495"
            textAnchor="middle"
          >
            ORGANIZANDO INFORMAÇÕES DA PROPRIEDADE
          </text>
          <text
            className="sigar-loading-screen__message-reduced"
            x="480"
            y="495"
            textAnchor="middle"
          >
            ORGANIZANDO INFORMAÇÕES
          </text>
        </svg>

        <div className="sigar-loading-screen__folio">
          <span>Campo em movimento</span>
          <span>Dados em ordem</span>
        </div>
      </div>

      <span className="sigar-loading-screen__wipe-line" aria-hidden="true" />
    </section>
  );
}
