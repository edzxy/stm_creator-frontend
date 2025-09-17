import LogoutButton from "./components/LogoutButton";
import SupportModal from "./components/SupportModal";
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
import { StateDetailsSidebar, StateDetails } from "./components/StateDetailsSidebar";
import { TransitionModal } from "./transitions/transitionModal";
import { loadBMRGData, saveBMRGData, updateTransition } from "./utils/dataLoader";
import { BMRGData, statesToNodes, TransitionData, transitionsToEdges } from "./utils/stateTransitionUtils";
import { ColorConfigProvider } from "./colorConfig/ColorConfigContext";
import { ColorConfigModal } from "./colorConfig/ColorConfigModal";

// Type definition for delta filter options
type DeltaFilterOption = "all" | "positive" | "neutral" | "negative";

function App() {
  // State for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // State for edge creation mode
  const [edgeCreationMode, setEdgeCreationMode] = useState(false);
  const [startNodeId, setStartNodeId] = useState<string | null>(null);

  // State for self-transition filtering
  const [showSelfTransitions, setShowSelfTransitions] = useState(false);

  // State for delta value filtering
  const [deltaFilter, setDeltaFilter] = useState<DeltaFilterOption>("all");

  // State for the node modal
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [initialNodeValues, setInitialNodeValues] = useState<NodeAttributes | undefined>(undefined);

  // State for the state details sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [initialSidebarValues, setInitialSidebarValues] = useState<StateDetails | undefined>(undefined);

  // State for the transition modal
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [currentTransition, setCurrentTransition] = useState<TransitionData | null>(null);

  // State for the support modal
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // State for the color configuration modal
  const [isColorConfigModalOpen, setIsColorConfigModalOpen] = useState(false);

  // State for the BMRG data
  const [bmrgData, setBmrgData] = useState<BMRGData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Tips 折叠状态
  const [showTips, setShowTips] = useState(true);

  // Load BMRG data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await loadBMRGData();
        setBmrgData(data);

        // Initialize nodes from the data, but don't create edges
        const initialNodes = statesToNodes(
          data.states,
          handleNodeLabelChange,
          handleNodeClick,
          data.transitions
        );
        setNodes(initialNodes);

        // No edges will be created on initial load
        setEdges([]);

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

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const { source, target } = connection;

      // flip source & target
      const flippedConnection = {
        ...connection,
        source: target,
        target: source,
        sourceHandle: connection.targetHandle?.replace("target", "source"),
        targetHandle: connection.sourceHandle?.replace("source", "target"),
      } as Connection;

      setEdges((eds) => addEdge(flippedConnection, eds));
    },
    [setEdges, getNode]
  );

  // Filter edges by delta
  const filterEdgesByDelta = useCallback((edges: Edge[], filterOption: DeltaFilterOption) => {
    if (filterOption === "all") return edges;

    return edges.filter((edge) => {
      const delta = (edge.data?.transitionDelta as number) || 0;
      switch (filterOption) {
        case "positive":
          return delta > 0;
        case "neutral":
          return delta === 0;
        case "negative":
          return delta < 0;
        default:
          return true;
      }
    });
  }, []);

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const newEdges = applyEdgeChanges(changes, eds);

        const edgeUpdates = changes.filter(
          (change) => change.type === "select" && change.selected === false
        );

        if (edgeUpdates.length > 0) {
          edgeUpdates.forEach((update) => {
            let edgeId: string | undefined;
            if (update.type === "select") edgeId = update.id;

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
                const transition = bmrgData.transitions.find(
                  (t) => t.transition_id === transitionId
                );

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
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, label: newLabel },
          } as AppNode;
        }
        return node;
      })
    );
  };

  // Node click
  const handleNodeClick = (nodeId: string) => {
    if (edgeCreationMode) {
      if (startNodeId === null) {
        setStartNodeId(nodeId);
        setNodes((prevNodes) =>
          prevNodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              isSelected: node.id === nodeId,
            },
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
        setNodes((prevNodes) =>
          prevNodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              isSelected: false,
            },
          }))
        );
        setStartNodeId(null);
        setEdgeCreationMode(false);
      }
    } else {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setCurrentNodeId(nodeId);
        setInitialSidebarValues({
          stateName: node.data.label,
          stateNumber: node.data.attributes?.stateNumber || "",
          vastClass: node.data.attributes?.vastClass || "",
          conditionLower: node.data.attributes?.conditionLower || 0,
          conditionUpper: node.data.attributes?.conditionUpper || 1,
          eksConditionEstimate: node.data.attributes?.eksConditionEstimate || 0.5,
          id: nodeId,
        });
        setIsEditing(true);
        setIsSidebarOpen(true);
      }
    }
  };

  // Create new edge
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

    const updatedBmrgData = {
      ...bmrgData,
      transitions: [...bmrgData.transitions, newTransition],
    };
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

    setEdges((prevEdges) => [...prevEdges, edge]);
    setCurrentTransition(newTransition);
    setIsTransitionModalOpen(true);
  };

  // map for modal
  const stateNameMap =
    bmrgData?.states.reduce<Record<number, string>>((map, state) => {
      map[state.state_id] = state.state_name;
      return map;
    }, {}) ?? {};

  // open add node modal
  const openAddNodeModal = () => {
    setCurrentNodeId(null);
    setInitialNodeValues(undefined);
    setIsEditing(false);
    setIsNodeModalOpen(true);
  };

  // save node
  const handleSaveNode = (attributes: NodeAttributes) => {
    if (isEditing && currentNodeId) {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.id === currentNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: attributes.stateName,
                attributes: {
                  stateName: attributes.stateName,
                  stateNumber: attributes.stateNumber,
                  vastClass: attributes.vastClass,
                  condition: attributes.condition,
                  conditionLower: attributes.conditionLower,
                  conditionUpper: attributes.conditionUpper,
                  eksConditionEstimate: attributes.eksConditionEstimate,
                },
              },
            } as AppNode;
          }
          return node;
        })
      );

      if (bmrgData && currentNodeId.startsWith("state-")) {
        const stateId = parseInt(currentNodeId.replace("state-", ""));
        const updatedStates = bmrgData.states.map((state) => {
          if (state.state_id === stateId) {
            return {
              ...state,
              state_name: attributes.stateName,
              condition_lower: attributes.conditionLower,
              condition_upper: attributes.conditionUpper,
              eks_condition_estimate: attributes.eksConditionEstimate,
              vast_state: {
                ...state.vast_state,
                vast_class: attributes.vastClass,
              },
            };
          }
          return state;
        });

        setBmrgData({
          ...bmrgData,
          states: updatedStates,
        });
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
            conditionLower: attributes.conditionLower,
            conditionUpper: attributes.conditionUpper,
            eksConditionEstimate: attributes.eksConditionEstimate,
          },
        },
        position: {
          x: centerX,
          y: centerY,
        },
      };

      setNodes((prevNodes) => [...prevNodes, newNode]);

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
          condition_upper: attributes.conditionUpper,
          condition_lower: attributes.conditionLower,
          eks_condition_estimate: attributes.eksConditionEstimate,
          elicitation_type: "user-created",
          attributes: null,
        };

        setBmrgData({
          ...bmrgData,
          states: [...bmrgData.states, newState],
        });
      }
    }

    setIsNodeModalOpen(false);
  };

  // save state details from sidebar
  const handleSaveStateDetails = (details: StateDetails) => {
    if (isEditing && currentNodeId) {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.id === currentNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: details.stateName,
                attributes: {
                  stateName: details.stateName,
                  stateNumber: details.stateNumber,
                  vastClass: details.vastClass,
                  condition: node.data.attributes?.condition || "",
                  conditionLower: details.conditionLower,
                  conditionUpper: details.conditionUpper,
                  eksConditionEstimate: details.eksConditionEstimate,
                },
              },
            } as AppNode;
          }
          return node;
        })
      );

      if (bmrgData && currentNodeId.startsWith("state-")) {
        const stateId = parseInt(currentNodeId.replace("state-", ""));
        const updatedStates = bmrgData.states.map((state) => {
          if (state.state_id === stateId) {
            return {
              ...state,
              state_name: details.stateName,
              condition_lower: details.conditionLower,
              condition_upper: details.conditionUpper,
              eks_condition_estimate: details.eksConditionEstimate,
              vast_state: {
                ...state.vast_state,
                vast_class: details.vastClass,
              },
            };
          }
          return state;
        });

        setBmrgData({
          ...bmrgData,
          states: updatedStates,
        });
      }
    }

    setIsSidebarOpen(false);
  };

  // edge click/dblclick
  const onEdgeClick: EdgeMouseHandler = useCallback((event, edge) => {
    event.stopPropagation();
    console.log("Edge clicked:", edge.id);
  }, []);

  const onEdgeDoubleClick: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.stopPropagation();
      if (bmrgData) {
        const transitionId = parseInt(edge.id.replace("transition-", ""));
        const transition = bmrgData.transitions.find((t) => t.transition_id === transitionId);
        if (transition) {
          setCurrentTransition(transition);
          setIsTransitionModalOpen(true);
        } else {
          setIsTransitionModalOpen(true);
          createNewEdge(edge);
        }
      }
    },
    [bmrgData]
  );

  // save transition
  const handleSaveTransition = (updatedTransition: TransitionData) => {
    if (bmrgData) {
      const newBmrgData = updateTransition(bmrgData, updatedTransition);
      setBmrgData(newBmrgData);

      setEdges((prevEdges) =>
        prevEdges.map((edge) => {
          if (edge.id === `transition-${updatedTransition.transition_id}`) {
            return {
              ...edge,
              data: {
                ...edge.data,
                transitionDelta: updatedTransition.transition_delta,
                time25: updatedTransition.time_25,
                time100: updatedTransition.time_100,
                notes: updatedTransition.notes,
              },
            };
          }
          return edge;
        })
      );
    }

    setIsTransitionModalOpen(false);
  };

  // save model
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

  // handle support request submission
  const handleSupportSubmit = async (title: string, content: string) => {
    // TODO: Implement API call to backend support endpoint
    // For now, just log the support request
    console.log("Support request submitted:", { title, content, timestamp: new Date().toISOString() });
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Show success message
    alert("Support request submitted successfully! Our team will get back to you soon.");
  };

  // re-layout
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

  // toggle edge creation
  const toggleEdgeCreationMode = () => {
    if (edgeCreationMode) {
      setStartNodeId(null);
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            isSelected: false,
          },
        }))
      );
    }
    setEdgeCreationMode(!edgeCreationMode);
  };

  // load edges with filter
  const loadExistingEdges = () => {
    if (!bmrgData) return;

    const initialEdges = transitionsToEdges(
      bmrgData.transitions.filter((t) => t.time_25 === 1),
      nodes,
      showSelfTransitions
    );

    const filteredEdges = filterEdgesByDelta(initialEdges, deltaFilter);
    setEdges(filteredEdges);
  };

  // toggle self-transitions
  const toggleSelfTransitions = () => {
    const newValue = !showSelfTransitions;
    setShowSelfTransitions(newValue);

    if (bmrgData) {
      const newEdges = transitionsToEdges(
        bmrgData.transitions.filter((t) => t.time_25 === 1),
        nodes,
        newValue
      );

      const filteredEdges = filterEdgesByDelta(newEdges, deltaFilter);
      setEdges(filteredEdges);
    }
  };

  // toggle delta filter
  const toggleDeltaFilter = (option: DeltaFilterOption) => {
    setDeltaFilter(option);

    if (bmrgData) {
      const allEdges = transitionsToEdges(
        bmrgData.transitions.filter((t) => t.time_25 === 1),
        nodes,
        showSelfTransitions
      );

      const filteredEdges = option === "all" ? allEdges : filterEdgesByDelta(allEdges, option);
      setEdges(filteredEdges);
    }
  };

  // nodes with callbacks
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

  const defaultEdgeOptions = {
    type: "custom",
    animated: false,
    updatable: true,
  };

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

          <button
            onClick={() => setIsColorConfigModalOpen(true)}
            className="button button-info"
            title="Configure Node Colors"
          >
            🎨 Color Config
          </button>

          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="button button-help"
            title="Contact Support Team"
          >
            ❓ Help
          </button>

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

          {bmrgData && (
            <div className="info-with-tips">
              <div className="info-panel">
                <strong>{bmrgData.stm_name}</strong>
                <span className="info-separator">•</span>
                <span>{bmrgData.states.length} states</span>
                <span className="info-separator">•</span>
                <span>
                  {bmrgData.transitions.filter((t) => t.time_25 === 1).length} plausible transitions
                  <span className="info-text-muted">
                    {" "}
                    (of {bmrgData.transitions.length} total)
                  </span>
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

              {/* Tips：可折叠 */}
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
          )}
        </div>

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
          edgesFocusable={true}
          elementsSelectable={true}
          edgesReconnectable={true}
          reconnectRadius={10}
          fitView
          fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={defaultEdgeOptions}
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable={true}
          connectOnClick={false}
          zoomOnDoubleClick={false}
          panOnDrag={true}
          panOnScroll={true}
          snapToGrid={true}
          snapGrid={[20, 20]}
        >
          <Background />
          <MiniMap />
          <Controls />
          {/* Tips 不再放在 ReactFlow 内 */}
        </ReactFlow>

        {/* Edge creation help overlay */}
        {edgeCreationMode && (
          <div className="edge-creation-help">
            <span className="edge-creation-help-icon">ℹ️</span>
            {startNodeId
              ? "Now click on a destination node to create an edge"
              : "Click on a source node to start creating an edge"}
          </div>
        )}

        {/* Node Modal */}
        <NodeModal
          isOpen={isNodeModalOpen}
          onClose={() => setIsNodeModalOpen(false)}
          onSave={handleSaveNode}
          initialValues={initialNodeValues}
          isEditing={isEditing}
        />

        {/* Transition Modal */}
        <TransitionModal
          isOpen={isTransitionModalOpen}
          onClose={() => setIsTransitionModalOpen(false)}
          onSave={handleSaveTransition}
          transition={currentTransition}
          stateNames={stateNameMap}
        />

        {/* Support Modal */}
        <SupportModal
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
          onSubmit={handleSupportSubmit}
        />

        {/* Color Configuration Modal */}
        <ColorConfigModal
          isOpen={isColorConfigModalOpen}
          onClose={() => setIsColorConfigModalOpen(false)}
        />

        {/* State Details Sidebar */}
        <StateDetailsSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onSave={handleSaveStateDetails}
          initialValues={initialSidebarValues}
          isEditing={isEditing}
        />
      </div>
    </>
  );
}

// Wrap the App component with ReactFlowProvider and ColorConfigProvider
export default function AppWithProvider() {
  return (
    <ColorConfigProvider>
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>
    </ColorConfigProvider>
  );
}
