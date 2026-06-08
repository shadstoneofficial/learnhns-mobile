import type { HandshakeNetwork } from './deriveAddress';

export type WalletCoreTestVector = {
  id: string;
  source: string;
  safety: string;
  mnemonic: string;
  network: HandshakeNetwork;
  account: number;
  receiveDepth: number;
  path: string;
  publicKeyHashHex: string;
  expectedAddress: string;
};

export const walletCoreTestVectors: WalletCoreTestVector[] = [
  {
    id: 'bip39-abandon-mainnet-receive-0',
    source: 'Generated with hsd from Bob Wallet node_modules on 2026-06-08.',
    safety:
      'Public BIP39 test mnemonic. Never fund this wallet and never treat it as secret.',
    mnemonic:
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    network: 'main',
    account: 0,
    receiveDepth: 0,
    path: "m/44'/5353'/0'/0/0",
    publicKeyHashHex: 'a55efe19c11c5da2370a7430fbb4b24805e982d6',
    expectedAddress: 'hs1q5400uxwpr3w6ydc2wsc0hd9jfqz7nqkkgzfvmd',
  },
  {
    id: 'bip39-abandon-testnet-receive-0',
    source: 'Generated with hsd from Bob Wallet node_modules on 2026-06-08.',
    safety:
      'Public BIP39 test mnemonic. Never fund this wallet and never treat it as secret.',
    mnemonic:
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    network: 'testnet',
    account: 0,
    receiveDepth: 0,
    path: "m/44'/5354'/0'/0/0",
    publicKeyHashHex: '41da4d5bd8013496727418af21a412a23a027336',
    expectedAddress: 'ts1qg8dy6k7cqy6fvun5rzhjrfqj5gaqyuekpcgadk',
  },
  {
    id: 'bip39-abandon-regtest-receive-0',
    source: 'Generated with hsd from Bob Wallet node_modules on 2026-06-08.',
    safety:
      'Public BIP39 test mnemonic. Never fund this wallet and never treat it as secret.',
    mnemonic:
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    network: 'regtest',
    account: 0,
    receiveDepth: 0,
    path: "m/44'/5355'/0'/0/0",
    publicKeyHashHex: 'a8d9028425a9740eb82a11001146057a649b474a',
    expectedAddress: 'rs1q4rvs9pp9496qawp2zyqpz3s90fjfk362q92vq8',
  },
];
