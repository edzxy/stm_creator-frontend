import {useCallback, useEffect, useState} from 'react';
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
    Panel,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    useReactFlow,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import './EdgeStyles.css'; // Import custom edge styles
import './SwimlaneStyle.css'; // Import swimlane styles
import './App.css';
import {nodeTypes as baseNodeTypes} from './nodes';
import {edgeTypes} from './edges';
import {CustomNode} from './nodes/customNode';
import CustomEdge from './edges/customEdge';
import {AppNode} from "./nodes/types";
import {NodeAttributes, NodeModal} from './nodes/nodeModal';
import {TransitionModal} from './transitions/transitionModal';
import {loadBMRGData, saveBMRGData, updateTransition} from './utils/dataLoader';
import {BMRGData, statesToNodes, TransitionData, transitionsToEdges} from './utils/stateTransitionUtils';

// Type definition for delta filter options
type DeltaFilterOption = 'all' | 'positive' | 'neutral' | 'negative';

function App() {
    // State for nodes and edges
    const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // State for edge creation mode
    const [edgeCreationMode, setEdgeCreationMode] = useState(false);
    const [startNodeId, setStartNodeId] = useState<string | null>(null);

    // State for self-transition filtering
    const [showSelfTransitions, setShowSelfTransitions] = useState(false);

    // State for delta value filtering
    const [deltaFilter, setDeltaFilter] = useState<DeltaFilterOption>('all');

    // State for the node modal
    const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
    const [initialNodeValues, setInitialNodeValues] = useState<NodeAttributes | undefined>(undefined);

    // State for the transition modal
    const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
    const [currentTransition, setCurrentTransition] = useState<TransitionData | null>(null);

    // State for the BMRG data
    const [bmrgData, setBmrgData] = useState<BMRGData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load BMRG data on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const data = await loadBMRGData();
                setBmrgData(data);

                // Initialize nodes from the data, but don't create edges
                const initialNodes = statesToNodes(data.states, handleNodeLabelChange, handleNodeClick, data.transitions);
                setNodes(initialNodes);

                // No edges will be created on initial load
                setEdges([]);

                setIsLoading(false);
            } catch (err) {
                console.error('Failed to load BMRG data:', err);
                setError('Failed to load state transition data. Please check the console for details.');
                setIsLoading(false);
            }
        };

        fetchData();
    }, [setEdges, setNodes]);

    const { getNode } = useReactFlow();

    const onConnect: OnConnect = useCallback(
        (connection) => {
            const { source, target } = connection;

            // We have to flip source and target for some reason.
            const flippedConnection = {
                ...connection,
                source: target,
                target: source,
                sourceHandle: connection.targetHandle?.replace("target","source"),
                targetHandle: connection.sourceHandle?.replace("source","target"),
            } as Connection;


            setEdges((eds) => addEdge(flippedConnection, eds));

        },
        [setEdges, getNode]
    );

    // Function to filter edges based on transition delta
    const filterEdgesByDelta = useCallback((edges: Edge[], filterOption: DeltaFilterOption) => {
        if (filterOption === 'all') return edges;

        return edges.filter(edge => {
            const delta = edge.data?.transitionDelta as number || 0;

            switch (filterOption) {
                case 'positive':
                    return delta > 0;
                case 'neutral':
                    return delta === 0;
                case 'negative':
                    return delta < 0;
                default:
                    return true;
            }
        });
    }, []);

    // Function to handle edge changes for updating transition data
    const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
        // Process edge changes first
        setEdges((eds) => {
            const newEdges = applyEdgeChanges(changes, eds);

            // Check for edge connection changes (updates to source or target)
            const edgeUpdates = changes.filter(
                (change) => change.type === 'select' && change.selected === false
            );

            // If there was an update, check if the edge's connection changed
            if (edgeUpdates.length > 0) {
                // Find recently modified edges
                edgeUpdates.forEach(update => {

                    let edgeId: string | undefined;

                    if (update.type === 'select') {
                        edgeId = update.id;
                    }

                    const updatedEdge = newEdges.find(e => e.id === edgeId);
                    const originalEdge = eds.find(e => e.id === edgeId);

                    // If source or target changed, update your data model
                    if (updatedEdge && originalEdge &&
                        (updatedEdge.source !== originalEdge.source ||
                            updatedEdge.target !== originalEdge.target ||
                            updatedEdge.sourceHandle !== originalEdge.sourceHandle ||
                            updatedEdge.targetHandle !== originalEdge.targetHandle)) {

                        console.log('Edge updated:', edgeId);
                        console.log('From:', originalEdge.source, originalEdge.target);
                        console.log('To:', updatedEdge.source, updatedEdge.target);

                        // If the edge has a transitionId in its data
                        if (updatedEdge.data?.transitionId && bmrgData) {
                            const transitionId = updatedEdge.data.transitionId;
                            const transition = bmrgData.transitions.find(t => t.transition_id === transitionId);

                            if (transition) {
                                // Extract state IDs from node IDs
                                const sourceStateId = parseInt(updatedEdge.source.replace('state-', ''));
                                const targetStateId = parseInt(updatedEdge.target.replace('state-', ''));

                                // Create updated transition
                                const updatedTransition = {
                                    ...transition,
                                    start_state_id: sourceStateId,
                                    end_state_id: targetStateId
                                };

                                // Update the transition in your data model
                                const newBmrgData = updateTransition(bmrgData, updatedTransition);
                                setBmrgData(newBmrgData);
                            }
                        }
                    }
                });
            }

            return newEdges;
        });
    }, [bmrgData]);

    // Function to update node labels and attributes
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

    // Function to handle node click
    const handleNodeClick = (nodeId: string) => {
        console.log('Node click:', nodeId);
        if (edgeCreationMode) {
            if (startNodeId === null) {
                // First node clicked during edge creation
                setStartNodeId(nodeId);
                // Highlight the selected node
                setNodes(prevNodes =>
                    prevNodes.map(node => ({
                        ...node,
                        data: {
                            ...node.data,
                            isSelected: node.id === nodeId
                        }
                    }))
                );
            } else {
                // Second node clicked - create the edge and then populate it
                const edge: Edge =
                    {
                        id:"",
                        data:{},
                        source:"",
                        target:"",
                        animated: undefined,
                        deletable: undefined,
                        selectable: undefined,
                        selected: undefined,
                        style: undefined,
                        type:"custom"

                    };

                createNewEdge(edge);
                // Reset selection
                setNodes(prevNodes =>
                    prevNodes.map(node => ({
                        ...node,
                        data: {
                            ...node.data,
                            isSelected: false
                        }
                    }))
                );
                setStartNodeId(null);
                // Exit edge creation mode
                setEdgeCreationMode(false);
            }
        } else {
            // Regular node click to open edit modal
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                setCurrentNodeId(nodeId);
                setInitialNodeValues({
                    stateName: node.data.label,
                    stateNumber: node.data.attributes?.stateNumber || '',
                    vastClass: node.data.attributes?.vastClass || '',
                    condition: node.data.attributes?.condition || '',
                    id: nodeId
                });
                setIsEditing(true);
                setIsNodeModalOpen(true);
            }
        }
    };

    // Function to create a new edge between nodes
    const createNewEdge = (edge:Edge) => {
        if (!bmrgData) return;
        console.log(edge.source, edge.target);
        // Extract state IDs from node IDs
        const sourceStateId = parseInt(edge.source.replace('state-', ''));
        const targetStateId = parseInt(edge.target.replace('state-', ''));

        // Create a new transition ID
        const newTransitionId = Math.max(...bmrgData.transitions.map(t => t.transition_id)) + 1;

        // Get source and target state names
        const sourceState = bmrgData.states.find(s => s.state_id === sourceStateId);
        const targetState = bmrgData.states.find(s => s.state_id === targetStateId);

        if (!sourceState || !targetState) return;

        // Create a new transition
        const newTransition: TransitionData = {
            transition_id: newTransitionId,
            stm_name: bmrgData.stm_name,
            start_state: sourceState.state_name,
            start_state_id: sourceStateId,
            end_state: targetState.state_name,
            end_state_id: targetStateId,
            time_25: 1, // Default to plausible
            time_100: 0,
            likelihood_25: 1,
            likelihood_100: 0,
            notes: "",
            causal_chain: [],
            transition_delta: 0 // Default delta
        };

        console.log("Created new transition:", newTransition);

        // Add the transition to the bmrgData
        const updatedBmrgData = {
            ...bmrgData,
            transitions: [...bmrgData.transitions, newTransition]
        };
        setBmrgData(updatedBmrgData);

        // Create an edge from the transition
        const newEdgeId = `transition-${newTransition.transition_id}`;
        edge.id = newEdgeId;
        edge.type='custom';
        edge.data = {
            transitionId: newTransition.transition_id,
            startStateId: sourceStateId,
            endStateId: targetStateId,
            time25: newTransition.time_25,
            time100: newTransition.time_100,
            transitionDelta: newTransition.transition_delta,
            notes: newTransition.notes
        }


        //console.log("Created new edge:", newEdge);
        setEdges(prevEdges => [...prevEdges, edge]);

        // Open the transition modal for immediate editing
        setCurrentTransition(newTransition);
        setIsTransitionModalOpen(true);
    };

    // Create a mapping of state IDs to state names for the transition modal
    const stateNameMap = bmrgData
        ? bmrgData.states.reduce<Record<number, string>>((map, state) => {
            map[state.state_id] = state.state_name;
            return map;
        }, {})
        : {};

    // Function to open modal for adding a new node
    const openAddNodeModal = () => {
        setCurrentNodeId(null);
        setInitialNodeValues(undefined);
        setIsEditing(false);
        setIsNodeModalOpen(true);
    };

    // Function to save a new node from modal data
    const handleSaveNode = (attributes: NodeAttributes) => {
        if (isEditing && currentNodeId) {
            // Update existing node
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
                                    condition: attributes.condition
                                }
                            },
                        } as AppNode;
                    }
                    return node;
                })
            );

            // Also update the state in the BMRG data
            if (bmrgData && currentNodeId.startsWith('state-')) {
                const stateId = parseInt(currentNodeId.replace('state-', ''));
                const updatedStates = bmrgData.states.map(state => {
                    if (state.state_id === stateId) {
                        return {
                            ...state,
                            state_name: attributes.stateName,
                            // You might update other state properties here
                        };
                    }
                    return state;
                });

                setBmrgData({
                    ...bmrgData,
                    states: updatedStates
                });
            }
        } else {
            // Create a new node
            const newNodeId = `node-${Date.now()}`;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            const newNode: AppNode = {
                id: newNodeId,
                type: 'custom',
                data: {
                    label: attributes.stateName,
                    onLabelChange: handleNodeLabelChange,
                    onNodeClick: handleNodeClick,
                    attributes: {
                        stateName: attributes.stateName,
                        stateNumber: attributes.stateNumber,
                        vastClass: attributes.vastClass,
                        condition: attributes.condition
                    }
                },
                position: {
                    x: centerX,
                    y: centerY,
                },
            };

            setNodes((prevNodes) => [...prevNodes, newNode]);

            // Add to BMRG data (in a real app, you'd properly integrate this)
            if (bmrgData) {
                // This is a simplified example - you would need to create a full state object
                // with all required properties in a real implementation
                const newStateId = Math.max(...bmrgData.states.map(s => s.state_id)) + 1;
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
                        link: ""
                    },
                    condition_upper: 1.0,
                    condition_lower: 0.0,
                    eks_condition_estimate: -9999,
                    elicitation_type: "user-created",
                    attributes: null
                };

                setBmrgData({
                    ...bmrgData,
                    states: [...bmrgData.states, newState]
                });
            }
        }

        setIsNodeModalOpen(false);
    };

    // Function to handle edge click and double click events
    const onEdgeClick: EdgeMouseHandler = useCallback((event, edge) => {
        event.stopPropagation();

        // Only select the edge on single click, don't open the modal
        // Selection is handled automatically by ReactFlow
        console.log("Edge clicked:", edge.id);
    }, []);

    // Function to handle edge double click (open transition modal)
    const onEdgeDoubleClick: EdgeMouseHandler = useCallback((event, edge) => {
        event.stopPropagation();
        console.log("Edge double-clicked:", edge.id);

        if (bmrgData) {
            const transitionId = parseInt(edge.id.replace('transition-', ''));
            console.log("Looking for transition ID:", transitionId);
            const transition = bmrgData.transitions.find(t => t.transition_id === transitionId);

            if (transition) {
                console.log("Found transition:", transition);
                setCurrentTransition(transition);
                setIsTransitionModalOpen(true);
            } else {
                console.log("No transition found with that ID");
                console.log(edge)
                setIsTransitionModalOpen(true);
                createNewEdge(edge)
            }
        }
    }, [bmrgData]);

    // Function to save updated transition
    const handleSaveTransition = (updatedTransition: TransitionData) => {
        if (bmrgData) {
            // Update the BMRG data with the modified transition
            const newBmrgData = updateTransition(bmrgData, updatedTransition);
            setBmrgData(newBmrgData);

            // Update the edges to reflect the changes
            // Find and update the specific edge
            setEdges(prevEdges =>
                prevEdges.map(edge => {
                    if (edge.id === `transition-${updatedTransition.transition_id}`) {
                        return {
                            ...edge,
                            data: {
                                ...edge.data,
                                transitionDelta: updatedTransition.transition_delta,
                                time25: updatedTransition.time_25,
                                time100: updatedTransition.time_100,
                                notes: updatedTransition.notes
                            }
                        };
                    }
                    return edge;
                })
            );
        }

        setIsTransitionModalOpen(false);
    };

    // Function to save the entire model
    const handleSaveModel = async () => {
        if (!bmrgData) return;

        try {
            setIsSaving(true);
            await saveBMRGData(bmrgData);
            setIsSaving(false);
        } catch (error) {
            console.error('Failed to save model:', error);
            setIsSaving(false);
            alert('Failed to save the model. See console for details.');
        }
    };

    // Function to re-layout the nodes
    const handleReLayout = () => {
        if (!bmrgData) return;

        // Get new node layout, using transitions for better placement
        const initialNodes = statesToNodes(bmrgData.states, handleNodeLabelChange, handleNodeClick, bmrgData.transitions);
        setNodes(initialNodes);
    };

    // Function to toggle edge creation mode
    const toggleEdgeCreationMode = () => {
        // If exiting edge creation mode, clear any selected start node
        if (edgeCreationMode) {
            setStartNodeId(null);
            // Clear any node selection highlighting
            setNodes(prevNodes =>
                prevNodes.map(node => ({
                    ...node,
                    data: {
                        ...node.data,
                        isSelected: false
                    }
                }))
            );
        }
        setEdgeCreationMode(!edgeCreationMode);
    };

    // Load existing edges with filter applied
    const loadExistingEdges = () => {
        if (!bmrgData) return;

        // Generate edges from all plausible transitions
        const initialEdges = transitionsToEdges(
            bmrgData.transitions.filter(t => t.time_25 === 1),
            nodes,
            showSelfTransitions
        );

        // Apply the current delta filter
        const filteredEdges = filterEdgesByDelta(initialEdges, deltaFilter);
        setEdges(filteredEdges);
    };

    // Toggle self-transitions with filter applied
    const toggleSelfTransitions = () => {
        const newValue = !showSelfTransitions;
        setShowSelfTransitions(newValue);

        // Update edges with new self-transition setting
        if (bmrgData) {
            const newEdges = transitionsToEdges(
                bmrgData.transitions.filter(t => t.time_25 === 1),
                nodes,
                newValue
            );

            // Apply current delta filter
            const filteredEdges = filterEdgesByDelta(newEdges, deltaFilter);
            setEdges(filteredEdges);
        }
    };

    // Toggle delta filter
    const toggleDeltaFilter = (option: DeltaFilterOption) => {
        setDeltaFilter(option);

        // Update edges with new filter
        if (bmrgData) {
            const allEdges = transitionsToEdges(
                bmrgData.transitions.filter(t => t.time_25 === 1),
                nodes,
                showSelfTransitions
            );

            // Apply the filter
            const filteredEdges = option === 'all'
                ? allEdges
                : filterEdgesByDelta(allEdges, option);

            setEdges(filteredEdges);
        }
    };

    // Add the onNodeClick callback to all nodes
    const nodesWithCallbacks = nodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            onLabelChange: handleNodeLabelChange,
            onNodeClick: handleNodeClick,
            isEdgeCreationMode: edgeCreationMode
        }
    }));

    // Merge custom node types with the base node types
    const nodeTypes = {
        ...baseNodeTypes,
        'custom': CustomNode
    };

    // Define edge types
    const customEdgeTypes = {
        ...edgeTypes,
        'custom': CustomEdge
    };

    // Configure default edge options
    const defaultEdgeOptions = {
        type: 'custom',
        animated: false,
        updatable: true, // Enable edge endpoint updates
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
                <button
                    onClick={() => window.location.reload()}
                    className="error-button"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="controls-toolbar">
                <button
                    onClick={openAddNodeModal}
                    className="button button-primary"
                >
                    ➕ Add Node
                </button>

                <button
                    onClick={toggleEdgeCreationMode}
                    className={`button button-edge-creation ${edgeCreationMode ? 'active' : ''}`}
                >
                    {edgeCreationMode ? '🔗 Cancel Edge Creation' : '🔗 Create Edge'}
                </button>

                <button
                    onClick={loadExistingEdges}
                    className="button button-secondary"
                >
                    🔄 Load All Edges
                </button>

                <button
                    onClick={handleSaveModel}
                    disabled={isSaving}
                    className={`button button-success ${isSaving ? 'button-disabled' : ''}`}
                >
                    {isSaving ? '💾 Saving...' : '💾 Save Model'}
                </button>

                <button
                    onClick={handleReLayout}
                    className="button button-secondary"
                >
                    📊 Re-layout
                </button>

                <button
                    onClick={toggleSelfTransitions}
                    className={`button ${showSelfTransitions ? 'button-info' : 'button-secondary'}`}
                >
                    {showSelfTransitions ? '🔄 Hide Self Transitions' : '🔄 Show Self Transitions'}
                </button>

                <div className="filter-group">
                    <span className="filter-label">Filter by Delta:</span>
                    <button
                        onClick={() => toggleDeltaFilter('all')}
                        className={`button button-filter ${deltaFilter === 'all' ? 'active' : ''}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => toggleDeltaFilter('positive')}
                        className={`button button-filter positive ${deltaFilter === 'positive' ? 'active' : ''}`}
                    >
                        Positive Δ
                    </button>
                    <button
                        onClick={() => toggleDeltaFilter('neutral')}
                        className={`button button-filter neutral ${deltaFilter === 'neutral' ? 'active' : ''}`}
                    >
                        Neutral Δ

                    </button>
                    <button
                        onClick={() => toggleDeltaFilter('negative')}
                        className={`button button-filter negative ${deltaFilter === 'negative' ? 'active' : ''}`}
                    >
                        Negative Δ
                    </button>
                </div>

                {bmrgData && (
                    <div className="info-panel">
                        <strong>{bmrgData.stm_name}</strong>
                        <span className="info-separator">•</span>
                        <span>{bmrgData.states.length} states</span>
                        <span className="info-separator">•</span>
                        <span>
                            {bmrgData.transitions.filter(t => t.time_25 === 1).length} plausible transitions
                            <span className="info-text-muted"> (of {bmrgData.transitions.length} total)</span>
                        </span>
                        {deltaFilter !== 'all' && (
                            <>
                                <span className="info-separator">•</span>
                                <span className={`delta-filter-badge ${deltaFilter}`}>
                                    Showing {deltaFilter} Δ transitions
                                </span>
                            </>
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
                //edgesUpdatable={true} // Enable edge endpoint updates
                edgesFocusable={true}
                elementsSelectable={true}
                edgesReconnectable={true}
                reconnectRadius={10}  // Controls the size of the updater handle
                fitView
                fitViewOptions={{
                    padding: 0.2,
                    includeHiddenNodes: false,
                }}
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

                <Panel position="top-right">
                    <div className="tips-panel">
                        <h3 className="tips-title">Tips</h3>
                        <p className="tips-item">• Click a node to edit it</p>
                        <p className="tips-item">• Use Create Edge button to connect nodes</p>
                        <p className="tips-item">• Click an edge to select it</p>
                        <p className="tips-item">• Double-click an edge to edit transition</p>
                        <p className="tips-item">• Drag edge endpoints to reconnect</p>
                        <p className="tips-item">• Use Re-layout to optimize layout</p>
                        <p className="tips-item">• Toggle self-transitions visibility</p>
                        <p className="tips-item">• Filter transitions by delta value</p>
                    </div>
                </Panel>
            </ReactFlow>

            {/* Edge creation help overlay */}
            {edgeCreationMode && (
                <div className="edge-creation-help">
                    <span className="edge-creation-help-icon">ℹ️</span>
                    {startNodeId ?
                        "Now click on a destination node to create an edge" :
                        "Click on a source node to start creating an edge"}
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
        </div>
    );
}

// Wrap the App component with ReactFlowProvider
export default function AppWithProvider() {
    return (
        <ReactFlowProvider>
            <App />
        </ReactFlowProvider>
    );
}