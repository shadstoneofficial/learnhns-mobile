# LearnHNS Mobile

Cross-platform mobile app for Handshake users.

Version 1 is a non-custodial iOS and Android wallet focused on:

- create and restore wallet
- local encrypted seed storage
- HNS balance, receive, and send
- owned Handshake names
- resource-record display
- local renewal attention

Marketplace buying, marketplace selling, full-node mode, cloud seed sync, and server-side signing are out of scope for v1.

## Current Status

This repo is a fresh Expo/React Native scaffold created from the v1 implementation plan in:

```txt
/Users/michaelmichelini/Documents/GitHub/hub-learnhns/temp-specs/LEARNHNS-MOBILE-V1-IMPLEMENTATION-PLAN-2026-06-08.md
```

The first real engineering gate is wallet-core feasibility:

1. Done in Node/TypeScript: derive Handshake addresses from a public test seed.
2. Done: confirm the same seed/path matches Bob/hsd-generated vectors.
3. Remaining: confirm the same derivation runs inside iOS and Android app runtimes.
4. Only then add secure seed storage for test wallets.

Run the current wallet-core check:

```sh
npm run test:wallet-core
```

The test fixture uses the public BIP39 `abandon ... about` mnemonic. It is safe for open-source tests because it is public and must never be funded.

## Local Setup

```sh
npm install
npm run start
```

Current local notes:

- The scaffold installed with Node `v20.11.1`, but current Expo/React Native packages warn that newer Node 20 is preferred.
- Full iOS verification needs Xcode, not only Command Line Tools.
- Android verification needs Android Studio/SDK.
- Expo export/runtime checks require Node `>=20.19.4`; this repo records that requirement in `package.json`.

## Safety Rules

- Do not use production seeds in early builds.
- Do not log seed phrases, private keys, wallet passwords, PINs, or raw secret material.
- Keep helper APIs non-custodial: public chain data and signed transaction relay only.
- Keep marketplace transaction actions disabled until the wallet foundation is proven.
