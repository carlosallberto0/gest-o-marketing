import { useEffect } from 'react';
import { useAlertToast } from '@/hooks/useAlertToast';
import { setAlertToastInstance } from '@/lib/toast';

/**
 * Component that connects the AlertToast system to the global showToast utility.
 * This allows non-React code (hooks, utils) to use the configurable AlertToast system.
 */
export function AlertToastConnector() {
  const alertToast = useAlertToast();

  useEffect(() => {
    setAlertToastInstance({
      success: alertToast.success,
      error: alertToast.error,
      warning: alertToast.warning,
      info: alertToast.info,
    });

    return () => {
      setAlertToastInstance(null);
    };
  }, [alertToast]);

  return null;
}
