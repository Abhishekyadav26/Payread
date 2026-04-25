#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env,
};

#[contracttype]
pub enum DataKey {
    Score(u64),      // article_id -> score
    VaultContract,
}

#[contract]
pub struct Trending;

#[contractimpl]
impl Trending {
    pub fn initialize(env: Env, vault: Address) {
        env.storage().instance().set(&DataKey::VaultContract, &vault);
    }

    /// Called by vault (or anyone) to bump an article's trending score
    pub fn record_read(env: Env, article_id: u64) {
        let score: u64 = env.storage().persistent()
            .get(&DataKey::Score(article_id))
            .unwrap_or(0) + 1;
        env.storage().persistent()
            .set(&DataKey::Score(article_id), &score);

        env.events().publish(
            (symbol_short!("Trending"),),
            (article_id, score),
        );
    }

    /// Get score for a single article
    pub fn get_score(env: Env, article_id: u64) -> u64 {
        env.storage().persistent()
            .get(&DataKey::Score(article_id))
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
