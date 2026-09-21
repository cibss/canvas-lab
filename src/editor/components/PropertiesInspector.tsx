"use client";

import { useId, useRef, useState } from "react";

import {
  normalizeNodePropertyValue,
  type EditableNodeProperty,
} from "@/editor/document/nodeProperties";
import type { EditorNode, NodeId } from "@/editor/document/types";

import styles from "./PropertiesInspector.module.css";

interface PropertiesInspectorProps {
  node: EditorNode;

  onCommit: (
    nodeId: NodeId,
    property: EditableNodeProperty,
    value: number,
  ) => void;
}

type PropertyDraftKey = EditableNodeProperty;

type PropertyDraftValues = Partial<Record<PropertyDraftKey, string>>;

interface PropertyDraftState {
  nodeId: NodeId | null;

  values: PropertyDraftValues;
}

interface PropertyInputOptions {
  min?: number;

  max?: number;

  suffix?: string;

  describedBy?: string;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;

  return String(rounded);
}

function getNodePropertyValue(
  node: EditorNode,
  property: PropertyDraftKey,
): number {
  return node[property];
}

function getDisplayValue(
  property: PropertyDraftKey,
  modelValue: number,
): string {
  if (property === "opacity") {
    return formatNumber(modelValue * 100);
  }

  return formatNumber(modelValue);
}

export function PropertiesInspector({
  node,
  onCommit,
}: PropertiesInspectorProps) {
  const positionHelpId = useId();

  const sizeHelpId = useId();

  const rotationHelpId = useId();

  const opacityHelpId = useId();

  const [draftState, setDraftState] = useState<PropertyDraftState>({
    nodeId: null,

    values: {},
  });

  const cancelNextBlurRef = useRef<PropertyDraftKey | null>(null);

  const getInputValue = (property: PropertyDraftKey): string => {
    if (
      draftState.nodeId === node.id &&
      draftState.values[property] !== undefined
    ) {
      return draftState.values[property] ?? "";
    }

    return getDisplayValue(property, getNodePropertyValue(node, property));
  };

  const setDraft = (
    property: PropertyDraftKey,

    value: string,
  ) => {
    setDraftState((current) => {
      const currentValues = current.nodeId === node.id ? current.values : {};

      return {
        nodeId: node.id,

        values: {
          ...currentValues,

          [property]: value,
        },
      };
    });
  };

  const clearDraft = (property: PropertyDraftKey) => {
    setDraftState((current) => {
      if (
        current.nodeId !== node.id ||
        current.values[property] === undefined
      ) {
        return current;
      }

      const nextValues = {
        ...current.values,
      };

      delete nextValues[property];

      return {
        nodeId: Object.keys(nextValues).length > 0 ? node.id : null,

        values: nextValues,
      };
    });
  };

  const commitProperty = (property: PropertyDraftKey) => {
    const value = getInputValue(property);

    if (value.trim() === "") {
      clearDraft(property);

      return;
    }

    const rawValue = Number(value);

    if (!Number.isFinite(rawValue)) {
      clearDraft(property);

      return;
    }

    const modelValue = property === "opacity" ? rawValue / 100 : rawValue;

    const normalizedValue = normalizeNodePropertyValue(property, modelValue);

    onCommit(node.id, property, normalizedValue);

    clearDraft(property);
  };

  const cancelProperty = (property: PropertyDraftKey) => {
    cancelNextBlurRef.current = property;

    clearDraft(property);
  };

  const renderInput = (
    property: PropertyDraftKey,

    label: string,

    options: PropertyInputOptions = {},
  ) => {
    return (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{label}</span>

        <div className={styles.inputWrapper}>
          <input
            type="number"
            inputMode="decimal"
            value={getInputValue(property)}
            min={options.min}
            max={options.max}
            step="any"
            disabled={node.locked}
            aria-describedby={options.describedBy}
            className={styles.input}
            onFocus={(event) => {
              event.currentTarget.select();
            }}
            onChange={(event) => {
              setDraft(property, event.currentTarget.value);
            }}
            onBlur={() => {
              if (cancelNextBlurRef.current === property) {
                cancelNextBlurRef.current = null;

                return;
              }

              commitProperty(property);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();

                event.currentTarget.blur();

                return;
              }

              if (event.key === "Escape") {
                event.preventDefault();

                cancelProperty(property);

                event.currentTarget.blur();
              }
            }}
          />

          {options.suffix ? (
            <span className={styles.suffix} aria-hidden="true">
              {options.suffix}
            </span>
          ) : null}
        </div>
      </label>
    );
  };

  return (
    <div className={styles.inspector}>
      <div className={styles.summary}>
        <strong>{node.name}</strong>

        <span>{node.type}</span>

        {node.locked ? <small>Locked</small> : null}
      </div>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Position</legend>

        <p id={positionHelpId} className={styles.srOnly}>
          X and Y are relative to the object&apos;s parent.
        </p>

        <div className={styles.grid}>
          {renderInput("x", "X", {
            describedBy: positionHelpId,
          })}

          {renderInput("y", "Y", {
            describedBy: positionHelpId,
          })}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Size</legend>

        <p id={sizeHelpId} className={styles.srOnly}>
          Width and height must be at least 1.
        </p>

        <div className={styles.grid}>
          {renderInput("width", "W", {
            min: 1,

            describedBy: sizeHelpId,
          })}

          {renderInput("height", "H", {
            min: 1,

            describedBy: sizeHelpId,
          })}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Transform</legend>

        <p id={rotationHelpId} className={styles.srOnly}>
          Rotation is measured in degrees. Values are normalized between 0 and
          359 degrees.
        </p>

        <p id={opacityHelpId} className={styles.srOnly}>
          Opacity is a percentage between 0 and 100.
        </p>

        <div className={styles.grid}>
          {renderInput("rotation", "Rotation", {
            suffix: "°",

            describedBy: rotationHelpId,
          })}

          {renderInput("opacity", "Opacity", {
            min: 0,
            max: 100,
            suffix: "%",

            describedBy: opacityHelpId,
          })}
        </div>
      </fieldset>
    </div>
  );
}
