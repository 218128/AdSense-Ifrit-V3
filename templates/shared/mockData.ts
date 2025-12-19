/**
 * Mock Data for Template Previews
 * 
 * Provides realistic sample content for previewing templates.
 */

export interface MockAuthor {
    name: string;
    role: string;
    bio: string;
    avatar: string;
    credentials: string[];
    social: {
        twitter?: string;
        linkedin?: string;
    };
}

export interface MockArticle {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImage: string;
    category: string;
    tags: string[];
    author: MockAuthor;
    publishedAt: string;
    updatedAt: string;
    readTime: number;
    wordCount: number;
}

export interface MockSiteInfo {
    name: string;
    tagline: string;
    domain: string;
    logo: string;
    niche: string;
    categories: string[];
}

// Sample Authors
export const MOCK_AUTHORS: MockAuthor[] = [
    {
        name: 'Sarah Mitchell',
        role: 'Senior Editor',
        bio: 'Sarah has over 10 years of experience in digital marketing and SEO. She helps businesses grow their online presence through data-driven strategies.',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        credentials: ['Google Analytics Certified', 'HubSpot Inbound Marketing'],
        social: {
            twitter: '@sarahmitchell',
            linkedin: 'sarahmitchell'
        }
    },
    {
        name: 'James Chen',
        role: 'Technology Writer',
        bio: 'James is a software engineer turned tech writer who breaks down complex topics into digestible content for beginners and experts alike.',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
        credentials: ['AWS Solutions Architect', 'Former Google Engineer'],
        social: {
            twitter: '@jameschen',
            linkedin: 'jameschen'
        }
    },
    {
        name: 'Emily Rodriguez',
        role: 'Health & Wellness Expert',
        bio: 'Emily is a certified nutritionist and fitness coach helping readers achieve their health goals through science-backed advice.',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
        credentials: ['Registered Dietitian', 'ACE Certified Personal Trainer'],
        social: {
            twitter: '@emilyfit',
            linkedin: 'emilyrodriguez'
        }
    }
];

