import { useState, useCallback, useEffect } from "react";
import { useWallet } from "../app/components/WalletContext";

/**
 * Custom hook to manage Freighter wallet interactions.
 * Encapsulates connection logic, installation checks, and state management.
 */
export function useFreighter() {
  const { publicKey, setPublicKey, isConnecting, setIsConnecting } =
    useWallet();
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Check for Freighter on mount and with polling
  useEffect(() => {
    // Initial check
    if (window.freighterApi) {
      setIsInstalled(true);
      return;
    }

    // Polling for 3 seconds as extensions might inject late
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.freighterApi) {
        setIsInstalled(true);
        clearInterval(interval);
      } else if (attempts >= 20) {
        // 6 * 500ms = 3s
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  /**
   * Triggers the Freighter connection flow.
   * If not installed, shows the installation modal.
   */
  const connect = useCallback(async () => {
    // Lazy check in case it was injected after the last effect run
    const api = window.freighterApi;

    if (!api) {
      setShowInstallModal(true);
      return null;
    }

    // Update isInstalled state if we found it lazily
    setIsInstalled(true);

    setIsConnecting(true);
    try {
      const key = await api.getPublicKey();
      setPublicKey(key);
      return key;
    } catch (error) {
      console.error("[useFreighter] Connection failed:", error);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [setPublicKey, setIsConnecting]);

  /**
   * Disconnects the wallet by clearing the public key from global context.
   */
  const disconnect = useCallback(() => {
    setPublicKey(null);
  }, [setPublicKey]);

  return {
    publicKey,
    isConnected: !!publicKey,
    isConnecting,
    isInstalled,
    showInstallModal,
    setShowInstallModal,
    connect,
    disconnect,
  };
}
