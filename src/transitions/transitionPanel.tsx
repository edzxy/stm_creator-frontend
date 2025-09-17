import React, { useState, useEffect } from "react";
import { TransitionData } from "../utils/stateTransitionUtils";

type Props = {
  open: boolean;
  onClose: () => void;
  transition: TransitionData | null;
  stateNames: Record<number, string>;
  onSave: (t: TransitionData) => void;
};

export default function TransitionPanel({
  open,
  onClose,
  transition,
  stateNames,
  onSave,
}: Props) {
  const [local, setLocal] = useState<TransitionData | null>(transition);

  useEffect(() => {
    setLocal(transition ?? null);
  }, [transition]);

  if (!open || !local) return null;

  const update = <K extends keyof TransitionData>(k: K, v: TransitionData[K]) =>
    setLocal({ ...local, [k]: v });

  return (
    <div
      className="transition-panel"
      style={{
        position: "absolute",
        top: 72,
        right: 12,
        width: 360,
        bottom: 12,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        padding: 16,
        zIndex: 1000,
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Transition</h3>
        <button onClick={onClose} style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 8px" }}>
          Off
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 14, color: "#475569" }}>
        <div>From: <strong>{stateNames[local.start_state_id] ?? local.start_state}</strong></div>
        <div>To: <strong>{stateNames[local.end_state_id] ?? local.end_state}</strong></div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={!!local.time_25}
            onChange={(e) => update("time_25", e.target.checked ? 1 : 0)}
          />
          plausible (time_25)
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <input
            type="checkbox"
            checked={!!local.time_100}
            onChange={(e) => update("time_100", e.target.checked ? 1 : 0)}
          />
          certain (time_100)
        </label>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: "#64748b" }}>likelihood_25 (0~1)</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={local.likelihood_25}
            onChange={(e) => update("likelihood_25", Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#64748b" }}>likelihood_100 (0~1)</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={local.likelihood_100}
            onChange={(e) => update("likelihood_100", Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 12, color: "#64748b" }}>Δ (transition_delta)</label>
        <input
          type="number"
          step={0.01}
          value={local.transition_delta}
          onChange={(e) => update("transition_delta", Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 12, color: "#64748b" }}>Notes</label>
        <textarea
          rows={6}
          value={local.notes}
          onChange={(e) => update("notes", e.target.value)}
          style={{ width: "100%", resize: "vertical" }}
        />
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button
          onClick={() => local && onSave(local)}
          className="button button-success"
          style={{ flex: 1 }}
        >
          Preserve
        </button>
        <button onClick={onClose} className="button button-secondary" style={{ flex: 1 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
