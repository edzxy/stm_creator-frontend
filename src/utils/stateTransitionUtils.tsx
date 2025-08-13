import { Edge } from '@xyflow/react';
import { AppNode, CustomNodeData } from '../nodes/types';
import { NodeAttributes } from '../nodes/nodeModal';

// Type definitions for the JSON data
export interface StateData {
    state_id: number;
    state_name: string;
    vast_state: {
        vast_class: string;
        vast_name: string;
        vast_eks_state: number;
        eks_overstorey_class: string;
        eks_understorey_class: string;
        eks_substate: string;
        link: string;
    };
    condition_upper: number;
    condition_lower: number;
    eks_condition_estimate: number;
    elicitation_type: string;
    attributes: any;
}

export interface TransitionData {
    transition_id: number;
    stm_name: string;
    start_state: string;
    start_state_id: number;
    end_state: string;
    end_state_id: number;
    time_25: number;
    time_100: number;
    likelihood_25: number;
    likelihood_100: number;
    notes: string;
    causal_chain: any[];
    transition_delta: number;
}

export interface BMRGData {
    stm_name: string;
    version: string;
    release_date: string;
    authorised_by: string;
    contributing_experts: any[];
    region: string;
    region_id: number;
    climate: string;
    ecosystem_type: string;
    aus_eco_archetype_code: number;
    aus_eco_archetype_name: string;
    aus_eco_umbrella_code: number;
    peer_reviewed: string;
    no_peer_reviewers: number;
    states: StateData[];
    transitions: TransitionData[];
    method_alignment: string;
}

// Helper function to get class number as integer
function getVastClassNumber(vastClass: string): number {
    if (vastClass === 'Class I') return 1;
    if (vastClass === 'Class II') return 2;
    if (vastClass === 'Class III') return 3;
    if (vastClass === 'Class IV') return 4;
    if (vastClass === 'Class V') return 5;
    if (vastClass === 'Class VI') return 6;
    return 0;
}

