# Solana Account Abstraction - Token Vault Task

Objective:
The goal of this task is to implement a Solana program that demonstrates account
abstraction by creating a token vault system. The program should allow users to
deposit and withdraw tokens from their personal token vault.

The Solana program implements the following instructions:

`initialize_vault` : Initializes a token vault for a user.
`deposit_tokens` : Allows users to deposit tokens into their token vault.
`withdraw_tokens` : Allows users to withdraw tokens from their token vault.

Each Vault has its own Associated Token Account in order to store the Tokens


## Environment

Tested with:

- rustc 1.81.0
- anchor-cli 0.30.1

## Installation

Follow Installation Guide: https://www.anchor-lang.com/docs/installation

Warning: For the current environment, I faced the following issue: https://github.com/coral-xyz/anchor/issues/3126

In order to solve it I implemented the following workaround: https://github.com/coral-xyz/anchor/issues/3126#issuecomment-2254245326

## Build

Run `yarn build`

## Test

Run `yarn test`
