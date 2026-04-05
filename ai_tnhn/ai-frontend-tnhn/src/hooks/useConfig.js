// project imports
import useConfigStore from 'store/useConfigStore';

// ==============================|| CONFIG - HOOKS ||============================== //

export default function useConfig() {
  const config = useConfigStore();

  return {
    state: config,
    setField: config.setField,
    resetState: config.resetConfig
  };
}
