# Helper Client Contract

Status: draft mock contract

The mobile app is non-custodial. Helper services must never receive seed phrases,
private keys, wallet PINs, biometric material, or signing authority.

## Current TypeScript Boundary

The app reads wallet/name state through `src/helper-client`.

Current methods:

- `getStatus()`
- `getWalletSummary({ network, receiveAddress })`
- `getNameDetail({ network, name })`
- `relayTransaction({ network, rawTransactionHex })`

The mock implementation returns static data and refuses transaction relay.

## Expected Live Helper Shape

Future helper APIs should map cleanly to these app calls:

- status: helper mode, network, chain height, freshness
- wallet summary: balance and owned-name summaries for derived addresses
- name detail: current records and lifecycle/renewal state
- tx relay: submit already-signed raw transactions only

Privacy constraints:

- no seed/private-key/password fields
- no LearnHNS account required for v1 wallet reads
- avoid uploading a complete wallet portfolio by default
- allow small address batches once address discovery is implemented
- log minimally and never log secrets
