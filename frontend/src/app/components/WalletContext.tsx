"use client";
import { createContext, useContext, useState, ReactNode } from 'react';

interface WalletContextType {
  publicKey: string | null;
  setPublicKey: (key: string | null) => void;
  isConnecting: boolean;
  setIsConnecting: (isConnecting: boolean) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  return (
    <WalletContext.Provider value={{ publicKey, setPublicKey, isConnecting, setIsConnecting }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
};
