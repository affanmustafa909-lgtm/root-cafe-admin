import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export type ToastOptions = {
  duration?: number;
  onClick?: () => void;
};

type ToastApi = {
  toast: (
    message: string,
    type?: ToastType,
    options?: ToastOptions,
  ) => void;
};

export const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}
