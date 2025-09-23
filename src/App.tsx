// src/App.tsx
import LogoutButton from "./components/LogoutButton";
import { useCallback, useEffect, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  EdgeMouseHandler,
  MiniMap,
  OnConnect,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "./EdgeStyles.css";
import "./SwimlaneStyle.css";
import "./App.css";

import { nodeTypes as baseNodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import { CustomNode } from "./nodes/customNode";
import CustomEdge from "./edges/customEdge";
import { AppNode } from "./nodes/types";
import { NodeAttributes, NodeModal } from "./nodes/nodeModal";
import { TransitionModal } from "./transitions/transitionModal";
import { loadBMRGData, saveBMRGData, updateTransition } from "./utils/dataLoader";
import { BMRGData, statesToNodes, TransitionData, transitionsToEdges } from "./utils/stateTransitionUtils";

// IMPORTANT: match your real path (you showed it's under src/colorConfig)
import { ColorConfigProvider } from "./colorConfig/ColorConfigContext";

// Delta filter options
type DeltaFilterOption = "all" | "positive" | "neutral" | "negative";

/* -------------------- Right-side Transition Panel (lightweight) -------------------- */
function TransitionPanel({
  open,
  onClose,
  transition,
  stateNames,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  transition: TransitionData | null;
  stateNames: Record<number, string>;
  onSave: (t: TransitionData) => void;
}) {
  const [local, setLocal] = useState<TransitionData | null>(transition);

  useEffect(() => {
    setLocal(transition ?? null);
  }, [transition]);

  if (!open || !local) return null;

  const update = <K extends keyof TransitionData>(k: K, v: TransitionData[K]) =>
    setLocal({ ...local, [k]: v });

  return (
    <div className="transition-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Transition</h3>
        <button
          onClick={onClose}
          style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 8px", background: "#f8fafc" }}
        >
          Off
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 14, color: "#475569" }}>
        <div>
          From: <strong>{stateNames[local.start_state_id] ?? local.start_state}</strong>
        </div>
        <div>
          To: <strong>{stateNames[local.end_state_id] ?? local.end_state}</strong>
        </div>
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
          <label style={{ fontSize: 12, color: "#64748b" }}>likelihood_25 (0–1)</label>
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
          <label style={{ fontSize: 12, color: "#64748b" }}>likelihood_100 (0–1)</label>
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
        <button onClick={() => local && onSave(local)} className="button button-success" style={{ flex: 1 }}>
          Preserve
        </button>
        <button onClick={onClose} className="button button-secondary" style={{ flex: 1 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------ App ------------------------------------ */
function App() {
  // Nodes & Edges
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Edge-creation mode
  const [edgeCreationMode, setEdgeCreationMode] = useState(false);
  const [startNodeId, setStartNodeId] = useState<string | null>(null);

  // Filters
  const [showSelfTransitions, setShowSelfTransitions] = useState(false);
  const [deltaFilter, setDeltaFilter] = useState<DeltaFilterOption>("all");
  const [plausibleOnly, setPlausibleOnly] = useState(true);
  const [hasNotesOnly, setHasNotesOnly] = useState(false);

  // Node modal
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [initialNodeValues, setInitialNodeValues] = useState<NodeAttributes | undefined>(undefined);

  // Transition modals
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [currentTransition, setCurrentTransition] = useState<TransitionData | null>(null);
  const [isTransitionSideOpen, setIsTransitionSideOpen] = useState(false);
  const [sideTransition, setSideTransition] = useState<TransitionData | null>(null);

  // Data
  const [bmrgData, setBmrgData] = useState<BMRGData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Tips fold state
  const [showTips, setShowTips] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await loadBMRGData();
        setBmrgData(data);

        const initialNodes = statesToNodes(
          data.states,
          handleNodeLabelChange,
          handleNodeClick,
          data.transitions
        );
        setNodes(initialNodes);

        setEdges([]); // no edges on initial load
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load BMRG data:", err);
        setError("Failed to load state transition data. Please check the console for details.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [setEdges, setNodes]);

  const { getNode } = useReactFlow();

  // On connect (flip source/target for your data model)
  const onConnect: OnConnect = useCallback(
    (connection) => {
      const flipped: Connection = {
        ...connection,
        source: connection.target,
        target: connection.source,
        sourceHandle: connection.targetHandle?.replace("target", "source"),
        targetHandle: connection.sourceHandle?.replace("source", "target"),
      } as Connection;

      setEdges((eds) => addEdge(flipped, eds));
    },
    [setEdges, getNode]
  );

  // Filter by delta helper
  const filterEdgesByDelta = useCallback((eds: Edge[], filterOption: DeltaFilterOption) => {
    if (filterOption === "all") return eds;
    return eds.filter((edge) => {
      const delta = (edge.data?.transitionDelta as number) || 0;
      if (filterOption === "positive") return delta > 0;
      if (filterOption === "neutral") return delta === 0;
      if (filterOption === "negative") return delta < 0;
      return true;
    });
  }, []);

  // Combined transition filters
  const filterTransitions = (all: TransitionData[]) =>
    all.filter((t) => {
      if (plausibleOnly && t.time_25 !== 1) return false;
      if (hasNotesOnly && !(t.notes && t.notes.trim().length > 0)) return false;
      return true;
    });

  // Refresh edges after any filter/flag change
  const refreshEdges = useCallback(() => {
    if (!bmrgData) return;
    const trans = filterTransitions(bmrgData.transitions);
    const edges0 = transitionsToEdges(trans, nodes, showSelfTransitions);
    const edges1 = deltaFilter === "all" ? edges0 : filterEdgesByDelta(edges0, deltaFilter);
    setEdges(edges1);
  }, [bmrgData, nodes, showSelfTransitions, deltaFilter, filterEdgesByDelta]);

  // Handle edges change (update start/end on drag)
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const newEdges = applyEdgeChanges(changes, eds);

        const edgeUpdates = changes.filter(
          (change) => change.type === "select" && change.selected === false
        );

        if (edgeUpdates.length > 0) {
          edgeUpdates.forEach((update) => {
            const edgeId = update.type === "select" ? update.id : undefined;
            const updatedEdge = newEdges.find((e) => e.id === edgeId);
            const originalEdge = eds.find((e) => e.id === edgeId);

            if (
              updatedEdge &&
              originalEdge &&
              (updatedEdge.source !== originalEdge.source ||
                updatedEdge.target !== originalEdge.target ||
                updatedEdge.sourceHandle !== originalEdge.sourceHandle ||
                updatedEdge.targetHandle !== originalEdge.targetHandle)
            ) {
              if (updatedEdge.data?.transitionId && bmrgData) {
                const transitionId = updatedEdge.data.transitionId;
                const transition = bmrgData.transitions.find((t) => t.transition_id === transitionId);
                if (transition) {
                  const sourceStateId = parseInt(updatedEdge.source.replace("state-", ""));
                  const targetStateId = parseInt(updatedEdge.target.replace("state-", ""));
                  const updatedTransition = {
                    ...transition,
                    start_state_id: sourceStateId,
                    end_state_id: targetStateId,
                  };
                  const newBmrgData = updateTransition(bmrgData, updatedTransition);
                  setBmrgData(newBmrgData);
                }
              }
            }
          });
        }

        return newEdges;
      });
    },
    [bmrgData]
  );

  // Update node label
  const handleNodeLabelChange = (nodeId: string, newLabel: string) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, label: newLabel } } : node))
    );
  };

  // Node click: edge creation or open node modal
  const handleNodeClick = (nodeId: string) => {
    if (edgeCreationMode) {
      if (startNodeId === null) {
        setStartNodeId(nodeId);
        setNodes((prev) =>
          prev.map((node) => ({
            ...node,
            data: { ...node.data, isSelected: node.id === nodeId },
          }))
        );
      } else {
        const edge: Edge = {
          id: "",
          data: {},
          source: "",
          target: "",
          animated: undefined,
          deletable: undefined,
          selectable: undefined,
          selected: undefined,
          style: undefined,
          type: "custom",
        };
        createNewEdge(edge);

        setNodes((prev) =>
          prev.map((node) => ({
            ...node,
            data: { ...node.data, isSelected: false },
          }))
        );
        setStartNodeId(null);
        setEdgeCreationMode(false);
      }
    } else {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setCurrentNodeId(nodeId);
        setInitialNodeValues({
          stateName: node.data.label,
          stateNumber: node.data.attributes?.stateNumber || "",
          vastClass: node.data.attributes?.vastClass || "",
          condition: node.data.attributes?.condition || "",
          id: nodeId,
        });
        setIsEditing(true);
        setIsNodeModalOpen(true);
      }
    }
  };

  // Create new edge (and transition)
  const createNewEdge = (edge: Edge) => {
    if (!bmrgData) return;

    const sourceStateId = parseInt(edge.source.replace("state-", ""));
    const targetStateId = parseInt(edge.target.replace("state-", ""));

    const newTransitionId = Math.max(...bmrgData.transitions.map((t) => t.transition_id)) + 1;
    const sourceState = bmrgData.states.find((s) => s.state_id === sourceStateId);
    const targetState = bmrgData.states.find((s) => s.state_id === targetStateId);
    if (!sourceState || !targetState) return;

    const newTransition: TransitionData = {
      transition_id: newTransitionId,
      stm_name: bmrgData.stm_name,
      start_state: sourceState.state_name,
      start_state_id: sourceStateId,
      end_state: targetState.state_name,
      end_state_id: targetStateId,
      time_25: 1,
      time_100: 0,
      likelihood_25: 1,
      likelihood_100: 0,
      notes: "",
      causal_chain: [],
      transition_delta: 0,
    };

    const updatedBmrgData = { ...bmrgData, transitions: [...bmrgData.transitions, newTransition] };
    setBmrgData(updatedBmrgData);

    const newEdgeId = `transition-${newTransition.transition_id}`;
    edge.id = newEdgeId;
    edge.type = "custom";
    edge.data = {
      transitionId: newTransition.transition_id,
      startStateId: sourceStateId,
      endStateId: targetStateId,
      time25: newTransition.time_25,
      time100: newTransition.time_100,
      transitionDelta: newTransition.transition_delta,
      notes: newTransition.notes,
    };

    setEdges((prev) => [...prev, edge]);
    setCurrentTransition(newTransition);
    setIsTransitionModalOpen(true);
  };

  // State ID -> name map
  const stateNameMap =
    bmrgData?.states.reduce<Record<number, string>>((map, state) => {
      map[state.state_id] = state.state_name;
      return map;
    }, {}) ?? {};

  // Add-node modal helpers
  const openAddNodeModal = () => {
    setCurrentNodeId(null);
    setInitialNodeValues(undefined);
    setIsEditing(false);
    setIsNodeModalOpen(true);
  };

  const handleSaveNode = (attributes: NodeAttributes) => {
    if (isEditing && currentNodeId) {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === currentNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: attributes.stateName,
                  attributes: {
                    stateName: attributes.stateName,
                    stateNumber: attributes.stateNumber,
                    vastClass: attributes.vastClass,
                    condition: attributes.condition,
                  },
                },
              }
            : node
        )
      );

      if (bmrgData && currentNodeId.startsWith("state-")) {
        const stateId = parseInt(currentNodeId.replace("state-", ""));
        const updatedStates = bmrgData.states.map((s) =>
          s.state_id === stateId ? { ...s, state_name: attributes.stateName } : s
        );
        setBmrgData({ ...bmrgData, states: updatedStates });
      }
    } else {
      const newNodeId = `node-${Date.now()}`;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const newNode: AppNode = {
        id: newNodeId,
        type: "custom",
        data: {
          label: attributes.stateName,
          onLabelChange: handleNodeLabelChange,
          onNodeClick: handleNodeClick,
          attributes: {
            stateName: attributes.stateName,
            stateNumber: attributes.stateNumber,
            vastClass: attributes.vastClass,
            condition: attributes.condition,
          },
        },
        position: { x: centerX, y: centerY },
      };

      setNodes((prev) => [...prev, newNode]);

      if (bmrgData) {
        const newStateId = Math.max(...bmrgData.states.map((s) => s.state_id)) + 1;
        const newState = {
          state_id: newStateId,
          state_name: attributes.stateName,
          vast_state: {
            vast_class: attributes.vastClass,
            vast_name: "",
            vast_eks_state: -9999,
            eks_overstorey_class: "",
            eks_understorey_class: "",
            eks_substate: "",
            link: "",
          },
          condition_upper: 1.0,
          condition_lower: 0.0,
          eks_condition_estimate: -9999,
          elicitation_type: "user-created",
          attributes: null,
        };
        setBmrgData({ ...bmrgData, states: [...bmrgData.states, newState] });
      }
    }

    setIsNodeModalOpen(false);
  };

  // Edge click/double-click
  const onEdgeClick: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.stopPropagation();
      if (!bmrgData) return;
      const transitionId = parseInt(edge.id.replace("transition-", ""));
      const t = bmrgData.transitions.find((x) => x.transition_id === transitionId) || null;
      setSideTransition(t);
      setIsTransitionSideOpen(!!t);
    },
    [bmrgData]
  );

  const onEdgeDoubleClick: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.stopPropagation();
      if (!bmrgData) return;

      const transitionId = parseInt(edge.id.replace("transition-", ""));
      const transition = bmrgData.transitions.find((t) => t.transition_id === transitionId);
      if (transition) {
        setCurrentTransition(transition);
        setIsTransitionModalOpen(true);
      } else {
        setIsTransitionModalOpen(true);
        createNewEdge(edge);
      }
    },
    [bmrgData]
  );

  // Save transition (both panels)
  const handleSaveTransition = (updatedTransition: TransitionData) => {
    if (bmrgData) {
      const newBmrgData = updateTransition(bmrgData, updatedTransition);
      setBmrgData(newBmrgData);

      setEdges((prevEdges) =>
        prevEdges.map((edge) =>
          edge.id === `transition-${updatedTransition.transition_id}`
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  transitionDelta: updatedTransition.transition_delta,
                  time25: updatedTransition.time_25,
                  time100: updatedTransition.time_100,
                  notes: updatedTransition.notes,
                },
              }
            : edge
        )
      );

      refreshEdges();
    }

    setIsTransitionModalOpen(false);
  };

  // Save model to disk
  const handleSaveModel = async () => {
    if (!bmrgData) return;
    try {
      setIsSaving(true);
      await saveBMRGData(bmrgData);
      setIsSaving(false);
    } catch (error) {
      console.error("Failed to save model:", error);
      setIsSaving(false);
      alert("Failed to save the model. See console for details.");
    }
  };

  // Re-layout nodes
  const handleReLayout = () => {
    if (!bmrgData) return;
    const initialNodes = statesToNodes(
      bmrgData.states,
      handleNodeLabelChange,
      handleNodeClick,
      bmrgData.transitions
    );
    setNodes(initialNodes);
  };

  // Toggle edge-creation mode
  const toggleEdgeCreationMode = () => {
    if (edgeCreationMode) {
      setStartNodeId(null);
      setNodes((prev) =>
        prev.map((node) => ({ ...node, data: { ...node.data, isSelected: false } }))
      );
    }
    setEdgeCreationMode(!edgeCreationMode);
  };

  // Load edges with current filters
  const loadExistingEdges = () => {
    refreshEdges();
  };

  // Toggle filters
  const toggleSelfTransitions = () => {
    const newValue = !showSelfTransitions;
    setShowSelfTransitions(newValue);
    if (bmrgData) refreshEdges();
  };

  const toggleDeltaFilter = (option: DeltaFilterOption) => {
    setDeltaFilter(option);
    if (bmrgData) refreshEdges();
  };

  // Attach callbacks to nodes
  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onLabelChange: handleNodeLabelChange,
      onNodeClick: handleNodeClick,
      isEdgeCreationMode: edgeCreationMode,
    },
  }));

  const nodeTypes = { ...baseNodeTypes, custom: CustomNode };
  const customEdgeTypes = { ...edgeTypes, custom: CustomEdge };
  const defaultEdgeOptions = { type: "custom", animated: false, updatable: true };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading State Transition Model...</div>
        <div className="loading-spinner"></div>
      </div>
    );
    }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-title">Error</div>
        <div>{error}</div>
        <button onClick={() => window.location.reload()} className="error-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <LogoutButton />
      <div className="app-container">
        {/* Top toolbar */}
        <div className="controls-toolbar">
          <button onClick={openAddNodeModal} className="button button-primary">
            ➕ Add Node
          </button>

          <button
            onClick={toggleEdgeCreationMode}
            className={`button button-edge-creation ${edgeCreationMode ? "active" : ""}`}
          >
            {edgeCreationMode ? "🔗 Cancel Edge Creation" : "🔗 Create Edge"}
          </button>

          <button onClick={loadExistingEdges} className="button button-secondary">
            🔄 Load All Edges
          </button>

          <button
            onClick={handleSaveModel}
            disabled={isSaving}
            className={`button button-success ${isSaving ? "button-disabled" : ""}`}
          >
            {isSaving ? "💾 Saving..." : "💾 Save Model"}
          </button>

          <button onClick={handleReLayout} className="button button-secondary">
            📊 Re-layout
          </button>

          <button
            onClick={toggleSelfTransitions}
            className={`button ${showSelfTransitions ? "button-info" : "button-secondary"}`}
          >
            {showSelfTransitions ? "🔄 Hide Self Transitions" : "🔄 Show Self Transitions"}
          </button>

          {/* Delta filter group */}
          <div className="filter-group">
            <span className="filter-label">Filter by Delta:</span>
            <button
              onClick={() => toggleDeltaFilter("all")}
              className={`button button-filter ${deltaFilter === "all" ? "active" : ""}`}
            >
              All
            </button>
            <button
              onClick={() => toggleDeltaFilter("positive")}
              className={`button button-filter positive ${deltaFilter === "positive" ? "active" : ""}`}
            >
              Positive Δ
            </button>
            <button
              onClick={() => toggleDeltaFilter("neutral")}
              className={`button button-filter neutral ${deltaFilter === "neutral" ? "active" : ""}`}
            >
              Neutral Δ
            </button>
            <button
              onClick={() => toggleDeltaFilter("negative")}
              className={`button button-filter negative ${deltaFilter === "negative" ? "active" : ""}`}
            >
              Negative Δ
            </button>
          </div>

          {/* New toggles: Plausible only / Notes only (use filter-chip to avoid white text) */}
          <div className="filter-group" style={{ marginLeft: 8 }}>
            <label className="filter-chip">
              <input
                type="checkbox"
                checked={plausibleOnly}
                onChange={(e) => {
                  setPlausibleOnly(e.target.checked);
                  refreshEdges();
                }}
              />
              Plausible only
            </label>

            <label className="filter-chip">
              <input
                type="checkbox"
                checked={hasNotesOnly}
                onChange={(e) => {
                  setHasNotesOnly(e.target.checked);
                  refreshEdges();
                }}
              />
              Notes only
            </label>
          </div>

          {/* Info panel + collapsible Tips (docked to the left) */}
          {bmrgData && (
            <>
              <div className="info-panel" style={{ marginLeft: 12 }}>
                <strong>{bmrgData.stm_name}</strong>
                <span className="info-separator">•</span>
                <span>{bmrgData.states.length} states</span>
                <span className="info-separator">•</span>
                <span>
                  {bmrgData.transitions.filter((t) => t.time_25 === 1).length} plausible transitions
                  <span className="info-text-muted"> (of {bmrgData.transitions.length} total)</span>
                </span>
                {deltaFilter !== "all" && (
                  <>
                    <span className="info-separator">•</span>
                    <span className={`delta-filter-badge ${deltaFilter}`}>
                      Showing {deltaFilter} Δ transitions
                    </span>
                  </>
                )}
              </div>

              <div className="tips-dock">
                {showTips ? (
                  <div className="tips-popover">
                    <div className="tips-popover-header">
                      <h3 className="tips-title">Tips</h3>
                      <button className="tips-close" onClick={() => setShowTips(false)}>
                        hold ▲
                      </button>
                    </div>
                    <p className="tips-item">• Click a node to edit it</p>
                    <p className="tips-item">• Use Create Edge button to connect nodes</p>
                    <p className="tips-item">• Click an edge to select it</p>
                    <p className="tips-item">• Double-click an edge to edit transition</p>
                    <p className="tips-item">• Drag edge endpoints to reconnect</p>
                    <p className="tips-item">• Use Re-layout to optimize layout</p>
                    <p className="tips-item">• Toggle self-transitions visibility</p>
                    <p className="tips-item">• Filter transitions by delta value</p>
                  </div>
                ) : (
                  <button className="tips-chip" onClick={() => setShowTips(true)}>
                    Tips ▾
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Canvas */}
        <ReactFlow
          nodes={nodesWithCallbacks}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          edges={edges}
          edgeTypes={customEdgeTypes}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          edgesFocusable
          elementsSelectable
          edgesReconnectable
          reconnectRadius={10}
          fitView
          fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={defaultEdgeOptions}
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable
          connectOnClick={false}
          zoomOnDoubleClick={false}
          panOnDrag
          panOnScroll
          snapToGrid
          snapGrid={[20, 20]}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>

        {/* Right-side Transition Property Panel */}
        <TransitionPanel
          open={isTransitionSideOpen}
          onClose={() => setIsTransitionSideOpen(false)}
          transition={sideTransition}
          stateNames={stateNameMap}
          onSave={(updated) => {
            handleSaveTransition(updated);
            setIsTransitionSideOpen(false);
          }}
        />

        {/* Edge-creation hint */}
        {edgeCreationMode && (
          <div className="edge-creation-help">
            <span className="edge-creation-help-icon">ℹ️</span>
            {startNodeId
              ? "Now click on a destination node to create an edge"
              : "Click on a source node to start creating an edge"}
          </div>
        )}

        {/* Modals */}
        <NodeModal
          isOpen={isNodeModalOpen}
          onClose={() => setIsNodeModalOpen(false)}
          onSave={handleSaveNode}
          initialValues={initialNodeValues}
          isEditing={isEditing}
        />

        <TransitionModal
          isOpen={isTransitionModalOpen}
          onClose={() => setIsTransitionModalOpen(false)}
          onSave={handleSaveTransition}
          transition={currentTransition}
          stateNames={stateNameMap}
        />
      </div>
    </>
  );
}

/* -------------------------- Providers Wrapper -------------------------- */
export default function AppWithProvider() {
  return (
    <ReactFlowProvider>
      <ColorConfigProvider>
        <App />
      </ColorConfigProvider>
    </ReactFlowProvider>
  );
}
