/**
 * CPC Intelligence Module
 * 
 * Classifies keywords into niches and estimates CPC potential
 * based on industry data and keyword patterns.
 */

export type CPCLevel = 'very_high' | 'high' | 'medium' | 'low';

export interface NicheClassification {
    niche: string;
    cpcLevel: CPCLevel;
    estimatedCPC: string;  // Range like "$15-45"
    competitionLevel: 'low' | 'medium' | 'high' | 'very_high';
    intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
}

export interface CPCAnalysis {
    keyword: string;
    classifications: NicheClassification[];
    primaryNiche: string;
    primaryCPC: CPCLevel;
    score: number;  // 0-100
    isHighCPC: boolean;
    recommendation: string;
}

/**
 * High-CPC niche definitions based on December 2025 research
 * Sources: Publift, Megadigital.ai, industry reports
 */
const NICHE_DATA: Record<string, {
    keywords: string[];
    cpcRange: string;
    cpcLevel: CPCLevel;
    competition: 'low' | 'medium' | 'high' | 'very_high';
    defaultIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
}> = {
    'Insurance': {
        keywords: ['insurance', 'coverage', 'policy', 'premium', 'deductible', 'claim', 'life insurance', 'auto insurance', 'health insurance', 'home insurance'],
        cpcRange: '$30-80',
        cpcLevel: 'very_high',
        competition: 'very_high',
        defaultIntent: 'commercial'
    },
    'Legal Services': {
        keywords: ['lawyer', 'attorney', 'legal', 'law firm', 'personal injury', 'divorce', 'bankruptcy', 'lawsuit', 'compensation', 'settlement'],
        cpcRange: '$30-60',
        cpcLevel: 'very_high',
        competition: 'very_high',
        defaultIntent: 'commercial'
    },
    'Cryptocurrency & Investing': {
        keywords: ['crypto', 'bitcoin', 'ethereum', 'investment', 'trading', 'stocks', 'portfolio', 'blockchain', 'defi', 'nft', 'forex'],
        cpcRange: '$20-45',
        cpcLevel: 'very_high',
        competition: 'high',
        defaultIntent: 'commercial'
    },
    'Personal Finance': {
        keywords: ['savings', 'budget', 'credit score', 'credit card', 'loan', 'mortgage', 'refinance', 'debt', 'financial planning', 'wealth'],
        cpcRange: '$20-45',
        cpcLevel: 'very_high',
        competition: 'high',
        defaultIntent: 'commercial'
    },
    'Real Estate': {
        keywords: ['real estate', 'property', 'home buying', 'mortgage', 'realtor', 'housing', 'apartment', 'rental', 'investment property'],
        cpcRange: '$15-40',
        cpcLevel: 'high',
        competition: 'high',
        defaultIntent: 'commercial'
    },
    'Health & Wellness': {
        keywords: ['health', 'wellness', 'fitness', 'supplement', 'vitamin', 'weight loss', 'diet', 'nutrition', 'medical', 'treatment', 'therapy'],
        cpcRange: '$10-35',
        cpcLevel: 'high',
        competition: 'high',
        defaultIntent: 'commercial'
    },
    'SaaS & Business Software': {
        keywords: ['saas', 'software', 'crm', 'erp', 'project management', 'automation', 'b2b', 'enterprise', 'business tool', 'productivity'],
        cpcRange: '$10-30',
        cpcLevel: 'high',
        competition: 'high',
        defaultIntent: 'commercial'
    },
    'Web Hosting & Domains': {
        keywords: ['hosting', 'web hosting', 'domain', 'vps', 'cloud hosting', 'ssl', 'website builder', 'wordpress hosting'],
        cpcRange: '$15-35',
        cpcLevel: 'high',
        competition: 'high',
        defaultIntent: 'transactional'
    },
    'Cybersecurity & VPNs': {
        keywords: ['vpn', 'antivirus', 'security', 'password manager', 'encryption', 'privacy', 'malware', 'firewall', 'cyber'],
        cpcRange: '$12-30',
        cpcLevel: 'high',
        competition: 'medium',
        defaultIntent: 'commercial'
    },
    'Online Education': {
        keywords: ['online course', 'certification', 'training', 'learn', 'tutorial', 'bootcamp', 'degree', 'e-learning', 'skill'],
        cpcRange: '$8-25',
        cpcLevel: 'medium',
        competition: 'medium',
        defaultIntent: 'commercial'
    },
    'Digital Marketing': {
        keywords: ['seo', 'marketing', 'advertising', 'ppc', 'social media marketing', 'content marketing', 'email marketing', 'analytics'],
        cpcRange: '$8-20',
        cpcLevel: 'medium',
        competition: 'high',
        defaultIntent: 'commercial'
    },
    'Home & DIY': {
        keywords: ['home improvement', 'diy', 'renovation', 'tools', 'smart home', 'appliance', 'furniture', 'decor', 'garden'],
        cpcRange: '$5-15',
        cpcLevel: 'medium',
        competition: 'medium',
        defaultIntent: 'informational'
    },
    'Travel': {
        keywords: ['travel', 'flight', 'hotel', 'vacation', 'booking', 'destination', 'tourism', 'cruise', 'rental car'],
        cpcRange: '$5-15',
        cpcLevel: 'medium',
        competition: 'high',
        defaultIntent: 'transactional'
    },
    'General Tech': {
        keywords: ['tech', 'gadget', 'phone', 'laptop', 'computer', 'app', 'device', 'electronics', 'review'],
        cpcRange: '$3-12',
        cpcLevel: 'medium',
        competition: 'medium',
        defaultIntent: 'informational'
    },
    'Entertainment': {
        keywords: ['streaming', 'gaming', 'movie', 'music', 'podcast', 'entertainment', 'video', 'sports'],
        cpcRange: '$2-8',
        cpcLevel: 'low',
        competition: 'low',
        defaultIntent: 'informational'
    }
};

