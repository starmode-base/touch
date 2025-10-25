import { createContext, useContext, useState, useEffect } from "react";

interface E2EEContext {
  /** Whether the DEK is unlocked and available in memory */
  isDekUnlocked: boolean;
  /** The DEK (only available when unlocked) */
  dek: Uint8Array | null;
  /** Store the DEK in memory */
  setDek: (dek: Uint8Array) => void;
  /** Wipe the DEK from memory */
  unsetDek: () => void;
}

const E2EEContext = createContext<E2EEContext | null>(null);

export function E2EEProvider(props: React.PropsWithChildren) {
  const [dek, setDekState] = useState<Uint8Array | null>(null);

  // Wipe DEK on tab close or page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      setDekState(null);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Wipe DEK on unmount
      setDekState(null);
    };
  }, []);

  /**
   * Store the DEK in memory
   */
  const setDek = (dekBytes: Uint8Array) => {
    if (dekBytes.byteLength !== 32) {
      throw new Error("dek must be 32 bytes");
    }
    setDekState(dekBytes);
  };

  /**
   * Wipe the DEK from memory
   */
  const unsetDek = () => {
    setDekState(null);
  };

  const value: E2EEContext = {
    isDekUnlocked: dek !== null,
    dek,
    setDek,
    unsetDek,
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
