# Wallet Core Feasibility Notes

Date: 2026-06-08
Status: M1 research notes

## Compatibility Target

LearnHNS Mobile v1 should try to be compatible with Bob/hsd wallet recovery.

The important local references are:

- Bob wallet creation: `/Users/michaelmichelini/Documents/GitHub/bob-wallet/app/background/wallet/service.js`
- Shake wallet creation: `/Users/michaelmichelini/Documents/GitHub/shake-wallet/src/background/services/wallet/index.ts`

## What Bob Does

Bob creates new hot wallets through HSD `WalletDB`.

Relevant behavior:

- New seed uses `new Mnemonic({ bits: 256 })`.
- Wallet creation calls `this.node.wdb.create(...)`.
- Imported seeds eventually call Bob's import path and HSD wallet creation/import behavior.
- Normal receive address comes from the selected wallet's default account.
- Receive derivation is HSD account receive derivation, not a custom Bob-only path.

The mobile compatibility target should be:

```txt
wallet seed -> HSD/Bob default account -> receive branch -> receive depth 0+
```

Do not guess an address path in UI code. Prove it against Bob/hsd.

## What Shake Does

Shake Wallet is closer to a lightweight/mobile-shaped wallet, but it still relies heavily on HSD internals.

Relevant behavior:

- New mnemonic uses `new Mnemonic({ bits: 256 })`.
- Wallet creation calls `this.wdb.create(options)`.
- Receive address uses:

```ts
account
  .deriveReceive(depth)
  .getAddress()
  .toString(this.network)
```

This is useful because it confirms the extension path is also HSD default-account receive derivation.

## Likely Mobile Friction

The current Bob/Shake runtime is not a clean mobile drop-in.

Known risk areas:

- `hsd` assumes a Node-style runtime in many places.
- `WalletDB` and local DB behavior may not fit React Native directly.
- `bcrypto` may need mobile-compatible builds or replacements.
- Ledger/HID/WebUSB code is out of v1.
- Full wallet rescanning/indexing should not be copied into the first mobile app.

## M1 Test Vector Plan

The first real wallet-core task is to create a deterministic test vector.

Steps:

1. Pick a test mnemonic with no funds.
2. Use Bob or an HSD script to create/import that wallet.
3. Record the first mainnet receive address at receive depth `0`.
4. Record the first testnet/regtest receive address if useful.
5. Implement the same derivation in `learnhns-mobile`.
6. Confirm iOS and Android return the same address.

The expected output should be committed as a test fixture:

```txt
mnemonic: test-only, never funded
network: main
account: default
branch: receive
depth: 0
address: <expected hns address>
```

## M1 Acceptance Gate

M1 is not complete until a known test seed derives the expected Handshake receive address in the mobile codebase and that expected address has been independently produced by Bob/hsd.

Until this gate passes:

- do not add production seed import
- do not add secure storage for real wallet data
- do not implement send
- do not ask testers to restore real Bob wallets
