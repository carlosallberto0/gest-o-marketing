import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type ActiveModule = 'media' | 'merchandising' | null;

interface ModuleContextType {
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
  clearActiveModule: () => void;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [activeModule, setActiveModuleState] = useState<ActiveModule>(() => {
    const saved = localStorage.getItem('activeModule');
    return (saved as ActiveModule) || null;
  });

  const setActiveModule = (module: ActiveModule) => {
    setActiveModuleState(module);
    if (module) {
      localStorage.setItem('activeModule', module);
    } else {
      localStorage.removeItem('activeModule');
    }
  };

  const clearActiveModule = () => {
    setActiveModuleState(null);
    localStorage.removeItem('activeModule');
  };

  return (
    <ModuleContext.Provider value={{ activeModule, setActiveModule, clearActiveModule }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const context = useContext(ModuleContext);
  if (context === undefined) {
    throw new Error('useModule must be used within a ModuleProvider');
  }
  return context;
}
