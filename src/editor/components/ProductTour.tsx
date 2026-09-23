"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./ProductTour.module.css";

export const PRODUCT_TOUR_STORAGE_KEY = "canvaslab-product-tour-v1";

interface ProductTourStep {
  target: string;
  eyebrow: string;
  title: string;
  description: string;
  placement: "right" | "left" | "bottom" | "inside-top";
}

const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  {
    target: "toolbar",
    eyebrow: "Create",
    title: "Start with the editor tools",
    description:
      "Use Select, Rectangle, Ellipse, Text, and Frame. Keyboard shortcuts V, R, O, T, and F keep common actions fast.",
    placement: "right",
  },
  {
    target: "layers",
    eyebrow: "Structure",
    title: "Inspect the document hierarchy",
    description:
      "Layers reflects the normalized editor document. Select objects, rename them, or toggle visibility and locking from here.",
    placement: "right",
  },
  {
    target: "workspace",
    eyebrow: "Interact",
    title: "Directly manipulate the canvas",
    description:
      "Drag, resize, rotate, marquee-select, and snap objects. Hold Space while dragging to pan the workspace.",
    placement: "inside-top",
  },
  {
    target: "properties",
    eyebrow: "Inspect",
    title: "Edit precise object properties",
    description:
      "Selected shapes expose fill, position, size, rotation, and opacity controls. Changes remain undoable through command history.",
    placement: "left",
  },
  {
    target: "zoom",
    eyebrow: "Navigate",
    title: "History and viewport controls stay close",
    description:
      "Undo and redo preserve editor transactions, while zoom controls and Fit make it easy to move between detail work and the full composition.",
    placement: "bottom",
  },
  {
    target: "webgpu",
    eyebrow: "Explore",
    title: "Open the WebGPU rendering lab",
    description:
      "CanvasLab keeps Canvas2D as its production renderer. The separate lab compares it with an isolated WebGPU experiment using measured workloads.",
    placement: "bottom",
  },
];

interface ProductTourProps {
  open: boolean;
  onClose: () => void;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function markTourComplete() {
  try {
    window.localStorage.setItem(PRODUCT_TOUR_STORAGE_KEY, "completed");
  } catch {
    // CanvasLab still works when browser storage is unavailable.
  }
}

export function ProductTour({ open, onClose }: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const spotlightRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = PRODUCT_TOUR_STEPS[stepIndex];

  const closeTour = useCallback(() => {
    markTourComplete();
    setStepIndex(0);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let frameId = 0;

    const updatePosition = () => {
      const spotlight = spotlightRef.current;
      const tooltip = tooltipRef.current;

      if (!spotlight || !tooltip) {
        return;
      }

      const target = document.querySelector<HTMLElement>(
        `[data-tour="${currentStep.target}"]`,
      );

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const viewportMargin = 16;

      if (!target) {
        spotlight.style.display = "none";
        tooltip.style.left = "50%";
        tooltip.style.top = "50%";
        tooltip.style.transform = "translate(-50%, -50%)";

        return;
      }

      const targetRect = target.getBoundingClientRect();
      const spotlightPadding = 7;

      const spotlightLeft = Math.max(6, targetRect.left - spotlightPadding);
      const spotlightTop = Math.max(6, targetRect.top - spotlightPadding);
      const spotlightRight = Math.min(
        viewportWidth - 6,
        targetRect.right + spotlightPadding,
      );
      const spotlightBottom = Math.min(
        viewportHeight - 6,
        targetRect.bottom + spotlightPadding,
      );

      spotlight.style.display = "block";
      spotlight.style.left = `${spotlightLeft}px`;
      spotlight.style.top = `${spotlightTop}px`;
      spotlight.style.width = `${Math.max(
        1,
        spotlightRight - spotlightLeft,
      )}px`;
      spotlight.style.height = `${Math.max(
        1,
        spotlightBottom - spotlightTop,
      )}px`;

      tooltip.style.transform = "none";

      const tooltipRect = tooltip.getBoundingClientRect();
      const tooltipWidth = tooltipRect.width || 340;
      const tooltipHeight = tooltipRect.height || 230;
      const gap = 16;

      let left = targetRect.left;
      let top = targetRect.bottom + gap;

      switch (currentStep.placement) {
        case "right":
          left = targetRect.right + gap;
          top = targetRect.top;

          if (left + tooltipWidth > viewportWidth - viewportMargin) {
            left = targetRect.left;
            top = targetRect.bottom + gap;
          }

          break;

        case "left":
          left = targetRect.left - tooltipWidth - gap;
          top = targetRect.top;

          if (left < viewportMargin) {
            left = targetRect.left;
            top = targetRect.bottom + gap;
          }

          break;

        case "inside-top":
          left = targetRect.left + 22;
          top = targetRect.top + 22;

          break;

        case "bottom":
        default:
          left = targetRect.left;
          top = targetRect.bottom + gap;
      }

      if (top + tooltipHeight > viewportHeight - viewportMargin) {
        top = targetRect.top - tooltipHeight - gap;
      }

      tooltip.style.left = `${clamp(
        left,
        viewportMargin,
        Math.max(viewportMargin, viewportWidth - tooltipWidth - viewportMargin),
      )}px`;
      tooltip.style.top = `${clamp(
        top,
        viewportMargin,
        Math.max(
          viewportMargin,
          viewportHeight - tooltipHeight - viewportMargin,
        ),
      )}px`;
    };

    const schedulePositionUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updatePosition);
    };

    schedulePositionUpdate();

    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);

    return () => {
      cancelAnimationFrame(frameId);

      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
    };
  }, [currentStep, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTour();

        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();

        setStepIndex((currentIndex) =>
          Math.min(PRODUCT_TOUR_STEPS.length - 1, currentIndex + 1),
        );

        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();

        setStepIndex((currentIndex) => Math.max(0, currentIndex - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [closeTour, open]);

  if (!open) {
    return null;
  }

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === PRODUCT_TOUR_STEPS.length - 1;

  return (
    <div
      className={styles.tourRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="canvaslab-tour-title"
      aria-describedby="canvaslab-tour-description"
    >
      <div ref={spotlightRef} className={styles.spotlight} aria-hidden="true" />

      <div ref={tooltipRef} className={styles.tooltip}>
        <div className={styles.tooltipHeader}>
          <div>
            <span className={styles.eyebrow}>{currentStep.eyebrow}</span>

            <span className={styles.progress}>
              {stepIndex + 1} / {PRODUCT_TOUR_STEPS.length}
            </span>
          </div>
        </div>

        <div className={styles.copy} aria-live="polite">
          <h2 id="canvaslab-tour-title">{currentStep.title}</h2>

          <p id="canvaslab-tour-description">{currentStep.description}</p>
        </div>

        <div className={styles.keyboardHint}>
          ← / → also moves between steps · Esc closes
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.skipButton}
            onClick={closeTour}
          >
            Skip tour
          </button>

          <div className={styles.navigationActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={isFirstStep}
              onClick={() => {
                setStepIndex((currentIndex) => Math.max(0, currentIndex - 1));
              }}
            >
              Back
            </button>

            <button
              type="button"
              className={styles.primaryButton}
              autoFocus
              onClick={() => {
                if (isLastStep) {
                  closeTour();

                  return;
                }

                setStepIndex((currentIndex) =>
                  Math.min(PRODUCT_TOUR_STEPS.length - 1, currentIndex + 1),
                );
              }}
            >
              {isLastStep ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
