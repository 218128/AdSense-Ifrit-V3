import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDirectory = path.join(process.cwd(), 'content');

export interface ArticleMetadata {
    title: string;
    date: string;
    description: string;
    slug: string;
    author?: string;
    template?: string;
    schema?: string;
}

export interface Article extends ArticleMetadata {
    content: string;
}

export function getAllArticles(): Article[] {
    // Ensure directory exists
    if (!fs.existsSync(contentDirectory)) {
        return [];
    }

    const fileNames = fs.readdirSync(contentDirectory);
    const allArticlesData = fileNames.map((fileName) => {
        // Remove ".md" from file name to get slug
        const slug = fileName.replace(/\.md$/, '');

        // Read markdown file as string
        const fullPath = path.join(contentDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');

        // Use gray-matter to parse the post metadata section
        const matterResult = matter(fileContents);

        // Combine the data with the id
        return {
            slug,
            content: matterResult.content,
            ...(matterResult.data as { title: string; date: string; description: string }),
        };
    });

    // Sort posts by date
    return allArticlesData.sort((a, b) => {
        if (a.date < b.date) {
            return 1;
        } else {
            return -1;
        }
    });
}

export function getArticleBySlug(slug: string): Article | null {
    try {
        const fullPath = path.join(contentDirectory, `${slug}.md`);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const matterResult = matter(fileContents);

        return {
            slug,
            content: matterResult.content,
            ...(matterResult.data as { title: string; date: string; description: string }),
        };
    } catch (error) {
        console.error(`Failed to load article with slug "${slug}":`, error);
        return null;
    }
}
