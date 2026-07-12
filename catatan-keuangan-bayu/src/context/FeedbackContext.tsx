import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import AppIcon, { type IconName } from "../components/AppIcon";
import { consumeStorageIssues } from "../utils/storageHealth";

export type ToastType = "success" | "error" | "warning" | "info";

export type ConfirmationOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  icon?: IconName;
};

type ConfirmationState = ConfirmationOptions & {
  onConfirm: () => void | Promise<void>;
};

type FeedbackContextValue = {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
  openConfirmationModal: (options: ConfirmationOptions, onConfirm: () => void | Promise<void>) => void;
  closeConfirmationModal: () => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toastIcons: Record<ToastType, IconName> = {
  success: "check",
  error: "warning",
  warning: "warning",
  info: "info"
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const toastTimer = useRef<number | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const hideToast = useCallback(() => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    setToast({ message, type });
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const openConfirmationModal = useCallback((
    options: ConfirmationOptions,
    onConfirm: () => void | Promise<void>
  ) => {
    setConfirmation({ ...options, onConfirm });
  }, []);

  const closeConfirmationModal = useCallback(() => {
    if (!isConfirming) {
      setConfirmation(null);
    }
  }, [isConfirming]);

  const handleConfirmationAction = useCallback(async () => {
    if (!confirmation || isConfirming) {
      return;
    }

    setIsConfirming(true);
    try {
      await confirmation.onConfirm();
      setConfirmation(null);
    } catch {
      showToast("Aksi belum berhasil. Silakan coba lagi.", "error");
    } finally {
      setIsConfirming(false);
    }
  }, [confirmation, isConfirming, showToast]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    function updateConnectionIndicator() {
      setIsOffline(!navigator.onLine);
    }

    function handleOnlineStatus() {
      updateConnectionIndicator();
      showToast(
        navigator.onLine ? "Koneksi kembali tersedia." : "Kamu sedang offline. Data tetap tersimpan di perangkat.",
        navigator.onLine ? "success" : "warning"
      );
    }

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, [showToast]);

  useEffect(() => {
    const issues = consumeStorageIssues();
    if (issues.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      showToast(`Data ${issues.join(", ")} tidak dapat dibaca. Aplikasi memakai data aman tanpa menghapus data lama.`, "warning");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [showToast]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || sessionStorage.getItem("uangKuNiOfflineReady")) {
      return;
    }

    navigator.serviceWorker.ready.then(() => {
      sessionStorage.setItem("uangKuNiOfflineReady", "true");
      showToast("Aplikasi siap digunakan secara offline.", "info");
    }).catch(() => undefined);
  }, [showToast]);

  useEffect(() => {
    if (!confirmation) {
      return;
    }

    confirmButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeConfirmationModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmation, closeConfirmationModal]);

  return (
    <FeedbackContext.Provider value={{ showToast, hideToast, openConfirmationModal, closeConfirmationModal }}>
      {children}

      {isOffline && (
        <div className="connection-indicator" role="status">
          <span aria-hidden="true" /> Offline
        </div>
      )}

      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className={`app-toast ${toast.type}`} role="status">
            <span className="toast-icon" aria-hidden="true">
              <AppIcon name={toastIcons[toast.type]} size={17} />
            </span>
            <p>{toast.message}</p>
            <button type="button" aria-label="Tutup notifikasi" onClick={hideToast}>×</button>
          </div>
        )}
      </div>

      {confirmation && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeConfirmationModal();
            }
          }}
        >
          <section
            aria-describedby="confirmation-description"
            aria-labelledby="confirmation-title"
            aria-modal="true"
            className="confirmation-modal"
            role="dialog"
          >
            <span className={`confirmation-icon ${confirmation.tone === "danger" ? "danger" : ""}`} aria-hidden="true">
              <AppIcon name={confirmation.icon ?? (confirmation.tone === "danger" ? "warning" : "info")} size={22} />
            </span>
            <h2 id="confirmation-title">{confirmation.title}</h2>
            <p id="confirmation-description">{confirmation.message}</p>
            <div className="confirmation-actions">
              <button type="button" disabled={isConfirming} onClick={closeConfirmationModal}>
                {confirmation.cancelLabel ?? "Batal"}
              </button>
              <button
                ref={confirmButtonRef}
                className={confirmation.tone === "danger" ? "danger" : "primary"}
                type="button"
                disabled={isConfirming}
                onClick={handleConfirmationAction}
              >
                {isConfirming ? "Memproses..." : confirmation.confirmLabel ?? "Konfirmasi"}
              </button>
            </div>
          </section>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback harus digunakan di dalam FeedbackProvider.");
  }
  return context;
}
