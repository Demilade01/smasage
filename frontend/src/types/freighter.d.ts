/**
 * Type definitions for the Freighter browser wallet extension.
 * Extends the global Window interface so freighterApi can be accessed
 * without casting to `any`.
 *
 * Reference: https://docs.freighter.app/docs/ref/freighter-api
 */

export interface FreighterApi {
  /** Returns the user's public key if the wallet is connected and unlocked. */
  getPublicKey(): Promise<string>;

  /** Returns true when Freighter is installed and the user has granted access. */
  isConnected(): Promise<boolean>;

  /**
   * Signs an XDR-encoded transaction and returns the signed XDR string.
   * @param xdr     - Base64-encoded transaction XDR.
   * @param network - Stellar network passphrase (e.g. "Test SDF Network ; September 2015").
   */
  signTransaction(xdr: string, network?: string): Promise<string>;

  /**
   * Signs an arbitrary message and returns a base64-encoded signature.
   * @param message - UTF-8 message to sign.
   */
  signMessage?(message: string): Promise<string>;

  /** Returns the network the wallet is currently set to. */
  getNetwork?(): Promise<string>;

  /** Returns the network passphrase for the current network. */
  getNetworkDetails?(): Promise<{ network: string; networkPassphrase: string }>;
}

declare global {
  interface Window {
    freighterApi?: FreighterApi;
  }
}
