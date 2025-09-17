import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ColorConfig, ColorScheme, DEFAULT_COLOR_CONFIG } from './types';

interface ColorConfigContextType {
  colorConfig: ColorConfig;
  updateActiveScheme: (schemeId: string) => void;
  updateConditionField: (field: ColorConfig['conditionField']) => void;
  addScheme: (scheme: ColorScheme) => void;
  updateScheme: (schemeId: string, scheme: ColorScheme) => void;
  deleteScheme: (schemeId: string) => void;
  getActiveScheme: () => ColorScheme | undefined;
  resetToDefault: () => void;
}

const ColorConfigContext = createContext<ColorConfigContextType | undefined>(undefined);

const STORAGE_KEY = 'stm-color-config';

export function ColorConfigProvider({ children }: { children: ReactNode }) {
  const [colorConfig, setColorConfig] = useState<ColorConfig>(DEFAULT_COLOR_CONFIG);

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setColorConfig(parsed);
      }
    } catch (error) {
      console.warn('Failed to load color configuration from localStorage:', error);
    }
  }, []);

  // Save configuration to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colorConfig));
    } catch (error) {
      console.warn('Failed to save color configuration to localStorage:', error);
    }
  }, [colorConfig]);

  const updateActiveScheme = (schemeId: string) => {
    setColorConfig(prev => ({
      ...prev,
      activeSchemeId: schemeId
    }));
  };

  const updateConditionField = (field: ColorConfig['conditionField']) => {
    setColorConfig(prev => ({
      ...prev,
      conditionField: field
    }));
  };

  const addScheme = (scheme: ColorScheme) => {
    setColorConfig(prev => ({
      ...prev,
      schemes: [...prev.schemes, scheme]
    }));
  };

  const updateScheme = (schemeId: string, updatedScheme: ColorScheme) => {
    setColorConfig(prev => ({
      ...prev,
      schemes: prev.schemes.map(scheme => 
        scheme.id === schemeId ? updatedScheme : scheme
      )
    }));
  };

  const deleteScheme = (schemeId: string) => {
    setColorConfig(prev => {
      const newSchemes = prev.schemes.filter(scheme => scheme.id !== schemeId);
      const newActiveSchemeId = prev.activeSchemeId === schemeId 
        ? (newSchemes[0]?.id || DEFAULT_COLOR_CONFIG.activeSchemeId)
        : prev.activeSchemeId;
      
      return {
        ...prev,
        schemes: newSchemes,
        activeSchemeId: newActiveSchemeId
      };
    });
  };

  const getActiveScheme = () => {
    return colorConfig.schemes.find(scheme => scheme.id === colorConfig.activeSchemeId);
  };

  const resetToDefault = () => {
    setColorConfig(DEFAULT_COLOR_CONFIG);
  };

  const value: ColorConfigContextType = {
    colorConfig,
    updateActiveScheme,
    updateConditionField,
    addScheme,
    updateScheme,
    deleteScheme,
    getActiveScheme,
    resetToDefault
  };

  return (
    <ColorConfigContext.Provider value={value}>
      {children}
    </ColorConfigContext.Provider>
  );
}

export function useColorConfig() {
  const context = useContext(ColorConfigContext);
  if (context === undefined) {
    throw new Error('useColorConfig must be used within a ColorConfigProvider');
  }
  return context;
}
