/**
 * Hunt Constants
 * 
 * Centralized configuration for Hunt tab features.
 */

// ============ STORAGE KEYS ============

export const HUNT_STORAGE_KEYS = {
    ANALYZE_QUEUE: 'ifrit_analyze_queue',
    PURCHASE_QUEUE: 'ifrit_purchase_queue',
    WATCHLIST: 'ifrit_domain_watchlist',
    KEYWORD_HISTORY: 'ifrit_keyword_analysis_history',
    FLIP_PROJECTS: 'ifrit_flip_projects',
    SPAMZILLA_KEY: 'ifrit_spamzilla_key',
    CLOUDFLARE_CONFIG: 'ifrit_cloudflare_config',
} as const;

// ============ PAGINATION ============

export const PAGINATION = {
    DOMAINS_PER_PAGE: 10,
    KEYWORDS_PER_PAGE: 10,
    MAX_HISTORY_ITEMS: 10,
} as const;

// ============ TLD CLASSIFICATIONS ============

export const PREMIUM_TLDS = ['.com', '.net', '.org', '.io', '.ai', '.co'];
export const GOOD_TLDS = ['.info', '.biz', '.dev', '.app', '.tech', '.guide', '.review'];
export const RISKY_TLDS = ['.xyz', '.top', '.loan', '.click', '.link', '.work', '.gq', '.cf', '.tk', '.ml', '.ga'];

// ============ NICHES ============

export const NICHE_KEYWORDS: Record<string, string[]> = {
    finance: ['finance', 'money', 'invest', 'loan', 'credit', 'bank', 'mortgage', 'insurance', 'wealth', 'stock', 'crypto', 'bitcoin'],
    health: ['health', 'medical', 'doctor', 'clinic', 'wellness', 'fitness', 'diet', 'nutrition', 'pharma', 'hospital'],
    tech: ['tech', 'software', 'app', 'digital', 'cloud', 'data', 'ai', 'cyber', 'code', 'dev', 'saas', 'api'],
    legal: ['law', 'legal', 'attorney', 'lawyer', 'court', 'justice', 'litigation'],
    realestate: ['realty', 'property', 'estate', 'home', 'house', 'apartment', 'condo', 'land', 'mortgage'],
};

// ============ EVERGREEN KEYWORDS ============

export const EVERGREEN_KEYWORDS = [
    { keyword: 'Best VPN Services 2025', niche: 'Cybersecurity', context: 'Review and comparison of top VPN providers' },
    { keyword: 'Credit Card Comparison 2025', niche: 'Finance', context: 'Compare rewards, cashback, and travel credit cards' },
    { keyword: 'Life Insurance Quotes Online', niche: 'Insurance', context: 'How to get the best life insurance rates' },
    { keyword: 'Small Business Loans Guide', niche: 'Finance', context: 'Best financing options for startups' },
    { keyword: 'Cloud Hosting Comparison', niche: 'Technology', context: 'AWS vs Azure vs Google Cloud' },
    { keyword: 'Mortgage Refinance Calculator', niche: 'Finance', context: 'When and how to refinance your mortgage' },
    { keyword: 'Best CRM Software 2025', niche: 'SaaS', context: 'Top CRM tools for sales teams' },
    { keyword: 'Personal Injury Lawyer Cost', niche: 'Legal', context: 'Legal services pricing guide' },
];

// ============ REGISTRARS ============

export const REGISTRARS = [
    { id: 'namecheap', name: 'Namecheap', urlTemplate: 'https://www.namecheap.com/domains/registration/results/?domain=' },
    { id: 'cloudflare', name: 'Cloudflare', urlTemplate: 'https://www.cloudflare.com/products/registrar/' },
    { id: 'porkbun', name: 'Porkbun', urlTemplate: 'https://porkbun.com/checkout/search?q=' },
    { id: 'godaddy', name: 'GoDaddy', urlTemplate: 'https://www.godaddy.com/domainsearch/find?domainToCheck=' },
] as const;

// ============ FLIP STAGES ============

export const FLIP_STAGES = [
    { id: 'acquired', label: 'Acquired', color: 'blue', guidance: 'Domain purchased. Plan content strategy.' },
    { id: 'building', label: 'Building', color: 'yellow', guidance: 'Creating content and traffic.' },
    { id: 'listed', label: 'Listed', color: 'purple', guidance: 'Listed on marketplaces.' },
    { id: 'sold', label: 'Sold', color: 'green', guidance: 'Completed! Calculate ROI.' },
] as const;

export const FLIP_MARKETPLACES = ['Sedo', 'Dan.com', 'Afternic', 'Flippa', 'Namecheap', 'GoDaddy', 'Other'];

// ============ SCORING ============

export const SCORE_THRESHOLDS = {
    EXCELLENT: 80,
    GOOD: 60,
    FAIR: 40,
    POOR: 20,
} as const;

export const RECOMMENDATIONS = {
    STRONG_BUY: { label: 'Strong Buy', color: 'green', minScore: 80 },
    BUY: { label: 'Buy', color: 'emerald', minScore: 60 },
    CONSIDER: { label: 'Consider', color: 'yellow', minScore: 40 },
    AVOID: { label: 'Avoid', color: 'red', minScore: 0 },
} as const;

// ============ SPAM PATTERNS ============

export const SPAM_PATTERNS = [
    /casino/i, /poker/i, /gambling/i,
    /viagra/i, /cialis/i, /pharma/i,
    /payday/i, /loan.*fast/i,
    /cheap.*buy/i, /buy.*cheap/i,
];

// ============ API ENDPOINTS ============

export const HUNT_API_ENDPOINTS = {
    ANALYZE: '/api/domains/analyze',
    BLACKLIST: '/api/domains/blacklist',
    ENRICH: '/api/domains/enrich',
    FREE_SEARCH: '/api/domains/free-search',
    SEARCH: '/api/domains/search',
} as const;