/**
 * Commercial intent indicators that boost CPC potential
 */
const COMMERCIAL_INTENT_KEYWORDS = [
    'best', 'top', 'review', 'vs', 'versus', 'compare', 'comparison', 'alternative',
    'pricing', 'cost', 'cheap', 'affordable', 'premium', 'free', 'trial',
    'buy', 'purchase', 'deal', 'discount', 'coupon', 'promo',
    'for business', 'for enterprise', 'professional', 'service', 'provider'
];

/**
 * Keywords indicating high buyer intent (transactional)
 */
const TRANSACTIONAL_KEYWORDS = [
    'buy', 'purchase', 'order', 'subscribe', 'sign up', 'get started',
    'download', 'install', 'free trial', 'demo', 'quote', 'pricing'
];

/**
 * Analyze a keyword for CPC potential
 */
export function analyzeCPC(keyword: string): CPCAnalysis {
    const keywordLower = keyword.toLowerCase();
    const classifications: NicheClassification[] = [];

    // Check each niche
    for (const [nicheName, nicheData] of Object.entries(NICHE_DATA)) {
        const matchScore = calculateNicheMatch(keywordLower, nicheData.keywords);

        if (matchScore > 0) {
            classifications.push({
                niche: nicheName,
                cpcLevel: nicheData.cpcLevel,
                estimatedCPC: nicheData.cpcRange,
                competitionLevel: nicheData.competition,
                intent: detectIntent(keywordLower, nicheData.defaultIntent)
            });
        }
    }

    // Sort by CPC level
    const cpcOrder: Record<CPCLevel, number> = { 'very_high': 4, 'high': 3, 'medium': 2, 'low': 1 };
    classifications.sort((a, b) => cpcOrder[b.cpcLevel] - cpcOrder[a.cpcLevel]);

    // Determine primary classification
    const primary = classifications[0] || {
        niche: 'General',
        cpcLevel: 'low' as CPCLevel,
        estimatedCPC: '$1-5',
        competitionLevel: 'low' as const,
        intent: 'informational' as const
    };

    // Calculate overall score
    const score = calculateCPCScore(keywordLower, classifications);

    return {
        keyword,
        classifications,
        primaryNiche: primary.niche,
        primaryCPC: primary.cpcLevel,
        score,
        isHighCPC: score >= 60,
        recommendation: generateRecommendation(score, primary)
    };
}

