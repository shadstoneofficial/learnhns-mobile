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

## Testing Without Xcode

You can still test early LearnHNS Mobile builds without installing Xcode on this machine.

Best first path:

1. Upgrade Node to `>=20.19.4`.
2. Install Expo Go on a real iPhone or Android phone.
3. Run:

```sh
npm run start
```

4. Scan the QR code with Expo Go.

This is enough for early JavaScript/runtime checks, including the current public wallet-core derivation fixture, as long as the code only uses Expo Go-compatible JavaScript and native APIs.

Limits of Expo Go:

- It is not a final app-store build.
- It cannot test custom native modules that require a development build.
- It is not a substitute for final iOS/Android release QA.

Later testing paths:

- iOS simulator/local native builds require full Xcode on a Mac.
- Android emulator/local native builds require Android Studio and Android SDK.
- iOS/Android cloud builds can use EAS Build after Expo project setup, Apple Developer access, and Google Play setup.
- TestFlight and Google Play internal testing are the right private beta channels after the wallet foundation is safer.

## Release Automation Direction

Desktop apps can publish installable assets directly on GitHub Releases. Mobile is similar in spirit, but different in distribution.

Recommended v1 path:

- Use GitHub Actions for repeatable checks on every pull request.
- Use Expo EAS Build for signed iOS and Android builds.
- Use EAS Submit later to upload to Apple TestFlight and Google Play internal testing.
- Keep GitHub Releases for release notes, checksums, and any non-store artifacts, not as the primary public mobile install path.

Why:

- iOS users normally install beta builds through TestFlight, not by downloading an `.ipa` from GitHub.
- Android can technically distribute APKs directly, but Google Play internal/closed testing is safer for normal testers.
- Apple and Google app-store credentials, signing keys, and service-account files must live in secure CI/app-store secret stores, never in the repo.

Future CI/CD stages:

1. `ci`: typecheck and wallet-core tests.
2. `preview`: EAS internal builds for trusted testers.
3. `beta`: submit to TestFlight and Google Play internal testing.
4. `production`: submit for app-store review only after wallet safety, policy, and privacy gates pass.

## Safety Rules

- Do not use production seeds in early builds.
- Do not log seed phrases, private keys, wallet passwords, PINs, or raw secret material.
- Keep helper APIs non-custodial: public chain data and signed transaction relay only.
- Keep marketplace transaction actions disabled until the wallet foundation is proven.
