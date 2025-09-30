import React, { useState, useEffect } from 'react';
import { TransitionData } from '../utils/stateTransitionUtils';
import './transitionModal.css';

interface TransitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transitionData: TransitionData) => void;
    transition: TransitionData | null;
    stateNames: Record<number, string>; // Map state IDs to names for display
}

// Interface for Driver data
interface Driver {
    driver: string;
    driver_group: string;
}

// Interface for Chain Part
interface ChainPart {
    chain_part: string;
    drivers: Driver[];
}

// Component to display causal chain drivers grouped by chain part
const CausalChainDisplay = ({
    causalChain,
    onDeleteDriver,
}: {
    causalChain: ChainPart[];
    onDeleteDriver?: (chainPart: string, driverGroup: string, driverName: string) => void;
}) => {
    // Counts total drivers for conditional rendering
    const totalDrivers = causalChain.reduce((count, part) => count + part.drivers.length, 0);

    if (!causalChain || causalChain.length === 0 || totalDrivers === 0) {
        return (
            <div className="empty-causal-chain">
                <p className="empty-causal-chain-message">No causal chain drivers available for this transition.</p>
            </div>
        );
    }

    return (
        <div className="causal-chain-container">
            <h4 className="causal-chain-title">Causal Chain Drivers:</h4>

            {causalChain.map((chainPart, index) => {
                // Skip displaying empty chain parts or those with empty driver lists
                if (!chainPart.chain_part || chainPart.drivers.length === 0) return null;

                return (
                    <div key={index} className="chain-part">
                        <div className="chain-part-header">
                            <span>{chainPart.chain_part}</span>
                            <span className="chain-part-counter">{chainPart.drivers.length}</span>
                        </div>

                        <div className="chain-part-content">
                            {/* Group drivers by driver_group */}
                            {(() => {
                                // Group drivers by driver_group
                                const groupedDrivers = chainPart.drivers.reduce((groups, driver) => {
                                    const group = driver.driver_group;
                                    if (!groups[group]) {
                                        groups[group] = [];
                                    }
                                    groups[group].push(driver);
                                    return groups;
                                }, {} as Record<string, Driver[]>);

                                return Object.entries(groupedDrivers).map(([groupName, drivers], groupIndex) => (
                                    <div key={groupIndex} className="driver-group">
                                        <div className={`driver-group-content ${groupIndex < Object.keys(groupedDrivers).length - 1 ? 'with-border' : ''}`}>
                                            <div className="driver-group-name">
                                                {groupName}
                                            </div>
                                            <ul className="driver-list">
                                                {drivers.map((driver, driverIndex) => (
                                                    <li key={driverIndex} className="driver-item">
                                                        <span className="driver-item-text">{driver.driver}</span>
                                                        {onDeleteDriver && (
                                                            <button
                                                                type="button"
                                                                className="driver-item-delete"
                                                                title="Remove"
                                                                onClick={() => onDeleteDriver(chainPart.chain_part, driver.driver_group, driver.driver)}
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export function TransitionModal({ isOpen, onClose, onSave, transition, stateNames }: TransitionModalProps) {
    const [transitionData, setTransitionData] = useState<TransitionData | null>(null);
    const [activeTab, setActiveTab] = useState<'basic' | 'causal-chain'>('basic');
    // Local add-form state (placeholder options to be replaced later)
    const [newChainPart, setNewChainPart] = useState<string>("");
    const [newDriverGroup, setNewDriverGroup] = useState<string>("");
    const [newDriverName, setNewDriverName] = useState<string>("");

    // Update form when transition changes
    useEffect(() => {
        if (transition) {
            setTransitionData({...transition});
        }
    }, [transition]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!transitionData) return;

        const { name, value } = e.target;
        const numericValue = name === 'time_25' || name === 'time_100' || name === 'transition_delta'
            ? parseFloat(value)
            : value;

        setTransitionData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [name]: numericValue
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (transitionData) {
            onSave(transitionData);
        }
    };

    if (!isOpen || !transitionData) return null;

    // Count total drivers for badge display
    const totalDrivers = transitionData.causal_chain
        ? transitionData.causal_chain.reduce((count, part) => count + part.drivers.length, 0)
        : 0;

    // Helpers for Causal Chain editing
    const uniqueChainParts = Array.from(
        new Set(
            (transitionData.causal_chain || []).map((p: any) => (p && typeof p.chain_part === 'string' ? p.chain_part : ''))
        )
    ).filter(Boolean);

    const uniqueDriverGroups = Array.from(
        new Set(
            (transitionData.causal_chain || [])
                .flatMap((p: any) => (Array.isArray(p?.drivers) ? p.drivers : []))
                .map((d: any) => (d && typeof d.driver_group === 'string' ? d.driver_group : ''))
        )
    ).filter(Boolean);

    // Placeholder driver options. To be replaced with real options later.
    const DRIVER_OPTIONS_PLACEHOLDER = [
        'Option A',
        'Option B',
        'Option C',
    ];

    const handleDeleteDriver = (chainPartName: string, driverGroup: string, driverName: string) => {
        setTransitionData(prev => {
            if (!prev) return prev;
            const current = prev.causal_chain || [];
            const updated = current.map((part: any) => {
                if (part?.chain_part !== chainPartName) return part;
                const drivers: Driver[] = Array.isArray(part.drivers) ? part.drivers : [];
                const filtered = drivers.filter(d => !(d.driver_group === driverGroup && d.driver === driverName));
                return { ...part, drivers: filtered };
            });
            return { ...prev, causal_chain: updated };
        });
    };

    const handleAddDriver = () => {
        if (!newChainPart || !newDriverGroup || !newDriverName) return;
        setTransitionData(prev => {
            if (!prev) return prev;
            const current: ChainPart[] = Array.isArray(prev.causal_chain) ? prev.causal_chain as any : [];
            const idx = current.findIndex(p => p && p.chain_part === newChainPart);
            let next: ChainPart[] = current.map(p => ({ ...p }));
            if (idx === -1) {
                next = [
                    ...current,
                    { chain_part: newChainPart, drivers: [] }
                ] as ChainPart[];
            }
            const targetIndex = idx === -1 ? next.length - 1 : idx;
            const target = next[targetIndex];
            const exists = target.drivers.some(d => d.driver_group === newDriverGroup && d.driver === newDriverName);
            if (!exists) {
                target.drivers = [
                    ...target.drivers,
                    { driver_group: newDriverGroup, driver: newDriverName }
                ];
            }
            // Reset form
            setNewDriverName("");
            return { ...prev, causal_chain: next } as TransitionData;
        });
    };

    return (
        <div className="transition-modal-overlay">
            <div className="transition-modal-container">
                <h2 className="transition-modal-header">
                    <span>Edit Transition</span>
                    <div className={`transition-delta ${transitionData.transition_delta < 0 ? 'negative' : 'positive'}`}>
                        Δ {transitionData.transition_delta.toFixed(2)}
                    </div>
                </h2>

                <div className="transition-info">
                    <div className="transition-id">
                        Transition ID: {transitionData.transition_id}
                    </div>

                    <div className={`transition-status ${transitionData.time_25 === 1 ? 'plausible' : 'implausible'}`}>
                        {transitionData.time_25 === 1 ? 'Plausible' : 'Implausible'}
                    </div>
                </div>

                <div className="states-container">
                    <div className="state-info">
                        <div className="state-name">{stateNames[transitionData.start_state_id]}</div>
                        <div className="state-id">State ID: {transitionData.start_state_id}</div>
                    </div>
                    <div className="state-arrow">→</div>
                    <div className="state-info">
                        <div className="state-name">{stateNames[transitionData.end_state_id]}</div>
                        <div className="state-id">State ID: {transitionData.end_state_id}</div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <button
                        type="button"
                        onClick={() => setActiveTab('basic')}
                        className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
                    >
                        Basic Info
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('causal-chain')}
                        className={`tab ${activeTab === 'causal-chain' ? 'active' : ''}`}
                    >
                        Causal Chain
                        {totalDrivers > 0 && (
                            <span className="tab-counter">{totalDrivers}</span>
                        )}
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {activeTab === 'basic' ? (
                        <>
                            <div className="form-group">
                                <label className="form-label">
                                    Time 25:
                                    <input
                                        type="number"
                                        name="time_25"
                                        value={transitionData.time_25}
                                        onChange={handleChange}
                                        min="0"
                                        max="1"
                                        step="1"
                                        className="form-input"
                                    />
                                    <small className="form-hint">
                                        Set to 1 for plausible transitions, 0 for implausible transitions
                                    </small>
                                </label>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Time 100:
                                    <input
                                        type="number"
                                        name="time_100"
                                        value={transitionData.time_100}
                                        onChange={handleChange}
                                        className="form-input"
                                    />
                                </label>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Transition Delta:
                                    <input
                                        type="number"
                                        name="transition_delta"
                                        value={transitionData.transition_delta}
                                        onChange={handleChange}
                                        step="0.01"
                                        className="form-input"
                                    />
                                    <small className="form-hint">
                                        Change in condition (negative values shown in red, positive in green)
                                    </small>
                                </label>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Notes:
                                    <textarea
                                        name="notes"
                                        value={transitionData.notes}
                                        onChange={handleChange}
                                        className="form-textarea"
                                    />
                                </label>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Add form for Causal Chain Drivers (placeholder options) */}
                            <div className="causal-add-form">
                                <div className="causal-add-row">
                                    <div className="causal-add-field">
                                        <label className="form-label" htmlFor="chainPartSelect">Chain Part</label>
                                        <select
                                            id="chainPartSelect"
                                            className="form-input"
                                            value={newChainPart}
                                            onChange={(e) => setNewChainPart(e.target.value)}
                                        >
                                            <option value="">Select...</option>
                                            {uniqueChainParts.map((cp) => (
                                                <option key={cp} value={cp}>{cp}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="causal-add-field">
                                        <label className="form-label" htmlFor="driverGroupSelect">Driver Group</label>
                                        <select
                                            id="driverGroupSelect"
                                            className="form-input"
                                            value={newDriverGroup}
                                            onChange={(e) => setNewDriverGroup(e.target.value)}
                                        >
                                            <option value="">Select...</option>
                                            {uniqueDriverGroups.map((dg) => (
                                                <option key={dg} value={dg}>{dg}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="causal-add-field">
                                        <label className="form-label" htmlFor="driverNameSelect">Driver</label>
                                        <select
                                            id="driverNameSelect"
                                            className="form-input"
                                            value={newDriverName}
                                            onChange={(e) => setNewDriverName(e.target.value)}
                                        >
                                            <option value="">Select...</option>
                                            {DRIVER_OPTIONS_PLACEHOLDER.map((d) => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="causal-add-actions">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleAddDriver}
                                            disabled={!newChainPart || !newDriverGroup || !newDriverName}
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                                <small className="form-hint">Options are placeholders; will be replaced by final list.</small>
                            </div>

                            <CausalChainDisplay
                                causalChain={transitionData.causal_chain || []}
                                onDeleteDriver={handleDeleteDriver}
                            />
                        </>
                    )}

                    <div className="form-buttons">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                        >
                            Update
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}