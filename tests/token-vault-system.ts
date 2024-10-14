import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { TokenVaultSystem } from "../target/types/token_vault_system";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { PublicKey } from "@solana/web3.js";
import { createMint, getVaultPda, mintToSigner } from "./utils";
import { expect } from "chai";

describe("token-vault-system", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .TokenVaultSystem as Program<TokenVaultSystem>;

  const signer = program.provider.publicKey;

  let mint: PublicKey;
  let signerAta: PublicKey;
  let vault: PublicKey;
  let vaultAta: PublicKey;

  it("Creates an SPL Token", async () => {
    const decimals = 9;
    const res = await createMint(provider, decimals);

    mint = res.publicKey;

    const mintInfo = await getMint(provider.connection, mint);

    expect(mintInfo.address.equals(mint)).to.be.true;
    expect(mintInfo.decimals).to.equal(decimals);
    expect(mintInfo.freezeAuthority.equals(signer)).to.be.true;
    expect(mintInfo.mintAuthority.equals(signer)).to.be.true;
  });

  it("Mints the SPL Token", async () => {
    signerAta = getAssociatedTokenAddressSync(mint, signer);

    const amount = BigInt(100);

    const signature = await mintToSigner(provider, mint, signerAta, amount);
    const signerATAInfo = await getAccount(provider.connection, signerAta);

    expect(signature).to.length.above(0);
    expect(signerATAInfo.owner.equals(signer)).to.be.true;
    expect(signerATAInfo.amount).to.equal(amount);
    expect(signerATAInfo.mint.equals(mint)).to.be.true;
  });

  it("Initializes a Vault", async () => {
    vault = getVaultPda(program.programId, signer);

    // each vault has its own Token Account in order to store the tokens
    vaultAta = getAssociatedTokenAddressSync(mint, vault, true);

    // `initializeVault` creates the vault and the vault's token account
    const signature = await program.methods
      .initializeVault()
      .accountsStrict({
        signer,
        systemProgram: SYSTEM_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        mint,
        vault,
        vaultAta,
      })
      .rpc();

    const vaultInfo = await program.account.vault.fetch(vault);

    expect(signature).to.length.above(0);
    expect(vaultInfo.owner.equals(signer)).to.be.true;
  });

  it("Deposits tokens into the Vault", async () => {
    const amount = BigInt(30);

    const { amount: balanceBefore } = await getAccount(
      provider.connection,
      signerAta
    );

    // `depositTokens` transfers the tokens from the signer's token account to the vault's token account
    const signature = await program.methods
      .depositTokens(new BN(String(amount)))
      .accountsStrict({
        signer,
        systemProgram: SYSTEM_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        mint,
        vault,
        vaultAta,
        signerAta,
      })
      .rpc();

    const { amount: balanceAfter } = await getAccount(
      provider.connection,
      signerAta
    );

    expect(signature).to.length.above(0);
    expect(balanceBefore - amount).to.equal(balanceAfter);
  });

  it("Withdraws tokens from the Vault", async () => {
    const amount = BigInt(5);

    const { amount: balanceBefore } = await getAccount(
      provider.connection,
      signerAta
    );

    // `withdrawTokens` transfers the tokens from the vault's token account to the signer's token account
    const signature = await program.methods
      .withdrawTokens(new BN(String(amount)))
      .accountsStrict({
        signer,
        systemProgram: SYSTEM_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        mint,
        vault,
        vaultAta,
        signerAta,
      })
      .rpc();

    const { amount: balanceAfter } = await getAccount(
      provider.connection,
      signerAta
    );

    expect(signature).to.length.above(0);
    expect(balanceBefore + amount).to.equal(balanceAfter);
  });

  it("Fails to deposit more tokens than available into the Vault", async () => {
    const amount = BigInt(1000);

    try {
      await program.methods
        .depositTokens(new BN(String(amount)))
        .accountsStrict({
          signer,
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          mint,
          vault,
          vaultAta,
          signerAta,
        })
        .rpc();
    } catch (err) {
      expect(
        (err.transactionLogs as string[]).includes(
          "Program log: Error: insufficient funds"
        )
      ).to.be.true;
    }
  });

  it("Fails to withdraws more tokens than available from the Vault", async () => {
    const amount = BigInt(100);

    try {
      await program.methods
        .withdrawTokens(new BN(String(amount)))
        .accountsStrict({
          signer,
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          mint,
          vault,
          vaultAta,
          signerAta,
        })
        .rpc();
    } catch (err) {
      expect(
        (err.transactionLogs as string[]).includes(
          "Program log: Error: insufficient funds"
        )
      ).to.be.true;
    }
  });
});
