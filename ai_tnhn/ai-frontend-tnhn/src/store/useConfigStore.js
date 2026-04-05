import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// project imports
import config from 'config';

// ==============================|| CONFIG STORE ||============================== //

const useConfigStore = create(
  persist(
    (set) => ({
      ...config,
      // Actions
      onChangeFontFamily: (fontFamily) => set({ fontFamily }),
      onChangeBorderRadius: (borderRadius) => set({ borderRadius }),
      setField: (field, value) => set({ [field]: value }),
      resetConfig: () => set(config)
    }),
    {
      name: 'berry-config-vite-js' // same key as useLocalStorage for backward compatibility
    }
  )
);

export default useConfigStore;
