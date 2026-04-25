#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token,
    Address, Env, IntoVal,
};

#[contracttype]
pub enum DataKey {
    AuthorBalance(Address),
    ReadTokenContract,
    ContentRegistry,
    TrendingContract,
    TotalVolume,
}

#[contract]
pub struct PaymentVault;

#[contractimpl]
impl PaymentVault {
    /// Wire up inter-contract dependencies
    pub fn initialize(env: Env, read_token: Address, registry: Address, trending: Address) {
        env.storage().instance().set(&DataKey::ReadTokenContract, &read_token);
        env.storage().instance().set(&DataKey::ContentRegistry, &registry);
        env.storage().instance().set(&DataKey::TrendingContract, &trending);
    }

    /// Pay for an article -> mints READ pass -> credits author balance
    /// This is the core inter-contract call function
    pub fn pay_for_article(
        env: Env,
        reader: Address,
        article_id: u64,
        author: Address,
        price: i128,
        xlm_token: Address,
    ) {
        reader.require_auth();

        // 1. Transfer XLM from reader to this vault
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(
            &reader,
            &env.current_contract_address(),
            &price,
        );

        // 2. Credit author's withdrawable balance
        let current: i128 = env.storage().persistent()
            .get(&DataKey::AuthorBalance(author.clone()))
            .unwrap_or(0);
        env.storage().persistent()
            .set(&DataKey::AuthorBalance(author.clone()), &(current + price));

        // 3. Update total platform volume
        let volume: i128 = env.storage().instance()
            .get(&DataKey::TotalVolume)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalVolume, &(volume + price));

        // 4. Inter-contract call -> read_token.mint_access
        let read_token: Address = env.storage().instance()
            .get(&DataKey::ReadTokenContract)
            .unwrap();

        env.invoke_contract::<()>(
            &read_token,
            &soroban_sdk::Symbol::new(&env, "mint_access"),
            soroban_sdk::vec![
                &env,
                env.current_contract_address().into_val(&env),
                reader.clone().into_val(&env),
                article_id.into_val(&env),
            ],
        );

        // 5. Inter-contract call -> content_registry.increment_reads
        let registry: Address = env.storage().instance()
            .get(&DataKey::ContentRegistry)
            .unwrap();

        env.invoke_contract::<()>(
            &registry,
            &soroban_sdk::Symbol::new(&env, "increment_reads"),
            soroban_sdk::vec![
                &env,
                article_id.into_val(&env),
            ],
        );

        // 6. Inter-contract call -> trending.record_read
        let trending: Address = env.storage().instance()
            .get(&DataKey::TrendingContract)
            .unwrap();

        env.invoke_contract::<()>(
            &trending,
            &soroban_sdk::Symbol::new(&env, "record_read"),
            soroban_sdk::vec![
                &env,
                article_id.into_val(&env),
            ],
        );

        env.events().publish(
            (symbol_short!("Paid"),),
            (reader, article_id, price),
        );
    }

    /// Author withdraws their earned balance
    pub fn withdraw(env: Env, author: Address, xlm_token: Address) {
        author.require_auth();

        let balance: i128 = env.storage().persistent()
            .get(&DataKey::AuthorBalance(author.clone()))
            .unwrap_or(0);

        assert!(balance > 0, "Nothing to withdraw");

        // Reset balance before transfer (re-entrancy guard)
        env.storage().persistent()
            .set(&DataKey::AuthorBalance(author.clone()), &0i128);

        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(
            &env.current_contract_address(),
            &author,
            &balance,
        );

        env.events().publish(
            (symbol_short!("Withdraw"),),
            (author, balance),
        );
    }

    /// Get author's withdrawable balance
    pub fn get_balance(env: Env, author: Address) -> i128 {
        env.storage().persistent()
            .get(&DataKey::AuthorBalance(author))
            .unwrap_or(0)
    }

    /// Total XLM volume through the platform
    pub fn total_volume(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalVolume).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