function calculateNicheMatch(keyword: string, nicheKeywords: string[]): number {
    let matches = 0;
    for (const nk of nicheKeywords) {
        if (keyword.includes(nk)) {
            matches++;
        }
    }
    return matches;
}

function detectIntent(
    keyword: string,
    defaultIntent: 'informational' | 'commercial' | 'transactional' | 'navigational'
): 'informational' | 'commercial' | 'transactional' | 'navigational' {
    // Check for transactional intent first
    for (const tk of TRANSACTIONAL_KEYWORDS) {
        if (keyword.includes(tk)) {
            return 'transactional';
        }
    }

    // Check for commercial intent
    for (const ck of COMMERCIAL_INTENT_KEYWORDS) {
        if (keyword.includes(ck)) {
            return 'commercial';
        }
    }

    return defaultIntent;
}

function calculateCPCScore(keyword: string, classifications: NicheClassification[]): number {
    let score = 0;

    // Base score from niche CPC level
    if (classifications.length > 0) {
        const cpcScores: Record<CPCLevel, number> = { 'very_high': 40, 'high': 30, 'medium': 20, 'low': 10 };
        score += cpcScores[classifications[0].cpcLevel];
    }

    // Bonus for commercial/transactional intent
    const hasCommercialIntent = COMMERCIAL_INTENT_KEYWORDS.some(ck => keyword.includes(ck));
    const hasTransactionalIntent = TRANSACTIONAL_KEYWORDS.some(tk => keyword.includes(tk));

    if (hasTransactionalIntent) {
        score += 30;
    } else if (hasCommercialIntent) {
        score += 20;
    }

    // Bonus for multiple niche matches
    if (classifications.length >= 2) {
        score += 10;
    }

    // Bonus for specific high-value patterns
    const highValuePatterns = ['best', 'top 10', 'review', 'vs', 'alternative'];
    for (const pattern of highValuePatterns) {
        if (keyword.includes(pattern)) {
            score += 5;
            break;
        }
    }

    return Math.min(100, score);
}

function generateRecommendation(score: number, primary: NicheClassification): string {
    if (score >= 80) {
        return `🔥 Excellent! This is a high-CPC keyword in ${primary.niche}. Expected CPC: ${primary.estimatedCPC}. Prioritize this content.`;
    } else if (score >= 60) {
        return `✅ Good potential. This ${primary.niche} keyword could generate solid revenue. Consider adding commercial intent keywords.`;
    } else if (score >= 40) {
        return `⚡ Moderate potential. Consider targeting a higher-CPC niche or adding buyer-intent modifiers like "best" or "review".`;
    } else {
        return `📝 Lower CPC expected. Good for traffic building but consider pairing with higher-CPC content.`;
    }
}

/**
 * Suggest higher-CPC alternatives for a keyword
 */
export function suggestHighCPCAlternatives(keyword: string): string[] {
    const suggestions: string[] = [];
    const keywordLower = keyword.toLowerCase();

    // Add commercial intent modifiers
    if (!keywordLower.includes('best')) {
        suggestions.push(`best ${keyword}`);
    }
    if (!keywordLower.includes('review')) {
        suggestions.push(`${keyword} review`);
    }
    if (!keywordLower.includes('vs') && !keywordLower.includes('versus')) {
        suggestions.push(`${keyword} vs [competitor]`);
    }
    if (!keywordLower.includes('alternative')) {
        suggestions.push(`${keyword} alternatives`);
    }

    // Add year for freshness
    const currentYear = new Date().getFullYear();
    if (!keywordLower.includes(String(currentYear))) {
        suggestions.push(`${keyword} ${currentYear}`);
    }

    return suggestions;
}

/**
 * Get high-CPC niches for content planning
 */
export function getHighCPCNiches(): Array<{ niche: string; cpcRange: string; keywords: string[] }> {
    return Object.entries(NICHE_DATA)
        .filter(([, data]) => data.cpcLevel === 'very_high' || data.cpcLevel === 'high')
        .map(([niche, data]) => ({
            niche,
            cpcRange: data.cpcRange,
            keywords: data.keywords.slice(0, 5)
        }));
}
