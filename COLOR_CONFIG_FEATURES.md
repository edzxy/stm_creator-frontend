# Color Configuration Features

## Overview
This feature allows users to configure how condition scores map to colors for state nodes in the State Transition Model (STM) diagram. The colors reflect ecosystem quality consistently across workshops.

## Features Implemented

### 1. Color Configuration System
- **Context-based state management** for color schemes
- **LocalStorage persistence** for user-defined color schemes
- **Default color schemes** with predefined mappings
- **Custom color scheme creation** and editing

### 2. Color Mapping Options
- **Condition field selection**: Choose which condition value to use for coloring
  - EKS Condition Estimate (default)
  - Condition Lower Bound
  - Condition Upper Bound
  - Condition Average (calculated from lower and upper bounds)

### 3. Color Scheme Types
- **Continuous schemes**: Smooth color interpolation between ranges
- **Discrete schemes**: Distinct color bins for condition ranges

### 4. Default Color Schemes
1. **Default Green Scale**: Traditional ecosystem condition scale (red to green)
2. **Blue Scale**: Blue gradient scale for condition values
3. **5-Level Discrete**: Five distinct condition levels

### 5. User Interface
- **Color Configuration Modal**: Accessible via "🎨 Color Config" button
- **Scheme Management**: View, create, edit, and delete color schemes
- **Live Preview**: See color scheme previews before applying
- **Settings Tab**: Configure condition field and reset options

### 6. Real-time Updates
- **Immediate color updates**: Node colors change instantly when scheme is modified
- **Preserved VAST class styling**: Node titles and borders maintain VAST class colors
- **Background color changes**: Only the white background area changes color

## Usage

### Accessing Color Configuration
1. Click the "🎨 Color Config" button in the toolbar
2. The Color Configuration modal will open

### Creating a New Color Scheme
1. In the Color Schemes tab, click "Create New Scheme"
2. Enter a name and description
3. Choose between Continuous or Discrete type
4. Add color ranges with min/max values and colors
5. Preview the scheme in real-time
6. Click "Create" to save

### Editing Existing Schemes
1. Click "Edit" on any existing scheme
2. Modify the scheme properties
3. Add or remove color ranges
4. Click "Save" to apply changes

### Changing Condition Field
1. Go to the Settings tab
2. Select the desired condition field from the dropdown
3. Changes apply immediately to all nodes

### Resetting to Default
1. In the Settings tab, click "Reset to Default"
2. This restores the original color configuration

## Technical Implementation

### File Structure
```
src/colorConfig/
├── types.ts                 # Type definitions
├── ColorConfigContext.tsx   # React context and provider
├── colorUtils.ts           # Color mapping utilities
├── ColorConfigModal.tsx    # Main UI component
├── ColorConfigModal.css    # Styling
└── index.ts               # Exports
```

### Key Components
- **ColorConfigProvider**: Manages color configuration state
- **ColorConfigModal**: Main UI for configuration
- **colorUtils**: Functions for color interpolation and validation
- **CustomNode**: Updated to use dynamic colors

### Data Flow
1. User opens color configuration modal
2. User selects/creates color scheme
3. Configuration saved to localStorage
4. Context updates trigger node re-renders
5. Nodes display new colors based on condition values

## Color Mapping Logic

### Continuous Schemes
- Linear interpolation between adjacent color ranges
- Smooth color transitions based on condition values
- Handles values outside defined ranges gracefully

### Discrete Schemes
- Exact color matching for condition value ranges
- No interpolation between ranges
- Clear visual distinction between condition levels

## Browser Compatibility
- Uses modern CSS features (CSS Grid, Flexbox)
- localStorage for persistence
- ES6+ JavaScript features
- Compatible with all modern browsers

## Future Enhancements
- Import/export color schemes
- Color scheme sharing between users
- Advanced color interpolation algorithms
- Accessibility improvements (colorblind-friendly palettes)
- Integration with backend for scheme storage
