export interface Article {
  id: number;
  author: string;           // Stellar address
  title: string;
  summary: string;          // Teaser shown before payment
  content_hash: string;     // IPFS hash or encrypted content ref
  price: string;            // XLM (converted from stroops)
  read_count: number;
  created_at: number;       // Unix timestamp
  tags: string[];
}

export interface ArticleWithAccess extends Article {
  hasAccess: boolean;
  trendingScore?: number;
}

export interface AuthorStats {
  address: string;
  pendingBalance: string;   // XLM withdrawable
  articleCount: number;
  totalReads: number;
}