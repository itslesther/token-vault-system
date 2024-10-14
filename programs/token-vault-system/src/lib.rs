use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Transfer};

mod utils;
use utils::*;

declare_id!("CjnVdEc6tRCZpDA6bRJC5qTpRga2miCGpCZoFHNtt6Te");

#[program]
pub mod token_vault_system {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        ctx.accounts.vault.owner = *ctx.accounts.signer.key;
        Ok(())
    }

    pub fn deposit_tokens(ctx: Context<DepositTokens>, amount: u64) -> Result<()> {
        let token_program = &ctx.accounts.token_program;

        transfer(
            CpiContext::new(
                token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.signer_ata.to_account_info(),
                    to: ctx.accounts.vault_ata.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }

    pub fn withdraw_tokens(ctx: Context<WithdrawTokens>, amount: u64) -> Result<()> {
        let token_program = &ctx.accounts.token_program;
        let signer = &ctx.accounts.signer;

        let vault_seeds: &[&[u8]; 3] = &[Vault::SEED, signer.clone().key.as_ref(), &[ctx.bumps.vault]];
        let vault_as_signer: &[&[&[u8]]; 1] = &[&vault_seeds[..]];

        transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_ata.to_account_info(),
                    to: ctx.accounts.signer_ata.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                vault_as_signer,
            ),
            amount,
        )?;
        Ok(())
    }
}
