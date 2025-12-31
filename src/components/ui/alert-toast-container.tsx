import { AnimatePresence } from 'framer-motion';
import { AlertToast } from './alert-toast';
import { useAlertToastContext, ToastPosition } from '@/contexts/AlertToastContext';
import { cn } from '@/lib/utils';

const positionClasses: Record<ToastPosition, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

export function AlertToastContainer() {
  const { toasts, settings, removeToast } = useAlertToastContext();

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2 pointer-events-none',
        positionClasses[settings.position]
      )}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <AlertToast
              variant={toast.variant}
              styleVariant={settings.style_variant}
              title={toast.title}
              description={toast.description}
              onClose={() => removeToast(toast.id)}
              showCloseButton={settings.show_close_button}
              enableAnimations={settings.enable_animations}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
