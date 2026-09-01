import { createContext, useContext } from 'react';

type ToastApi = {
  toast: (message: string, type?: 'success' | 'error') => void;
};

export const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}
