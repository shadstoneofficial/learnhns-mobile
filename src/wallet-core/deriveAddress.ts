import { blake2b } from '@noble/hashes/blake2.js';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { bech32 } from 'bech32';

export type HandshakeNetwork = 'main' | 'testnet' | 'regtest';

type NetworkParams = {
  addressPrefix: string;
  coinType: number;
};

const NETWORKS: Record<HandshakeNetwork, NetworkParams> = {
  main: {
    addressPrefix: 'hs',
    coinType: 5353,
  },
  testnet: {
    addressPrefix: 'ts',
    coinType: 5354,
  },
  regtest: {
    addressPrefix: 'rs',
    coinType: 5355,
  },
};

export type DeriveReceiveAddressOptions = {
  mnemonic: string;
  network?: HandshakeNetwork;
  account?: number;
  receiveDepth?: number;
};

export type DerivedReceiveAddress = {
  address: string;
  path: string;
  publicKeyHashHex: string;
};

export function deriveReceiveAddress(
  options: DeriveReceiveAddressOptions
): DerivedReceiveAddress {
  const networkName = options.network ?? 'main';
  const network = NETWORKS[networkName];
  const account = options.account ?? 0;
  const receiveDepth = options.receiveDepth ?? 0;
  const mnemonic = options.mnemonic.trim().replace(/\s+/g, ' ');

  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new Error('Invalid BIP39 mnemonic.');
  }

  assertDerivationIndex('account', account);
  assertDerivationIndex('receiveDepth', receiveDepth);

  const path = `m/44'/${network.coinType}'/${account}'/0/${receiveDepth}`;
  const root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic));
  const child = root.derive(path);

  if (!child.publicKey) {
    throw new Error('Unable to derive public key.');
  }

  const publicKeyHash = blake2b(child.publicKey, { dkLen: 20 });
  const words = [0, ...bech32.toWords(publicKeyHash)];

  return {
    address: bech32.encode(network.addressPrefix, words),
    path,
    publicKeyHashHex: bytesToHex(publicKeyHash),
  };
}

function assertDerivationIndex(label: string, value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
