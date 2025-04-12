# Crowdfunding Frontend

React client for the Solana crowdfunding program in this repo. Built with **React 19 + TypeScript + Vite 6 + Tailwind CSS 4**, talking to the chain through `@coral-xyz/anchor` and `@solana/web3.js`, with **Phantom** as the wallet.

The frontend targets **devnet** (`clusterApiUrl("devnet")` in `src/App.tsx`) and reads the program address from `src/idl.json`.

## Setup

```bash
yarn          # install dependencies
yarn dev      # start Vite dev server (--host, so it prints a LAN URL too)
```

You need Phantom installed in the browser, and the program deployed to devnet with an `idl.json` that matches it. The whole app is a single component: `src/App.tsx`.

| Script          | What it does                        |
| --------------- | ----------------------------------- |
| `yarn dev`      | Vite dev server with HMR            |
| `yarn build`    | `tsc -b` then production bundle     |
| `yarn lint`     | ESLint (flat config, `eslint.config.js`) |
| `yarn preview`  | Serve the built bundle locally      |

## How it works

- **Wallet connect** — `checkIfWalletIsConnected()` runs on mount and auto-connects if Phantom already trusts the site; the Connect/Disconnect buttons call `window.solana.connect()` / `.disconnect()` directly.
- **Create Campaign** — derives the PDA with `PublicKey.findProgramAddress(["CAMPAIGN_DEMO", user_pubkey])` (matching the program's seeds) and calls `create`. The campaign name/description are currently hardcoded strings in `App.tsx`.
- **Get Campaigns** — `connection.getProgramAccounts(programID)` to list every account under the program, then `program.account.campaign.fetch()` for each one. Fine for a demo; it does not scale and has no filter.
- **Buffer polyfill** — `globalThis.Buffer = Buffer` at the top of `App.tsx`; Anchor's Borsh deserialization needs Node's `Buffer` in the browser.

## Keeping the IDL in sync

`src/idl.json` is a copy of the program's build output. After changing `programs/crowdfunding/src/lib.rs`:

```bash
RUSTUP_TOOLCHAIN=nightly-2025-04-14 anchor build      # from the repo root (see root README for why)
cp target/idl/crowdfunding.json frontend/src/idl.json
```

If the IDL drifts from the deployed program, instruction encoding or account deserialization will fail at runtime.

## Rough edges

- No donate or withdraw UI yet — those instructions exist on-chain only.
- Campaign creation uses a hardcoded name/description instead of a form.
- The campaign list renders `campaign.name` under a "Balance:" label.
- `window.solana` is typed as `any`; a proper wallet adapter (e.g. `@solana/wallet-adapter-react`) would be the upgrade path.

## ESLint

Standard Vite flat-config setup (`eslint.config.js`) with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`. For type-aware linting in production, see the [Vite React-TS template docs](https://github.com/vitejs/vite-plugin-react/tree/main/packages/template-react-ts).