// Function to analyze the network and optimize node positions
function optimizeNodeLayout(states: StateData[], transitions: TransitionData[]): Map<number, { x: number, y: number }> {
    const positions = new Map<number, { x: number, y: number }>();

    // First, group states by VAST class
    const statesByClass = new Map<string, StateData[]>();

    states.forEach(state => {
        const vastClass = state.vast_state.vast_class;
        if (!statesByClass.has(vastClass)) {
            statesByClass.set(vastClass, []);
        }
        statesByClass.get(vastClass)?.push(state);
    });

    // Sort classes from lowest to highest (I to VI)
    const sortedClasses = Array.from(statesByClass.keys()).sort((a, b) => {
        return getVastClassNumber(a) - getVastClassNumber(b);
    });

    // Calculate transition counts for each state - how many connections it has
    const connectionWeights = new Map<number, { inbound: number, outbound: number, total: number }>();

    // Initialize all states with zero connections
    states.forEach(state => {
        connectionWeights.set(state.state_id, { inbound: 0, outbound: 0, total: 0 });
    });

    // Only count plausible transitions (time_25 === 1)
    transitions.filter(t => t.time_25 === 1).forEach(transition => {
        const startId = transition.start_state_id;
        const endId = transition.end_state_id;

        // Skip self-transitions for weight calculation
        if (startId === endId) return;

        // Get current weights or initialize
        const startWeights = connectionWeights.get(startId) || { inbound: 0, outbound: 0, total: 0 };
        const endWeights = connectionWeights.get(endId) || { inbound: 0, outbound: 0, total: 0 };

        // Update outbound for start state
        startWeights.outbound += 1;
        startWeights.total += 1;

        // Update inbound for end state
        endWeights.inbound += 1;
        endWeights.total += 1;

        // Save updated weights
        connectionWeights.set(startId, startWeights);
        connectionWeights.set(endId, endWeights);
    });

    // Calculate horizontal position based on VAST class (swimlanes)
    const viewportWidth = 1400;
    const leftMargin = 100;
    const rightMargin = 100;
    const usableWidth = viewportWidth - leftMargin - rightMargin;

    // If there are no classes, return empty positions
    if (sortedClasses.length === 0) return positions;

    // Calculate horizontal spacing between swimlanes
    const horizontalSpacing = usableWidth / sortedClasses.length;

    // First, identify states with special handling (Reference, Removed, etc.)
    const specialStates = new Set<number>();

    // Calculate vertical positions within each class column
    sortedClasses.forEach((vastClass, classIndex) => {
        const classStates = statesByClass.get(vastClass) || [];
        if (classStates.length === 0) return;

        // Sort states by total connections within the class (most connected first)
        classStates.sort((a, b) => {
            const weightA = connectionWeights.get(a.state_id)?.total || 0;
            const weightB = connectionWeights.get(b.state_id)?.total || 0;
            return weightB - weightA;
        });

        // For layout, calculate the position in the column
        const x = leftMargin + classIndex * horizontalSpacing;

        // Special case for Reference state - always place at top
        const referenceStateIndex = classStates.findIndex(s => s.state_name === "Reference");
        if (referenceStateIndex >= 0) {
            const referenceState = classStates[referenceStateIndex];
            positions.set(referenceState.state_id, { x, y: 50 });
            specialStates.add(referenceState.state_id);
        }

        // Special case for Removed state - place at bottom if exists
        const removedStateIndex = classStates.findIndex(s => s.state_name === "Removed");
        if (removedStateIndex >= 0) {
            const removedState = classStates[removedStateIndex];
            positions.set(removedState.state_id, { x, y: 600 });
            specialStates.add(removedState.state_id);
        }

        // Special case for "Cropping or sown pasture" - place near bottom
        const croppingStateIndex = classStates.findIndex(s => s.state_name.includes("Cropping"));
        if (croppingStateIndex >= 0) {
            const croppingState = classStates[croppingStateIndex];
            positions.set(croppingState.state_id, { x, y: 500 });
            specialStates.add(croppingState.state_id);
        }

        // Position remaining states in the class
        const remainingStates = classStates.filter(s => !specialStates.has(s.state_id));

        // Calculate vertical spacing for remaining states
        const verticalSpacing = 120; // Adjust for better spacing
        const startY = 150; // Start below Reference state

        remainingStates.forEach((state, stateIndex) => {
            // Space remaining states evenly
            const y = startY + stateIndex * verticalSpacing;
            positions.set(state.state_id, { x, y });
        });
    });

    return positions;
}

// Create a formatted condition string from the data
function getConditionString(state: StateData): string {
    if (state.condition_upper === -9999 || state.condition_lower === -9999) {
        return 'No condition data';
    }
    return `Condition range: ${state.condition_lower.toFixed(2)} - ${state.condition_upper.toFixed(2)}`;
}

// Convert state data to node attributes
function stateToNodeAttributes(state: StateData): NodeAttributes {
    return {
        stateName: state.state_name,
        stateNumber: state.state_id.toString(),
        vastClass: state.vast_state.vast_class,
        condition: getConditionString(state),
    };
}

// Convert states array to React Flow nodes
export function statesToNodes(
    states: StateData[],
    onLabelChange: (id: string, newLabel: string) => void,
    onNodeClick: (id: string) => void,
    transitions: TransitionData[] = []
): AppNode[] {
    console.log('Creating nodes with optimized layout');

    // Get optimized positions for all nodes using transitions data for better layout
    const positions = optimizeNodeLayout(states, transitions);

    return states.map((state) => {
        const position = positions.get(state.state_id) || { x: 0, y: 0 };

        return {
            id: `state-${state.state_id}`,
            type: 'custom',
            position,
            data: {
                label: state.state_name,
                onLabelChange,
                onNodeClick,
                attributes: stateToNodeAttributes(state),
            } as CustomNodeData,
        } as AppNode;
    });
}

