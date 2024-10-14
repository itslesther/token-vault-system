import * as anchor from "@coral-xyz/anchor";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAccount,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";


/**
 * Gets the vault PDA address for the given signer.
 */
export function getVaultPda(programId: PublicKey, signer: PublicKey) {
  const [pda, _] = PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("vault"), signer.toBytes()],
    programId
  );
  return pda;
}

/**
 * Creates a SPL Token.
 */
export async function createMint(
  provider: anchor.AnchorProvider,
  decimals: number,
  keypair = Keypair.generate()
) {
  const signer = provider.publicKey;

  const lamports = await getMinimumBalanceForRentExemptMint(
    provider.connection
  );

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: signer,
      newAccountPubkey: keypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(
      keypair.publicKey,
      decimals,
      signer,
      signer
    )
  );

  const signature = await provider.sendAndConfirm(tx, [keypair]);

  return {
    signature,
    publicKey: keypair.publicKey,
  };
}

/**
 * Mints tokens to the signer.
 */
export async function mintToSigner(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  signerAta: PublicKey,
  amount: bigint
) {
  const signer = provider.publicKey;

  let tx = new Transaction();

  try {
    await getAccount(provider.connection, signerAta);
  } catch (error: unknown) {
    // TokenAccountNotFoundError can be possible if the associated address has already received some lamports,
    // becoming a system account. Assuming program derived addressing is safe, this is the only case for the
    // TokenInvalidAccountOwnerError in this code path.
    if (
      error instanceof TokenAccountNotFoundError ||
      error instanceof TokenInvalidAccountOwnerError
    ) {
      tx.add(
        createAssociatedTokenAccountInstruction(signer, signerAta, signer, mint)
      );
    } else {
      throw error;
    }
  }

  tx.add(createMintToInstruction(mint, signerAta, signer, amount));

  const signature = await provider.sendAndConfirm(tx, []);
  return signature;
}
