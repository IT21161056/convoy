import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Toast, type ToastVariant } from "./Toast";

interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  /** Duration in ms. Pass 0 to require manual dismissal (not implemented yet). */
  duration?: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<{
    message: string;
    variant: ToastVariant;
  } | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((options: ToastOptions) => {
    const { message, variant = "default", duration = 2200 } = options;

    if (timerRef.current) clearTimeout(timerRef.current);

    setCurrent({ message, variant });
    setVisible(true);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      // Clear the content after the fade-out completes so the pill doesn't
      // flash a stale message if another toast arrives immediately.
      timerRef.current = setTimeout(() => {
        setCurrent(null);
        timerRef.current = null;
      }, 200);
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Toast
        message={current?.message ?? ""}
        variant={current?.variant ?? "default"}
        visible={visible && current !== null}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
