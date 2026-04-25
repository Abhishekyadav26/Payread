#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Vec,
};

#[contracttype]
#[derive(Clone)]
pub struct Article {
    pub id: u64,
    pub author: Address,
    pub title: String,
    pub summary: String,       // Short teaser shown before payment
    pub content_hash: String,  // Hash of full content stored off-chain (IPFS or encrypted)
    pub price: i128,           // in stroops
    pub read_count: u64,
    pub created_at: u64,
    pub tags: Vec<String>,
}

#[contracttype]
pub enum DataKey {
    Article(u64),
    ArticleCount,
    AuthorArticles(Address),
}

#[contract]
pub struct ContentRegistry;

#[contractimpl]
impl ContentRegistry {
    /// Publish a new article
    pub fn publish(
        env: Env,
        author: Address,
        title: String,
        summary: String,
        content_hash: String,
        price: i128,
        tags: Vec<String>,
    ) -> u64 {
        author.require_auth();

        let id: u64 = env.storage().instance()
            .get(&DataKey::ArticleCount)
            .unwrap_or(0u64) + 1;

        let article = Article {
            id,
            author: author.clone(),
            title: title.clone(),
            summary,
            content_hash,
            price,
            read_count: 0,
            created_at: env.ledger().timestamp(),
            tags,
        };

        env.storage().persistent().set(&DataKey::Article(id), &article);
        env.storage().instance().set(&DataKey::ArticleCount, &id);

        // Track author's articles
        let mut author_articles: Vec<u64> = env.storage().persistent()
            .get(&DataKey::AuthorArticles(author.clone()))
            .unwrap_or(Vec::new(&env));
        author_articles.push_back(id);
        env.storage().persistent().set(&DataKey::AuthorArticles(author), &author_articles);

        // Emit event for real-time feed
        env.events().publish(
            (symbol_short!("Published"),),
            (id, price, title),
        );

        id
    }

    /// Increment read count (called by payment_vault after payment)
    pub fn increment_reads(env: Env, article_id: u64) {
        let mut article: Article = env.storage().persistent()
            .get(&DataKey::Article(article_id))
            .unwrap();
        article.read_count += 1;
        env.storage().persistent().set(&DataKey::Article(article_id), &article);

        env.events().publish(
            (symbol_short!("Read"),),
            (article_id, article.read_count),
        );
    }

    /// Get a single article
    pub fn get_article(env: Env, article_id: u64) -> Article {
        env.storage().persistent()
            .get(&DataKey::Article(article_id))
            .unwrap()
    }

    /// Get total article count
    pub fn get_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::ArticleCount).unwrap_or(0)
    }

    /// Get all articles by an author
    pub fn get_by_author(env: Env, author: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::AuthorArticles(author))
            .unwrap_or(Vec::new(&env))
    }
}

#[cfg(test)]
mod test;
