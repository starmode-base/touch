import { createContext, useContext, useState, useEffect } from "react";
import { setGlobalDek, clearGlobalDek, type CryptoBytes } from "~/lib/e2ee";

interface E2eeContext {
  /** Whether the DEK is unlocked and available in memory */
  isDekUnlocked: boolean;
  /** The DEK (only available when unlocked) */
  dek: CryptoBytes | null;
  /** Store the DEK in memory */
  setDek: (dek: CryptoBytes) => void;
  /** Wipe the DEK from memory */
  unsetDek: () => void;
}

const E2eeContext = createContext<E2eeContext | null>(null);

export function E2eeProvider(props: React.PropsWithChildren) {
  const [dek, setDekState] = useState<CryptoBytes | null>(null);

  // Wipe DEK on tab close or page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      setDekState(null);
      clearGlobalDek();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Wipe DEK on unmount - just in case beforeunload fires after unmount
      handleBeforeUnload();
    };
  }, []);

  /**
   * Store the DEK in memory (both React state and global module)
   */
  const setDek = (dekBytes: CryptoBytes) => {
    if (dekBytes.byteLength !== 32) {
      throw new Error("dek must be 32 bytes");
    }
    setDekState(dekBytes);
    setGlobalDek(dekBytes);
  };

  /**
   * Wipe the DEK from memory (both React state and global module)
   */
  const unsetDek = () => {
    setDekState(null);
    clearGlobalDek();
  };

  const value: E2eeContext = {
    isDekUnlocked: dek !== null,
    dek,
    setDek,
    unsetDek,
  };

  return (
    <E2eeContext.Provider value={value}>{props.children}</E2eeContext.Provider>
  );
}

export function useE2ee() {
  const context = useContext(E2eeContext);

  if (!context) {
    throw new Error("useE2ee must be used within E2eeProvider");
  }

  return context;
}
