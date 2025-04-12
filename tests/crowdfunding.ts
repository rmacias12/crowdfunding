import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crowdfunding } from "../target/types/crowdfunding";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("crowdfunding", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Crowdfunding as Program<Crowdfunding>;
  const wallet = provider.wallet as anchor.Wallet;

  // Same PDA derivation the program uses: seeds ["CAMPAIGN_DEMO", user]
  const [campaign] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("CAMPAIGN_DEMO"), wallet.publicKey.toBuffer()],
    program.programId
  );

  // Must match `space` in the Create accounts struct (programs/crowdfunding/src/lib.rs)
  const CAMPAIGN_SPACE = 9000;

  const DONATION = new anchor.BN(LAMPORTS_PER_SOL).div(new anchor.BN(10)); // 0.1 SOL

  it("Creates a campaign", async () => {
    await program.methods
      .create("Test campaign", "Test description")
      .accounts({
        campaign,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.campaign.fetch(campaign);
    expect(account.name).to.equal("Test campaign");
    expect(account.description).to.equal("Test description");
    expect(account.admin.toString()).to.equal(wallet.publicKey.toString());
    expect(account.amountDonated.toNumber()).to.equal(0);
  });

  it("Accepts a donation and tracks the total", async () => {
    const balanceBefore = await provider.connection.getBalance(campaign);

    await program.methods
      .donate(DONATION)
      .accounts({
        campaign,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.campaign.fetch(campaign);
    expect(account.amountDonated.toString()).to.equal(DONATION.toString());

    const balanceAfter = await provider.connection.getBalance(campaign);
    expect(balanceAfter - balanceBefore).to.equal(DONATION.toNumber());
  });

  it("Lets the admin withdraw donated funds down to the rent floor", async () => {
    const balanceBefore = await provider.connection.getBalance(campaign);
    const rentFloor =
      await provider.connection.getMinimumBalanceForRentExemption(
        CAMPAIGN_SPACE
      );
    const withdrawable = balanceBefore - rentFloor;
    expect(withdrawable).to.be.greaterThan(0);

    await program.methods
      .withdraw(new anchor.BN(withdrawable))
      .accounts({
        campaign,
        user: wallet.publicKey,
      })
      .rpc();

    const balanceAfter = await provider.connection.getBalance(campaign);
    expect(balanceAfter).to.equal(rentFloor);
  });

  it("Rejects a withdrawal that would break the rent-exempt floor", async () => {
    try {
      await program.methods
        .withdraw(new anchor.BN(1))
        .accounts({
          campaign,
          user: wallet.publicKey,
        })
        .rpc();
      assert.fail(
        "withdraw should have failed: the campaign holds only its rent-exempt balance"
      );
    } catch (err: any) {
      expect(err.toString()).to.match(/InsufficientFunds|insufficient/i);
    }
  });

  it("Rejects a withdrawal from a non-admin", async () => {
    const stranger = Keypair.generate();
    const signature = await provider.connection.requestAirdrop(
      stranger.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature, "confirmed");

    try {
      await program.methods
        .withdraw(new anchor.BN(1))
        .accounts({
          campaign,
          user: stranger.publicKey,
        })
        .signers([stranger])
        .rpc();
      assert.fail("withdraw should have failed for a non-admin");
    } catch (err: any) {
      expect(err.toString()).to.match(/IncorrectProgramId|incorrect program/i);
    }
  });
});
