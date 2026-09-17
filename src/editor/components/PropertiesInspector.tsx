"use client";

import { useRef, useState } from "react";

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

    options?: {
      min?: number;
      max?: number;
      suffix?: string;
    },
  ) => {
    return (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{label}</span>

        <div className={styles.inputWrapper}>
          <input
            type="number"
            value={getInputValue(property)}
            min={options?.min}
            max={options?.max}
            step="any"
            disabled={node.locked}
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

          {options?.suffix ? (
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

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Position</div>

        <div className={styles.grid}>
          {renderInput("x", "X")}

          {renderInput("y", "Y")}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Size</div>

        <div className={styles.grid}>
          {renderInput("width", "W", {
            min: 1,
          })}

          {renderInput("height", "H", {
            min: 1,
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Transform</div>

        <div className={styles.grid}>
          {renderInput("rotation", "Rotation", {
            suffix: "°",
          })}

          {renderInput("opacity", "Opacity", {
            min: 0,
            max: 100,
            suffix: "%",
          })}
        </div>
      </section>
    </div>
  );
}
