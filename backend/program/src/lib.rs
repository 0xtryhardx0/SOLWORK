use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("D6Ft7B9d32DbEaGegkMtBwHaUqJsdGiiDvayiyHhSZPy");

#[program]
pub mod solwork {
    use super::*;

    pub fn initialize_campaign(
        ctx: Context<InitializeCampaign>,
        campaign_id: String,
        rate_per_task: u64,
        total_tasks: u32,
        amount: u64,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.authority = ctx.accounts.authority.key();
        campaign.vault = ctx.accounts.vault.key();
        campaign.rate_per_task = rate_per_task;
        campaign.total_tasks = total_tasks;
        campaign.completed_tasks = 0;
        campaign.campaign_id = campaign_id;
        campaign.bump = ctx.bumps.campaign;

        // Transfer initial funding tokens from creator to campaign vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn release_payout(ctx: Context<ReleasePayout>, amount: u64) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        
        // Ensure the campaign is not exhausted
        require!(
            campaign.completed_tasks < campaign.total_tasks,
            SolWorkError::CampaignExhausted
        );

        campaign.completed_tasks += 1;

        // Perform token transfer from vault to worker token account using PDA seeds
        let creator_key = campaign.creator.key();
        let campaign_id = &campaign.campaign_id;
        let seeds = &[
            b"campaign",
            creator_key.as_ref(),
            campaign_id.as_bytes(),
            &[campaign.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.worker_token_account.to_account_info(),
            authority: campaign.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        let remaining_balance = ctx.accounts.vault.amount;

        let creator_key = campaign.creator.key();
        let campaign_id = &campaign.campaign_id;
        let seeds = &[
            b"campaign",
            creator_key.as_ref(),
            campaign_id.as_bytes(),
            &[campaign.bump],
        ];
        let signer = &[&seeds[..]];

        // 1. Transfer any remaining tokens in the escrow vault back to the creator
        if remaining_balance > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.campaign.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, remaining_balance)?;
        }

        // 2. Close the vault token account
        let close_accounts = token::CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.creator.to_account_info(),
            authority: ctx.accounts.campaign.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, close_accounts, signer);
        token::close_account(cpi_ctx)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(campaign_id: String)]
pub struct InitializeCampaign<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 32 + 32 + 8 + 4 + 4 + 36 + 1,
        seeds = [b"campaign", creator.key().as_ref(), campaign_id.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = campaign
    )]
    pub vault: Account<'info, TokenAccount>,
    pub mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub authority: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ReleasePayout<'info> {
    #[account(
        mut,
        has_one = authority,
        has_one = vault,
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub worker_token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(
        mut,
        has_one = creator,
        has_one = vault,
        close = creator
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Campaign {
    pub creator: Pubkey,
    pub authority: Pubkey,
    pub vault: Pubkey,
    pub rate_per_task: u64,
    pub total_tasks: u32,
    pub completed_tasks: u32,
    pub campaign_id: String,
    pub bump: u8,
}

#[error_code]
pub enum SolWorkError {
    #[msg("This campaign has already completed all of its allocated tasks.")]
    CampaignExhausted,
}
