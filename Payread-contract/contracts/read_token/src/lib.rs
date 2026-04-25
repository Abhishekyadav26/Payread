#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env,
};

#[contracttype]
pub enum DataKey {
    HasAccess(Address, u64),  // (reader, article_id) -> bool
    VaultContract,
    TotalReads,
}

#[contract]
pub struct ReadToken;

#[contractimpl]
impl ReadToken {
    /// Initialize with vault contract address (only vault can mint)
    pub fn initialize(env: Env, vault: Address) {
        env.storage().instance().set(&DataKey::VaultContract, &vault);
    }

    /// Mint a READ pass - only callable by payment_vault
    pub fn mint_access(env: Env, caller: Address, reader: Address, article_id: u64) {
        let vault: Address = env.storage().instance()
            .get(&DataKey::VaultContract)
            .unwrap();
        caller.require_auth();
        assert!(caller == vault, "Only vault can mint");

        env.storage().persistent().set(
            &DataKey::HasAccess(reader.clone(), article_id),
            &true,
        );

        let total: u64 = env.storage().instance()
            .get(&DataKey::TotalReads)
            .unwrap_or(0) + 1;
        env.storage().instance().set(&DataKey::TotalReads, &total);

        env.events().publish(
            (symbol_short!("Access"),),
            (reader, article_id),
        );
    }

    /// Check if a reader has access to an article
    pub fn has_access(env: Env, reader: Address, article_id: u64) -> bool {
        env.storage().persistent()
            .get(&DataKey::HasAccess(reader, article_id))
            .unwrap_or(false)
    }

    /// Total reads across all articles
    pub fn total_reads(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TotalReads).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
