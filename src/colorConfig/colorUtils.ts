import { ColorScheme, ColorRange } from './types';

/**
 * Get color for a condition value based on the active color scheme
 */
export function getColorForCondition(
  conditionValue: number, 
  scheme: ColorScheme
): string {
  if (scheme.type === 'discrete') {
    // For discrete schemes, find the range that contains the value
    const range = scheme.ranges.find(r => 
      conditionValue >= r.min && conditionValue <= r.max
    );
    return range?.color || '#9e9e9e'; // Default gray if no range found
  } else {
    // For continuous schemes, interpolate between ranges
    return interpolateColor(conditionValue, scheme.ranges);
  }
}

/**
 * Interpolate color between ranges for continuous schemes
 */
function interpolateColor(value: number, ranges: ColorRange[]): string {
  // Sort ranges by min value
  const sortedRanges = [...ranges].sort((a, b) => a.min - b.min);
  
  // Find the two ranges to interpolate between
  for (let i = 0; i < sortedRanges.length - 1; i++) {
    const currentRange = sortedRanges[i];
    const nextRange = sortedRanges[i + 1];
    
    if (value >= currentRange.min && value <= nextRange.max) {
      // Calculate interpolation factor
      const rangeSize = nextRange.max - currentRange.min;
      const position = (value - currentRange.min) / rangeSize;
      
      // Interpolate between the two colors
      return interpolateBetweenColors(currentRange.color, nextRange.color, position);
    }
  }
  
  // If value is outside all ranges, return the closest range color
  if (value <= sortedRanges[0].min) {
    return sortedRanges[0].color;
  }
  if (value >= sortedRanges[sortedRanges.length - 1].max) {
    return sortedRanges[sortedRanges.length - 1].color;
  }
  
  return '#9e9e9e'; // Default gray
}

/**
 * Interpolate between two hex colors
 */
function interpolateBetweenColors(color1: string, color2: string, factor: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1;
  
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Get condition value from state data based on field selection
 */
export function getConditionValue(
  stateData: any, 
  field: 'eks_condition_estimate' | 'condition_lower' | 'condition_upper' | 'condition_average'
): number {
  switch (field) {
    case 'eks_condition_estimate':
      return stateData.eks_condition_estimate || 0.5;
    case 'condition_lower':
      return stateData.condition_lower || 0;
    case 'condition_upper':
      return stateData.condition_upper || 1;
    case 'condition_average':
      const lower = stateData.condition_lower || 0;
      const upper = stateData.condition_upper || 1;
      return (lower + upper) / 2;
    default:
      return 0.5;
  }
}

/**
 * Generate a preview of the color scheme
 */
export function generateColorPreview(scheme: ColorScheme, steps: number = 10): Array<{ value: number; color: string }> {
  const preview: Array<{ value: number; color: string }> = [];
  
  for (let i = 0; i <= steps; i++) {
    const value = i / steps;
    const color = getColorForCondition(value, scheme);
    preview.push({ value, color });
  }
  
  return preview;
}

/**
 * Validate color scheme
 */
export function validateColorScheme(scheme: ColorScheme): string[] {
  const errors: string[] = [];
  
  if (!scheme.name.trim()) {
    errors.push('Scheme name is required');
  }
  
  if (scheme.ranges.length === 0) {
    errors.push('At least one color range is required');
  }
  
  // Check for overlapping ranges
  const sortedRanges = [...scheme.ranges].sort((a, b) => a.min - b.min);
  for (let i = 0; i < sortedRanges.length - 1; i++) {
    if (sortedRanges[i].max > sortedRanges[i + 1].min) {
      errors.push('Color ranges cannot overlap');
      break;
    }
  }
  
  // Check for valid color values
  for (const range of scheme.ranges) {
    if (!isValidColor(range.color)) {
      errors.push(`Invalid color value: ${range.color}`);
    }
    if (range.min < 0 || range.max > 1) {
      errors.push('Range values must be between 0 and 1');
    }
    if (range.min >= range.max) {
      errors.push('Range min must be less than max');
    }
  }
  
  return errors;
}

/**
 * Check if a color string is valid
 */
function isValidColor(color: string): boolean {
  const s = new Option().style;
  s.color = color;
  return s.color !== '';
}
