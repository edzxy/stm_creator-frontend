import React, { useState, useEffect } from 'react';
import './StateDetailsSidebar.css';

export interface StateDetails {
    stateName: string;
    stateNumber: string;
    vastClass: string;
    conditionLower: number;
    conditionUpper: number;
    eksConditionEstimate: number;
    id?: string;
}

interface StateDetailsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (details: StateDetails) => void;
    initialValues?: StateDetails;
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

export function StateDetailsSidebar({ 
    isOpen, 
    onClose, 
    onSave, 
    initialValues, 
    isEditing 
}: StateDetailsSidebarProps) {
    const [details, setDetails] = useState<StateDetails>({
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
            setDetails(initialValues);
        } else {
            // Reset form when opening for a new node
            setDetails({
                stateName: '',
                stateNumber: '',
                vastClass: '',
                conditionLower: 0,
                conditionUpper: 1,
                eksConditionEstimate: 0.5,
            });
        }
        setErrors({});
    }, [initialValues, isOpen]);

    const validateField = (name: string, value: number | string): string => {
        switch (name) {
            case 'conditionLower':
            case 'conditionUpper':
            case 'eksConditionEstimate':
                const numValue = typeof value === 'string' ? parseFloat(value) : value;
                if (isNaN(numValue)) {
                    return 'Must be a valid number';
                }
                if (numValue < 0 || numValue > 1) {
                    return 'Must be between 0 and 1';
                }
                return '';
            case 'stateName':
                if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                    return 'State name is required';
                }
                return '';
            default:
                return '';
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newValue = name.includes('condition') || name.includes('eks') ? parseFloat(value) || 0 : value;
        
        setDetails(prev => ({
            ...prev,
            [name]: newValue
        }));

        // Validate the field
        const error = validateField(name, newValue as string | number);
        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all fields
        const newErrors: Record<string, string> = {};
        Object.keys(details).forEach(key => {
            const value = details[key as keyof StateDetails];
            if (value !== undefined) {
                const error = validateField(key, value);
                if (error) {
                    newErrors[key] = error;
                }
            }
        });

        // Additional validation: conditionLower should be <= conditionUpper
        if (details.conditionLower > details.conditionUpper) {
            newErrors.conditionLower = 'Lower bound must be less than or equal to upper bound';
        }

        setErrors(newErrors);

        // If no errors, save the details
        if (Object.keys(newErrors).length === 0) {
            onSave(details);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="sidebar-overlay">
            <div className="state-details-sidebar">
                <div className="sidebar-header">
                    <h2>{isEditing ? 'Edit State Details' : 'Add New State'}</h2>
                    <button 
                        className="sidebar-close-btn"
                        onClick={onClose}
                        aria-label="Close sidebar"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="sidebar-form">
                    <div className="form-group">
                        <label htmlFor="stateName">
                            State Name *
                        </label>
                        <input
                            type="text"
                            id="stateName"
                            name="stateName"
                            value={details.stateName}
                            onChange={handleChange}
                            className={errors.stateName ? 'error' : ''}
                            required
                        />
                        {errors.stateName && (
                            <span className="error-message">{errors.stateName}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="stateNumber">
                            State Number
                        </label>
                        <input
                            type="text"
                            id="stateNumber"
                            name="stateNumber"
                            value={details.stateNumber}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="vastClass">
                            VAST Class
                        </label>
                        <select
                            id="vastClass"
                            name="vastClass"
                            value={details.vastClass}
                            onChange={handleChange}
                        >
                            <option value="">Select a class</option>
                            {VAST_CLASSES.map(vastClass => (
                                <option key={vastClass} value={vastClass}>
                                    {vastClass}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="conditionLower">
                            Condition Lower Bound (0-1) *
                        </label>
                        <input
                            type="number"
                            id="conditionLower"
                            name="conditionLower"
                            value={details.conditionLower}
                            onChange={handleChange}
                            min="0"
                            max="1"
                            step="0.01"
                            className={errors.conditionLower ? 'error' : ''}
                            required
                        />
                        {errors.conditionLower && (
                            <span className="error-message">{errors.conditionLower}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="conditionUpper">
                            Condition Upper Bound (0-1) *
                        </label>
                        <input
                            type="number"
                            id="conditionUpper"
                            name="conditionUpper"
                            value={details.conditionUpper}
                            onChange={handleChange}
                            min="0"
                            max="1"
                            step="0.01"
                            className={errors.conditionUpper ? 'error' : ''}
                            required
                        />
                        {errors.conditionUpper && (
                            <span className="error-message">{errors.conditionUpper}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="eksConditionEstimate">
                            EKS Condition Estimate (0-1) *
                        </label>
                        <input
                            type="number"
                            id="eksConditionEstimate"
                            name="eksConditionEstimate"
                            value={details.eksConditionEstimate}
                            onChange={handleChange}
                            min="0"
                            max="1"
                            step="0.01"
                            className={errors.eksConditionEstimate ? 'error' : ''}
                            required
                        />
                        {errors.eksConditionEstimate && (
                            <span className="error-message">{errors.eksConditionEstimate}</span>
                        )}
                    </div>

                    <div className="form-actions">
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
                            {isEditing ? 'Update State' : 'Add State'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
