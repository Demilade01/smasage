import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ConnectWalletButtonProps {
  onClick: () => void;
  publicKey?: string;
  isConnecting?: boolean;
}

function truncatePublicKey(key: string) {
  if (!key) return '';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

export const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({ 
  onClick, 
  publicKey, 
  isConnecting = false 
}) => {
  const ariaLabel = isConnecting
    ? 'Connecting wallet, please wait'
    : publicKey
    ? `Wallet connected: ${truncatePublicKey(publicKey)}`
    : 'Connect Stellar wallet';

  return (
    <button 
      onClick={onClick} 
      className={`connect-wallet-btn ${isConnecting ? 'connecting' : ''}`}
      disabled={isConnecting}
      aria-label={ariaLabel}
      aria-busy={isConnecting}
    >
      {isConnecting ? (
        <>
          <Loader2 className="spinner" size={16} aria-hidden="true" />
          <span>Connecting...</span>
        </>
      ) : (
        publicKey ? truncatePublicKey(publicKey) : 'Connect Wallet'
      )}
    </button>
  );
};

