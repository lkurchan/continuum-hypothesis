export const ARBITRUM_CHAIN_ID = 42161;
export const ARGT_ADDRESS = "0x59863989d080B22476DB95656d0C3CC18be92214" as const;
export const ARGT_DECIMALS = 18;

export function explorerTxUrl(hash: string): string {
  return `https://arbiscan.io/tx/${hash}`;
}