// Sample Articles
export const MOCK_ARTICLES: MockArticle[] = [
    {
        slug: 'complete-guide-to-seo-2024',
        title: 'The Complete Guide to SEO in 2024: Everything You Need to Know',
        excerpt: 'Master the latest SEO strategies and tactics to rank higher on Google. From technical SEO to content optimization, this comprehensive guide covers it all.',
        content: `
## Introduction

Search Engine Optimization (SEO) continues to evolve at a rapid pace. In 2024, the focus has shifted towards user experience, helpful content, and E-E-A-T signals.

## Key Takeaways

- Focus on search intent, not just keywords
- Optimize for Core Web Vitals
- Build topical authority through pillar content
- Leverage AI tools responsibly

## Technical SEO Fundamentals

Before diving into content strategy, ensure your technical foundation is solid...

### Core Web Vitals

Google measures three key metrics:
- **LCP** (Largest Contentful Paint): Target under 2.5 seconds
- **INP** (Interaction to Next Paint): Target under 200ms
- **CLS** (Cumulative Layout Shift): Target under 0.1

## Content Strategy

Creating helpful, people-first content is more important than ever...
        `,
        coverImage: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800',
        category: 'SEO',
        tags: ['SEO', 'Digital Marketing', 'Google', 'Content Strategy'],
        author: MOCK_AUTHORS[0],
        publishedAt: '2024-01-15',
        updatedAt: '2024-03-20',
        readTime: 12,
        wordCount: 3200
    },
    {
        slug: 'ai-tools-for-content-creators',
        title: '10 Best AI Tools for Content Creators in 2024',
        excerpt: 'Discover the top AI tools that can supercharge your content creation workflow. From writing assistants to image generators.',
        content: `
## The AI Revolution in Content Creation

Artificial Intelligence has transformed how we create content. Here are the tools leading the charge...

## Top AI Writing Tools

1. **Claude** - Best for long-form content
2. **ChatGPT** - Versatile general-purpose assistant
3. **Jasper** - Marketing-focused writing

## Image Generation

AI image tools have become incredibly powerful...
        `,
        coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
        category: 'Technology',
        tags: ['AI', 'Tools', 'Content Creation', 'Productivity'],
        author: MOCK_AUTHORS[1],
        publishedAt: '2024-02-01',
        updatedAt: '2024-02-15',
        readTime: 8,
        wordCount: 2100
    },
    {
        slug: 'healthy-meal-prep-beginners',
        title: 'Meal Prep 101: A Beginner\'s Guide to Healthy Eating',
        excerpt: 'Learn how to save time and eat healthier with strategic meal preparation. Perfect for busy professionals.',
        content: `
## Why Meal Prep?

Meal prepping saves time, money, and helps you maintain a healthy diet...

## Getting Started

### Equipment You'll Need
- Quality food containers
- Sharp chef's knife
- Large cutting board

### Your First Week

Start simple with these beginner-friendly recipes...
        `,
        coverImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
        category: 'Health',
        tags: ['Health', 'Nutrition', 'Meal Prep', 'Cooking'],
        author: MOCK_AUTHORS[2],
        publishedAt: '2024-02-10',
        updatedAt: '2024-02-10',
        readTime: 6,
        wordCount: 1800
    },
    {
        slug: 'passive-income-strategies',
        title: '7 Proven Passive Income Strategies for 2024',
        excerpt: 'Build multiple income streams with these tested strategies. From digital products to investments.',
        content: `
## Building Wealth Through Passive Income

Passive income allows you to earn money while you sleep...

## Strategy 1: Content Monetization

Start a niche website and monetize with:
- Display advertising (AdSense)
- Affiliate marketing
- Digital products
        `,
        coverImage: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800',
        category: 'Finance',
        tags: ['Finance', 'Passive Income', 'Investing', 'Money'],
        author: MOCK_AUTHORS[0],
        publishedAt: '2024-01-25',
        updatedAt: '2024-03-01',
        readTime: 10,
        wordCount: 2800
    },
    {
        slug: 'remote-work-productivity',
        title: 'Remote Work Productivity: Tips from Top Performers',
        excerpt: 'Learn the habits and tools that help remote workers stay productive and maintain work-life balance.',
        content: `
## The Remote Work Revolution

Remote work has become the new normal for millions...

## Top Productivity Tips

1. Create a dedicated workspace
2. Establish clear boundaries
3. Use time-blocking techniques
        `,
        coverImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
        category: 'Productivity',
        tags: ['Remote Work', 'Productivity', 'Work Life Balance'],
        author: MOCK_AUTHORS[1],
        publishedAt: '2024-03-05',
        updatedAt: '2024-03-05',
        readTime: 7,
        wordCount: 1950
    }
];

// Sample Site Info
export const MOCK_SITE_INFO: MockSiteInfo = {
    name: 'TechInsights Pro',
    tagline: 'Your trusted source for technology and digital marketing insights',
    domain: 'techinsightspro.com',
    logo: '',
    niche: 'technology',
    categories: ['SEO', 'Technology', 'Health', 'Finance', 'Productivity']
};

// Helper to get featured article
export function getFeaturedArticle(): MockArticle {
    return MOCK_ARTICLES[0];
}

// Helper to get recent articles
export function getRecentArticles(count: number = 4): MockArticle[] {
    return MOCK_ARTICLES.slice(0, count);
}

// Helper to get articles by category
export function getArticlesByCategory(category: string): MockArticle[] {
    return MOCK_ARTICLES.filter(a => a.category === category);
}

// Helper to get related articles
export function getRelatedArticles(currentSlug: string, count: number = 3): MockArticle[] {
    return MOCK_ARTICLES.filter(a => a.slug !== currentSlug).slice(0, count);
}
