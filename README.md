# Ledger EIP712 Signature Test

Tests integation of ledger eip support
- https://github.com/btchip/ledgerjs/tree/eip712_v0/packages/hw-app-eth#signeip712hashedmessage

## Prerequisites
- make sure Ledger app running `1.5.0-rc2` and device is unlocked and Ethereum application is open

## Setup
- `nvm use` (or switch to node v12.x.x)
- `yarn install`
- create `.env` following `.env.template` in root
- `yarn start`

## Notes
- Check console logs, ledger signature should match the expected signature
