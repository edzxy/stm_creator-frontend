import React, { useState, useEffect } from 'react';

export interface NodeAttributes {
    stateName: string;
    stateNumber: string;
    vastClass: string;
    conditionLower: number;
    conditionUpper: number;
    eksConditionEstimate: number;
    id?: string; // Optional for editing existing nodes
}

interface NodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (attributes: NodeAttributes) => void;
    initialValues?: NodeAttributes;
    isEditing: boolean;
}

// VAST classes from the JSON data
const VAST_CLASSES = [
    "Class I",
    "Class II",
    "Class III",
    "Class IV",
    "Class V",
    "Class VI"
];

export function NodeModal({ isOpen, onClose, onSave, initialValues, isEditing }: NodeModalProps) {
    const [attributes, setAttributes] = useState<NodeAttributes>({
        stateName: '',
        stateNumber: '',
        vastClass: '',
        conditionLower: 0,
        conditionUpper: 1,
        eksConditionEstimate: 0.5,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Update form when initialValues changes (when editing an existing node)
    useEffect(() => {
        if (initialValues) {
            // Backward compatibility: if legacy condition text exists, try to parse bounds
            let lower = initialValues.conditionLower ?? 0;
            let upper = initialValues.conditionUpper ?? 1;

            const legacy: any = (initialValues as any).condition;
            if (typeof legacy === 'string' && legacy.toLowerCase().includes('condition range')) {
                const match = legacy.match(/([0-9]*\.?[0-9]+)\s*-\s*([0-9]*\.?[0-9]+)/);
                if (match) {
                    const l = parseFloat(match[1]);
                    const u = parseFloat(match[2]);
                    if (!Number.isNaN(l) && !Number.isNaN(u)) {
                        lower = l;
                        upper = u;
                    }
                }
            }

            setAttributes({
                stateName: initialValues.stateName,
                stateNumber: initialValues.stateNumber,
                vastClass: initialValues.vastClass,
                conditionLower: lower,
                conditionUpper: upper,
                eksConditionEstimate: initialValues.eksConditionEstimate ?? 0.5,
                id: initialValues.id,
            });
        } else {
            // Reset form when opening for a new node
            setAttributes({
                stateName: '',
                stateNumber: '',
                vastClass: '',
                conditionLower: 0,
                conditionUpper: 1,
                eksConditionEstimate: 0.5,
            });
        }
    }, [initialValues, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumericField = name === 'conditionLower' || name === 'conditionUpper' || name === 'eksConditionEstimate';
        const nextValue = isNumericField ? (Number.isNaN(parseFloat(value)) ? 0 : parseFloat(value)) : value;
        setAttributes(prev => ({
            ...prev,
            [name]: nextValue as any
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        const { conditionLower, conditionUpper, eksConditionEstimate } = attributes;
        const within01 = (v: number) => v >= 0 && v <= 1;

        if (!within01(conditionLower)) newErrors.conditionLower = 'Must be between 0 and 1';
        if (!within01(conditionUpper)) newErrors.conditionUpper = 'Must be between 0 and 1';
        if (!within01(eksConditionEstimate)) newErrors.eksConditionEstimate = 'Must be between 0 and 1';
        if ((Number.isFinite(conditionLower) && Number.isFinite(conditionUpper)) && conditionLower >= conditionUpper) {
            newErrors.conditionLower = 'Lower bound must be less than upper bound';
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        onSave(attributes);
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '20px',
                    width: '400px',
                    maxWidth: '90%',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                }}
            >
                <h2 style={{ marginTop: 0 }}>{isEditing ? 'Edit Node' : 'Add New Node'}</h2>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            State Name:
                            <input
                                type="text"
                                name="stateName"
                                value={attributes.stateName}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc'
                                }}
                                required
                            />
                        </label>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            State Number:
                            <input
                                type="text"
                                name="stateNumber"
                                value={attributes.stateNumber}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc'
                                }}
                            />
                        </label>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            VAST Class:
                            <select
                                name="vastClass"
                                value={attributes.vastClass}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc'
                                }}
                            >
                                <option value="">Select a class</option>
                                {VAST_CLASSES.map(vastClass => (
                                    <option key={vastClass} value={vastClass}>
                                        {vastClass}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {/* Removed legacy free-text Condition. Now using numeric bounds. */}

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            Condition Lower Bound (0-1):
                            <input
                                type="number"
                                name="conditionLower"
                                value={attributes.conditionLower}
                                onChange={handleChange}
                                min="0"
                                max="1"
                                step="0.01"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc'
                                }}
                            />
                            {errors.conditionLower && (
                                <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{errors.conditionLower}</div>
                            )}
                        </label>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            Condition Upper Bound (0-1):
                            <input
                                type="number"
                                name="conditionUpper"
                                value={attributes.conditionUpper}
                                onChange={handleChange}
                                min="0"
                                max="1"
                                step="0.01"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc'
                                }}
                            />
                            {errors.conditionUpper && (
                                <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{errors.conditionUpper}</div>
                            )}
                        </label>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>
                            EKS Condition Estimate (0-1):
                            <input
                                type="number"
                                name="eksConditionEstimate"
                                value={attributes.eksConditionEstimate}
                                onChange={handleChange}
                                min="0"
                                max="1"
                                step="0.01"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc'
                                }}
                            />
                            {errors.eksConditionEstimate && (
                                <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{errors.eksConditionEstimate}</div>
                            )}
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                backgroundColor: '#f5f5f5',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '8px 16px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#007bff',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            {isEditing ? 'Update' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}