// Determine the optimal handle to use based on node positions
// Improved function to determine the optimal handle to use based on node positions
function determineOptimalHandles(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
): { sourceHandle: string, targetHandle: string } {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // Convert to degrees

    // Calculate the absolute angle for easier categorization
    const absAngle = ((angle % 360) + 360) % 360;

    // Define the angle ranges for each side
    // Right: -45 to 45 degrees
    // Bottom: 45 to 135 degrees
    // Left: 135 to 225 degrees
    // Top: 225 to 315 degrees

    // Determine source handle based on direction FROM source node
    let sourceHandle: string;
    if (absAngle >= 315 || absAngle < 45) {
        // Target is to the right of source
        sourceHandle = 'right-center-source';
    } else if (absAngle >= 45 && absAngle < 135) {
        // Target is below source
        sourceHandle = 'bottom-center-source';
    } else if (absAngle >= 135 && absAngle < 225) {
        // Target is to the left of source
        sourceHandle = 'left-center-source';
    } else {
        // Target is above source
        sourceHandle = 'top-center-source';
    }

    // Determine target handle based on direction TO target node
    // We add 180 degrees to get the incoming angle
    const incomingAngle = (absAngle + 180) % 360;

    let targetHandle: string;
    if (incomingAngle >= 315 || incomingAngle < 45) {
        // Source is to the right of target
        targetHandle = 'right-center-target';
    } else if (incomingAngle >= 45 && incomingAngle < 135) {
        // Source is below target
        targetHandle = 'bottom-center-target';
    } else if (incomingAngle >= 135 && incomingAngle < 225) {
        // Source is to the left of target
        targetHandle = 'left-center-target';
    } else {
        // Source is above target
        targetHandle = 'top-center-target';
    }

    // Handle edge cases for very close nodes
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 100) {
        // For close nodes, use alternate handles to avoid overlapping
        // Prefer horizontal connections for very close nodes
        if (Math.abs(dx) >= Math.abs(dy)) {
            if (dx >= 0) {
                sourceHandle = 'right-center-source';
                targetHandle = 'left-center-target';
            } else {
                sourceHandle = 'left-center-source';
                targetHandle = 'right-center-target';
            }
        } else {
            if (dy >= 0) {
                sourceHandle = 'bottom-center-source';
                targetHandle = 'top-center-target';
            } else {
                sourceHandle = 'top-center-source';
                targetHandle = 'bottom-center-target';
            }
        }
    }

    return { sourceHandle, targetHandle };
}

// Modified function for bidirectional transitions
function getHandlesForBidirectionalEdges(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    isFirstDirection: boolean
): { sourceHandle: string, targetHandle: string } {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;

    // Determine the main axis (horizontal or vertical)
    const isHorizontalMainAxis = Math.abs(dx) > Math.abs(dy);

    // For first direction: use center handles
    // For second direction: use offset handles
    if (isHorizontalMainAxis) {
        if (dx > 0) { // Source is to the left of target
            if (isFirstDirection) {
                return {
                    sourceHandle: 'right-center-source',
                    targetHandle: 'left-center-target'
                };
            } else {
                return {
                    sourceHandle: 'right-top-source',
                    targetHandle: 'left-bottom-target'
                };
            }
        } else { // Source is to the right of target
            if (isFirstDirection) {
                return {
                    sourceHandle: 'left-center-source',
                    targetHandle: 'right-center-target'
                };
            } else {
                return {
                    sourceHandle: 'left-top-source',
                    targetHandle: 'right-bottom-target'
                };
            }
        }
    } else { // Vertical axis dominant
        if (dy > 0) { // Source is above target
            if (isFirstDirection) {
                return {
                    sourceHandle: 'bottom-center-source',
                    targetHandle: 'top-center-target'
                };
            } else {
                return {
                    sourceHandle: 'bottom-left-source',
                    targetHandle: 'top-right-target'
                };
            }
        } else { // Source is below target
            if (isFirstDirection) {
                return {
                    sourceHandle: 'top-center-source',
                    targetHandle: 'bottom-center-target'
                };
            } else {
                return {
                    sourceHandle: 'top-left-source',
                    targetHandle: 'bottom-right-target'
                };
            }
        }
    }
}

