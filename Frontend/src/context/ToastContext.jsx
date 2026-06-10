import { createContext, useContext, useState, useCallback, useRef } from "react";
import { FiCheck, FiX, FiInfo, FiAlertTriangle } from "react-icons/fi";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const recentToastsRef = useRef(new Map());

  const addToast = useCallback((message, type = "info", duration = 1000) => {
    if (!message) return;

    const key = `${type}:${message}`;
    const now = Date.now();
    const lastShown = recentToastsRef.current.get(key);

    // Prevent the same toast from repeating too quickly
    if (lastShown && now - lastShown < 1000) {
      return;
    }

    recentToastsRef.current.set(key, now);

    const id = ++toastId;

    setToasts((prev) => {
      const alreadyActive = prev.some(
        (toast) => toast.message === message && toast.type === type
      );

      if (alreadyActive) return prev;

      return [...prev, { id, message, type }];
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const success = useCallback((message) => addToast(message, "success"), [addToast]);
  const error = useCallback((message) => addToast(message, "error"), [addToast]);
  const info = useCallback((message) => addToast(message, "info"), [addToast]);
  const warning = useCallback((message) => addToast(message, "warning"), [addToast]);

  const icons = {
    success: <FiCheck size={18} />,
    error: <FiX size={18} />,
    info: <FiInfo size={18} />,
    warning: <FiAlertTriangle size={18} />,
  };

  const colors = {
    success: "bg-[#141414] border-[#d4af37] text-[#d4af37]",
    error: "bg-[#141414] border-[#ef4444] text-[#ef4444]",
    info: "bg-[#141414] border-[#3b82f6] text-[#3b82f6]",
    warning: "bg-[#141414] border-[#f59e0b] text-[#f59e0b]",
  };

  return (
    <ToastContext.Provider value={{ success, error, info, warning, addToast }}>
      {children}

      <div
        className="toast-container"
        style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-toastIn flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg min-w-[280px] max-w-[400px] ${
              colors[toast.type] || colors.info
            }`}
            style={{
              pointerEvents: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            <span style={{ display: "flex", alignItems: "center" }}>
              {icons[toast.type] || icons.info}
            </span>

            <p
              className="text-sm flex-1"
              style={{ margin: 0, fontWeight: 500 }}
            >
              {toast.message}
            </p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};