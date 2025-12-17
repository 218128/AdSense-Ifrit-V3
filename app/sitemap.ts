import { MetadataRoute } from 'next';
import { getAllArticles } from '@/lib/content';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

    const articles = getAllArticles();

    // Generate article URLs
    const articleUrls: MetadataRoute.Sitemap = articles.map(article => ({
        url: `${baseUrl}/${article.slug}`,
        lastModified: new Date(article.date),
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        ...articleUrls,
    ];
}