// Modified transitionsToEdges function using the improved handle selection
export function transitionsToEdges(transitions: TransitionData[], nodes: AppNode[] = [], includeSelfTransitions: boolean = false): Edge[] {
    // Filter transitions
    const filteredTransitions = transitions
        .filter(transition => transition.time_25 === 1)
        .filter(transition => includeSelfTransitions || transition.start_state_id !== transition.end_state_id);

    // Count connections between pairs for bidirectional checking
    const connectionPairs = new Map<string, number>();
    const processedConnections = new Map<string, boolean>();

    // First pass - count connections between each pair of states
    filteredTransitions.forEach(transition => {
        const stateA = Math.min(transition.start_state_id, transition.end_state_id);
        const stateB = Math.max(transition.start_state_id, transition.end_state_id);
        const key = `${stateA}-${stateB}`;

        connectionPairs.set(key, (connectionPairs.get(key) || 0) + 1);
    });

    // Process transitions to create edges
    return filteredTransitions.map((transition) => {
        // Special handling for self-transitions (loops) if included
        if (transition.start_state_id === transition.end_state_id) {
            return {
                id: `transition-${transition.transition_id}`,
                source: `state-${transition.start_state_id}`,
                target: `state-${transition.end_state_id}`,
                sourceHandle: 'right-center-source',
                targetHandle: 'top-center-target',
                type: 'custom',
                data: {
                    transitionId: transition.transition_id,
                    startStateId: transition.start_state_id,
                    endStateId: transition.end_state_id,
                    time25: transition.time_25,
                    time100: transition.time_100,
                    transitionDelta: transition.transition_delta,
                    notes: transition.notes,
                    curvature: 0.7, // Higher curvature for loops
                    isBidirectional: false,
                    isLoop: true
                }
            };
        }

        // Find the source and target nodes to get their positions
        const sourceNode = nodes.find(n => n.id === `state-${transition.start_state_id}`);
        const targetNode = nodes.find(n => n.id === `state-${transition.end_state_id}`);

        // Default handles - will be overridden if node positions are available
        let sourceHandle = 'right-center-source';
        let targetHandle = 'left-center-target';
        let curvature = 0.25;

        // Check if this is a bidirectional transition
        const stateA = Math.min(transition.start_state_id, transition.end_state_id);
        const stateB = Math.max(transition.start_state_id, transition.end_state_id);
        const pairKey = `${stateA}-${stateB}`;
        const isBidirectional = connectionPairs.get(pairKey) === 2;

        // Mark whether this is the first or second direction of a bidirectional pair
        const directionKey = `${transition.start_state_id}-${transition.end_state_id}`;
        const isFirstDirection = !processedConnections.has(directionKey);

        if (isFirstDirection) {
            processedConnections.set(directionKey, true);
        }

        if (sourceNode && targetNode) {
            // We have node positions, so use them to determine optimal handles
            if (isBidirectional) {
                // Use specialized function for bidirectional edges
                const handles = getHandlesForBidirectionalEdges(
                    sourceNode.position.x,
                    sourceNode.position.y,
                    targetNode.position.x,
                    targetNode.position.y,
                    isFirstDirection
                );
                sourceHandle = handles.sourceHandle;
                targetHandle = handles.targetHandle;

                // Adjust curvature for bidirectional edges - first direction less curved
                curvature = isFirstDirection ? 0.2 : 0.4;
            } else {
                // Use standard handle selection for unidirectional edges
                const handles = determineOptimalHandles(
                    sourceNode.position.x,
                    sourceNode.position.y,
                    targetNode.position.x,
                    targetNode.position.y
                );
                sourceHandle = handles.sourceHandle;
                targetHandle = handles.targetHandle;
            }
        }

        return {
            id: `transition-${transition.transition_id}`,
            source: `state-${transition.start_state_id}`,
            target: `state-${transition.end_state_id}`,
            sourceHandle: sourceHandle,
            targetHandle: targetHandle,
            type: 'custom',
            data: {
                transitionId: transition.transition_id,
                startStateId: transition.start_state_id,
                endStateId: transition.end_state_id,
                time25: transition.time_25,
                time100: transition.time_100,
                transitionDelta: transition.transition_delta,
                notes: transition.notes,
                curvature: curvature,
                isBidirectional: isBidirectional
            }
        };
    }) as Edge[];
}