
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type ToastType = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type NotificationContextType = {
  showToast: (type: ToastType, message: string) => void;
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
};

const NotificationContext =
  createContext<NotificationContextType | null>(null);

const toastStyles: Record<ToastType, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

const toastIcons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const toastId = useRef(0);
  const confirmResolver = useRef<((value: boolean) => void) | null>(
    null
  );

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = ++toastId.current;

      setToasts((current) => [
        ...current,
        { id, type, message },
      ]);

      window.setTimeout(() => {
        setToasts((current) =>
          current.filter((toast) => toast.id !== id)
        );
      }, 3500);
    },
    []
  );

  const confirmAction = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      if (confirmResolver.current) {
        confirmResolver.current(false);
      }

      return new Promise((resolve) => {
        confirmResolver.current = resolve;
        setConfirm({ options, resolve });
      });
    },
    []
  );

  const closeConfirm = useCallback((result: boolean) => {
    confirmResolver.current?.(result);
    confirmResolver.current = null;
    setConfirm(null);
  }, []);

  useEffect(() => {
    if (!confirm) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeConfirm(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirm, closeConfirm]);

  return (
    <NotificationContext.Provider
      value={{ showToast, confirmAction }}
    >
      {children}

      {/* Toast notifications */}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg ${toastStyles[toast.type]}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current font-bold">
              {toastIcons[toast.type]}
            </span>

            <p className="flex-1 text-sm font-medium">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() =>
                setToasts((current) =>
                  current.filter((item) => item.id !== toast.id)
                )
              }
              aria-label="Tutup notifikasi"
              className="text-lg leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation dialog */}
      {confirm && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeConfirm(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2
              id="confirm-title"
              className="text-lg font-bold text-gray-900"
            >
              {confirm.options.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {confirm.options.message}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {confirm.options.cancelText || "Batal"}
              </button>

              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${
                  confirm.options.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {confirm.options.confirmText || "Ya, Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotification harus digunakan di dalam NotificationProvider."
    );
  }

  return context;
}
