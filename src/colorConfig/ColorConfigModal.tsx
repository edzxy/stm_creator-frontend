import { useState, useEffect } from 'react';
import { useColorConfig } from './ColorConfigContext';
import { ColorScheme, ColorRange } from './types';
import { generateColorPreview, validateColorScheme } from './colorUtils';
import './ColorConfigModal.css';

interface ColorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ColorConfigModal({ isOpen, onClose }: ColorConfigModalProps) {
  const {
    colorConfig,
    updateActiveScheme,
    updateConditionField,
    addScheme,
    updateScheme,
    deleteScheme,
    resetToDefault
  } = useColorConfig();

  const [activeTab, setActiveTab] = useState<'schemes' | 'settings'>('schemes');
  const [editingScheme, setEditingScheme] = useState<ColorScheme | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // const activeScheme = getActiveScheme(); // Removed unused variable

  if (!isOpen) return null;

  return (
    <div className="color-config-overlay">
      <div className="color-config-modal">
        <div className="color-config-header">
          <h2>Color Configuration</h2>
          <button className="color-config-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="color-config-tabs">
          <button
            className={`color-config-tab ${activeTab === 'schemes' ? 'active' : ''}`}
            onClick={() => setActiveTab('schemes')}
          >
            Color Schemes
          </button>
          <button
            className={`color-config-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div className="color-config-content">
          {activeTab === 'schemes' && (
            <ColorSchemesTab
              schemes={colorConfig.schemes}
              activeSchemeId={colorConfig.activeSchemeId}
              onSelectScheme={updateActiveScheme}
              onEditScheme={setEditingScheme}
              onDeleteScheme={deleteScheme}
              onCreateNew={() => {
                setIsCreatingNew(true);
                setEditingScheme({
                  id: '',
                  name: '',
                  type: 'continuous',
                  ranges: [
                    { min: 0, max: 0.5, color: '#ff0000' },
                    { min: 0.5, max: 1, color: '#00ff00' }
                  ]
                });
              }}
            />
          )}

          {activeTab === 'settings' && (
            <ColorSettingsTab
              conditionField={colorConfig.conditionField}
              onConditionFieldChange={updateConditionField}
              onResetToDefault={resetToDefault}
            />
          )}
        </div>

        {editingScheme && (
          <ColorSchemeEditor
            scheme={editingScheme}
            isNew={isCreatingNew}
            onSave={(updatedScheme) => {
              if (isCreatingNew) {
                addScheme({ ...updatedScheme, id: `scheme-${Date.now()}` });
              } else {
                updateScheme(editingScheme.id, updatedScheme);
              }
              setEditingScheme(null);
              setIsCreatingNew(false);
            }}
            onCancel={() => {
              setEditingScheme(null);
              setIsCreatingNew(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ColorSchemesTab({
  schemes,
  activeSchemeId,
  onSelectScheme,
  onEditScheme,
  onDeleteScheme,
  onCreateNew
}: {
  schemes: ColorScheme[];
  activeSchemeId: string;
  onSelectScheme: (id: string) => void;
  onEditScheme: (scheme: ColorScheme) => void;
  onDeleteScheme: (id: string) => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="color-schemes-tab">
      <div className="schemes-header">
        <h3>Available Color Schemes</h3>
        <button className="btn btn-primary" onClick={onCreateNew}>
          + Create New Scheme
        </button>
      </div>

      <div className="schemes-list">
        {schemes.map(scheme => (
          <div
            key={scheme.id}
            className={`scheme-item ${activeSchemeId === scheme.id ? 'active' : ''}`}
            onClick={() => onSelectScheme(scheme.id)}
          >
            <div className="scheme-preview">
              <ColorSchemePreview scheme={scheme} />
            </div>
            <div className="scheme-info">
              <h4>{scheme.name}</h4>
              <p className="scheme-type">{scheme.type}</p>
              {scheme.description && (
                <p className="scheme-description">{scheme.description}</p>
              )}
            </div>
            <div className="scheme-actions">
              <button
                className="btn btn-sm btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditScheme(scheme);
                }}
              >
                Edit
              </button>
              {scheme.id !== 'default-green' && (
                <button
                  className="btn btn-sm btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteScheme(scheme.id);
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorSettingsTab({
  conditionField,
  onConditionFieldChange,
  onResetToDefault
}: {
  conditionField: string;
  onConditionFieldChange: (field: any) => void;
  onResetToDefault: () => void;
}) {
  return (
    <div className="color-settings-tab">
      <h3>Color Settings</h3>
      
      <div className="setting-group">
        <label htmlFor="condition-field">Condition Field:</label>
        <select
          id="condition-field"
          value={conditionField}
          onChange={(e) => onConditionFieldChange(e.target.value)}
        >
          <option value="eks_condition_estimate">EKS Condition Estimate</option>
          <option value="condition_lower">Condition Lower Bound</option>
          <option value="condition_upper">Condition Upper Bound</option>
          <option value="condition_average">Condition Average</option>
        </select>
      </div>

      <div className="setting-actions">
        <button className="btn btn-warning" onClick={onResetToDefault}>
          Reset to Default
        </button>
      </div>
    </div>
  );
}

function ColorSchemePreview({ scheme }: { scheme: ColorScheme }) {
  const preview = generateColorPreview(scheme, 8);
  
  return (
    <div className="color-preview">
      {preview.map((item, index) => (
        <div
          key={index}
          className="color-preview-bar"
          style={{ backgroundColor: item.color }}
          title={`${(item.value * 100).toFixed(0)}%`}
        />
      ))}
    </div>
  );
}

function ColorSchemeEditor({
  scheme,
  isNew,
  onSave,
  onCancel
}: {
  scheme: ColorScheme;
  isNew: boolean;
  onSave: (scheme: ColorScheme) => void;
  onCancel: () => void;
}) {
  const [editedScheme, setEditedScheme] = useState<ColorScheme>(scheme);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const validationErrors = validateColorScheme(editedScheme);
    setErrors(validationErrors);
  }, [editedScheme]);

  const addRange = () => {
    const newRange: ColorRange = {
      min: 0,
      max: 1,
      color: '#000000'
    };
    setEditedScheme(prev => ({
      ...prev,
      ranges: [...prev.ranges, newRange]
    }));
  };

  const updateRange = (index: number, field: keyof ColorRange, value: string | number) => {
    setEditedScheme(prev => ({
      ...prev,
      ranges: prev.ranges.map((range, i) => 
        i === index ? { ...range, [field]: value } : range
      )
    }));
  };

  const removeRange = (index: number) => {
    if (editedScheme.ranges.length > 1) {
      setEditedScheme(prev => ({
        ...prev,
        ranges: prev.ranges.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSave = () => {
    if (errors.length === 0) {
      onSave(editedScheme);
    }
  };

  return (
    <div className="color-scheme-editor-overlay">
      <div className="color-scheme-editor">
        <div className="editor-header">
          <h3>{isNew ? 'Create New Color Scheme' : 'Edit Color Scheme'}</h3>
          <button className="editor-close" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="editor-content">
          <div className="form-group">
            <label htmlFor="scheme-name">Scheme Name:</label>
            <input
              id="scheme-name"
              type="text"
              value={editedScheme.name}
              onChange={(e) => setEditedScheme(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="scheme-type">Type:</label>
            <select
              id="scheme-type"
              value={editedScheme.type}
              onChange={(e) => setEditedScheme(prev => ({ 
                ...prev, 
                type: e.target.value as 'discrete' | 'continuous' 
              }))}
            >
              <option value="continuous">Continuous</option>
              <option value="discrete">Discrete</option>
            </select>
          </div>

          <div className="form-group">
            <label>Color Ranges:</label>
            <div className="ranges-list">
              {editedScheme.ranges.map((range, index) => (
                <div key={index} className="range-item">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={range.min}
                    onChange={(e) => updateRange(index, 'min', parseFloat(e.target.value) || 0)}
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={range.max}
                    onChange={(e) => updateRange(index, 'max', parseFloat(e.target.value) || 1)}
                    placeholder="Max"
                  />
                  <input
                    type="color"
                    value={range.color}
                    onChange={(e) => updateRange(index, 'color', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeRange(index)}
                    disabled={editedScheme.ranges.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={addRange}>
              + Add Range
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="scheme-description">Description (optional):</label>
            <textarea
              id="scheme-description"
              value={editedScheme.description || ''}
              onChange={(e) => setEditedScheme(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {errors.length > 0 && (
            <div className="error-messages">
              {errors.map((error, index) => (
                <div key={index} className="error-message">{error}</div>
              ))}
            </div>
          )}

          <div className="editor-preview">
            <h4>Preview:</h4>
            <ColorSchemePreview scheme={editedScheme} />
          </div>
        </div>

        <div className="editor-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={errors.length > 0}
          >
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
