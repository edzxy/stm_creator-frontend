# State Editor Features

## Overview
This document describes the enhanced state editing functionality that has been implemented for the State Transition Model Creator.

## New Features

### 1. State Details Sidebar
- **Location**: Right side of the screen
- **Trigger**: Click on any state node
- **Purpose**: Edit state details without cluttering the main diagram view

### 2. Enhanced State Fields
The sidebar displays and allows editing of the following state attributes:

#### Required Fields
- **State Name** (text input)
- **Condition Lower Bound** (number input, 0-1 range)
- **Condition Upper Bound** (number input, 0-1 range)  
- **EKS Condition Estimate** (number input, 0-1 range)

#### Optional Fields
- **State Number** (text input)
- **VAST Class** (dropdown: Class I through Class VI)

### 3. Validation Features
- **Range Validation**: All probability values (condition bounds and EKS estimate) must be between 0 and 1
- **Logical Validation**: Lower bound must be less than or equal to upper bound
- **Required Field Validation**: State name is mandatory
- **Real-time Validation**: Errors are shown immediately as user types

### 4. User Experience Improvements
- **Sidebar Animation**: Smooth slide-in animation from the right
- **Responsive Design**: Adapts to different screen sizes
- **Clear Error Messages**: Specific validation messages for each field
- **Intuitive Controls**: Number inputs with proper min/max/step attributes

## Technical Implementation

### Components
- `StateDetailsSidebar.tsx`: Main sidebar component
- `StateDetailsSidebar.css`: Styling for the sidebar
- Updated `App.tsx`: Integration with main application
- Updated `nodeModal.tsx`: Enhanced with new fields
- Updated `stateTransitionUtils.tsx`: Data conversion utilities

### Data Flow
1. User clicks on a state node
2. `handleNodeClick` extracts current state data
3. Sidebar opens with pre-populated values
4. User edits fields with real-time validation
5. On save, `handleSaveStateDetails` updates both UI and data store
6. Changes are immediately reflected in the diagram

### Validation Logic
```typescript
// Range validation for probability values
if (numValue < 0 || numValue > 1) {
    return 'Must be between 0 and 1';
}

// Logical validation for bounds
if (details.conditionLower > details.conditionUpper) {
    newErrors.conditionLower = 'Lower bound must be less than or equal to upper bound';
}
```

## Usage Instructions

1. **Opening the Editor**: Click on any state node in the diagram
2. **Editing Fields**: Modify any of the displayed fields
3. **Validation**: Watch for real-time validation feedback
4. **Saving**: Click "Update State" to save changes
5. **Canceling**: Click "Cancel" or the X button to close without saving

## Future Enhancements

- Bulk editing capabilities
- Undo/redo functionality
- Field-level change tracking
- Export/import of state configurations
- Advanced validation rules based on VAST class

## Dependencies

- React 18+
- TypeScript
- CSS3 for animations and responsive design
- Existing state management infrastructure
