// Color configuration types
export interface ColorRange {
  min: number;
  max: number;
  color: string;
}

export interface ColorScheme {
  id: string;
  name: string;
  type: 'discrete' | 'continuous';
  ranges: ColorRange[];
  description?: string;
}

export interface ColorConfig {
  activeSchemeId: string;
  schemes: ColorScheme[];
  conditionField: 'eks_condition_estimate' | 'condition_lower' | 'condition_upper' | 'condition_average';
}

// Default color schemes
export const DEFAULT_COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'default-green',
    name: 'Default Green Scale',
    type: 'continuous',
    ranges: [
      { min: 0, max: 0.2, color: '#d32f2f' }, // Red
      { min: 0.2, max: 0.4, color: '#ff9800' }, // Orange
      { min: 0.4, max: 0.6, color: '#ffeb3b' }, // Yellow
      { min: 0.6, max: 0.8, color: '#8bc34a' }, // Light Green
      { min: 0.8, max: 1.0, color: '#4caf50' }, // Green
    ],
    description: 'Traditional ecosystem condition scale from red (poor) to green (excellent)'
  },
  {
    id: 'blue-scale',
    name: 'Blue Scale',
    type: 'continuous',
    ranges: [
      { min: 0, max: 0.2, color: '#e3f2fd' }, // Very Light Blue
      { min: 0.2, max: 0.4, color: '#bbdefb' }, // Light Blue
      { min: 0.4, max: 0.6, color: '#90caf9' }, // Medium Blue
      { min: 0.6, max: 0.8, color: '#64b5f6' }, // Darker Blue
      { min: 0.8, max: 1.0, color: '#2196f3' }, // Blue
    ],
    description: 'Blue gradient scale for condition values'
  },
  {
    id: 'discrete-5',
    name: '5-Level Discrete',
    type: 'discrete',
    ranges: [
      { min: 0, max: 0.2, color: '#f44336' }, // Red
      { min: 0.2, max: 0.4, color: '#ff9800' }, // Orange
      { min: 0.4, max: 0.6, color: '#ffeb3b' }, // Yellow
      { min: 0.6, max: 0.8, color: '#4caf50' }, // Green
      { min: 0.8, max: 1.0, color: '#2e7d32' }, // Dark Green
    ],
    description: 'Five discrete condition levels'
  }
];

export const DEFAULT_COLOR_CONFIG: ColorConfig = {
  activeSchemeId: 'default-green',
  schemes: DEFAULT_COLOR_SCHEMES,
  conditionField: 'eks_condition_estimate'
};
