import { deriveReceiveAddress } from '../src/wallet-core/deriveAddress';
import { walletCoreTestVectors } from '../src/wallet-core/testVectors';

for (const vector of walletCoreTestVectors) {
  const derived = deriveReceiveAddress({
    mnemonic: vector.mnemonic,
    network: vector.network,
    account: vector.account,
    receiveDepth: vector.receiveDepth,
  });

  assertEqual(derived.path, vector.path, `${vector.id}: path mismatch`);
  assertEqual(
    derived.publicKeyHashHex,
    vector.publicKeyHashHex,
    `${vector.id}: public key hash mismatch`
  );
  assertEqual(
    derived.address,
    vector.expectedAddress,
    `${vector.id}: address mismatch`
  );

  console.log(`${vector.id}: ${derived.address}`);
}

function assertEqual(actual: string, expected: string, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}
