import { createContext, useContext, useState, useEffect } from "react";

interface E2EEContextValue {
  /** Whether the DEK is unlocked and available in memory */
  isDekUnlocked: boolean;
  /** The DEK (only available when unlocked) */
  dek: Uint8Array | null;
  /** Unlock the DEK by storing it in memory */
  unlock: (dek: Uint8Array) => void;
  /** Lock (wipe) the DEK from memory */
  lock: () => void;
}

const E2EEContext = createContext<E2EEContextValue | null>(null);

export function E2EEProvider(props: React.PropsWithChildren) {
  const [dek, setDek] = useState<Uint8Array | null>(null);

  // Wipe DEK on tab close or page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      setDek(null);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Wipe DEK on unmount
      setDek(null);
    };
  }, []);

  const unlock = (dekBytes: Uint8Array) => {
    if (dekBytes.byteLength !== 32) {
      throw new Error("dek must be 32 bytes");
    }
    setDek(dekBytes);
  };

  const lock = () => {
    setDek(null);
    // Clear cached KEK from sessionStorage
    sessionStorage.removeItem("e2ee_kek");
  };

  const value: E2EEContextValue = {
    isDekUnlocked: dek !== null,
    dek,
    unlock,
    lock,
  };

  return (
    <E2EEContext.Provider value={value}>{props.children}</E2EEContext.Provider>
  );
}

export function useE2EE() {
  const context = useContext(E2EEContext);

  if (!context) {
    throw new Error("useE2EE must be used within E2EEProvider");
  }

  return context;
}
