# Solana Crowdfunding dApp

A minimal, end-to-end crowdfunding demo on Solana: an [Anchor](https://www.anchor-lang.com/) on-chain program plus a React frontend that talks to it through the Phantom wallet. Users create a campaign, anyone can donate SOL to it, and the campaign admin can withdraw the donated funds.

> **Disclaimer:** this is an educational demo. The program has no deadline/target logic, no refunds path, and has not been audited. Do not deploy it with real funds.

## Repository layout

```
├── Anchor.toml                  # Anchor workspace config (devnet provider, program ID)
├── programs/crowdfunding/       # The on-chain program (Rust / Anchor 0.31)
│   └── src/lib.rs               # All program logic
├── frontend/                    # React 19 + Vite + Tailwind client (see frontend/README.md)
│   └── src/idl.json             # IDL copied from the built program
├── tests/crowdfunding.ts        # Anchor/Mocha test stub (see Known issues)
└── migrations/deploy.ts         # Anchor deploy-script placeholder
```

## The on-chain program

Program ID (localnet/devnet): `HjAEHQpvtSg5dsmB5EEocTUEgKN7MoPFYdb74XhDmgA`

### `Campaign` account

Each user gets exactly one campaign account: a PDA derived from the seeds `["CAMPAIGN_DEMO", user_pubkey]`, allocated with 9000 bytes and paid for by the creator.

| Field            | Type     | Meaning                            |
| ---------------- | -------- | ---------------------------------- |
| `admin`          | `Pubkey` | Creator; only one who can withdraw |
| `name`           | `String` | Campaign name                      |
| `description`    | `String` | Campaign description               |
| `amount_donated` | `u64`    | Total lamports donated             |

Donations are plain SOL transfers into the PDA, so the campaign's balance is its lamport balance — no token accounts or vaults are involved.

### Instructions

| Instruction        | Accounts                          | Behavior |
| ------------------ | --------------------------------- | -------- |
| `create(name, description)` | campaign PDA (init), signer, system program | Initializes the PDA, sets `admin` to the signer, zeroes `amount_donated`. |
| `donate(amount)`   | campaign PDA, signer, system program | Transfers `amount` lamports from the signer to the PDA via the System Program and increments `amount_donated`. |
| `withdraw(amount)` | campaign PDA, signer              | Admin-only (checked against `campaign.admin`). Rejects withdrawals that would drop the account below its rent-exempt minimum, then moves lamports directly from the PDA to the admin. |

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Solana CLI](https://docs.solanalabs.com/cli/install)
- [Anchor CLI](https://www.anchor-lang.com/docs/install) 0.31.x (must match `anchor-lang` in `programs/crowdfunding/Cargo.toml`)
- [Node.js](https://nodejs.org/) and [yarn](https://yarnpkg.com/) (the workspace uses yarn as its package manager)

## Build, test, deploy

```bash
# Build the program (generates target/idl/crowdfunding.json and TS types).
# The IDL step compiles anchor-syn 0.31 against proc-macro2's semver-exempt
# `Span::source_file()` API, which was renamed in nightly-2025-04-16
# (coral-xyz/anchor#3661). Pin proc-macro2 to 1.0.94 (already in Cargo.lock —
# don't `cargo update` it) and build with the pre-rename nightly:
rustup toolchain install nightly-2025-04-14
RUSTUP_TOOLCHAIN=nightly-2025-04-14 anchor build

# Deploy + run tests against a local validator (Anchor.toml defaults to localnet)
RUSTUP_TOOLCHAIN=nightly-2025-04-14 anchor test
# or, after a successful build:
anchor test --skip-build

# Deploy to devnet (pass the cluster explicitly; the default is localnet)
anchor deploy --provider.cluster devnet
```

After any program change, re-sync the frontend's IDL:

```bash
cp target/idl/crowdfunding.json frontend/src/idl.json
```

## Frontend

The client lives in [`frontend/`](frontend/) — React 19, TypeScript, Vite, Tailwind CSS 4, and `@coral-xyz/anchor`. It connects to **devnet** and requires the [Phantom](https://phantom.com/) wallet.

```bash
cd frontend
yarn
yarn dev        # starts Vite with --host
```

The UI can connect/disconnect the wallet, create a campaign, and list all campaigns on the program. See [frontend/README.md](frontend/README.md) for details and rough edges.

## Known issues

- `anchor build` fails on modern Rust toolchains without the `proc-macro2` 1.0.94 pin + `nightly-2025-04-14` override described above ([coral-xyz/anchor#3661](https://github.com/solana-foundation/anchor/issues/3661)).
- The frontend has no UI yet for donating or withdrawing — those instructions are on-chain only.
- `withdraw` signals "not the admin" with `ProgramError::IncorrectProgramId`; a proper Anchor `#[error_code]` enum would be clearer.
- Because the PDA is seeded by the creator's pubkey, each wallet can only ever have one campaign.

## License

ISC — see [LICENSE](LICENSE).
