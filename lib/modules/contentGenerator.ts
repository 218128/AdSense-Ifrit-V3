import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

export interface Article {
    title: string;
    body: string;
    keyword: string;
    slug: string;
}

export class ContentGenerator {
    private contentDir: string;

    constructor() {
        this.contentDir = path.join(process.cwd(), 'content');
    }

    async generate(keyword: string, context: string, apiKey: string): Promise<Article> {
        console.log(`Generating content for: ${keyword}`);

        if (!apiKey) {
            throw new Error("API Key is required for generation");
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            // Using Flash model as requested for free tier
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const today = new Date().toISOString().split('T')[0];

            const prompt = `
        You are an expert SEO content writer. Write a high-quality, E-E-A-T compliant article about "${keyword.replace(/-/g, " ")}".
        Context: ${context}
        
        Rules:
        1. Use Markdown formatting.
        2. Include a frontmatter block with title, date ("${today}"), and description.
        3. Structure with H1, H2, H3.
        4. Make it engaging, informative, and at least 800 words.
        5. Do NOT include any 'Here is the article' preamble. Start directly with ---.
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const body = response.text();

            // Basic parsing to extract title for object return
            const titleMatch = body.match(/^title: "([^"]+)"/m);
            const title = titleMatch ? titleMatch[1] : keyword;

            return {
                title,
                body,
                keyword,
                slug: keyword
            };

        } catch (error) {
            console.error("Gemini generation failed:", error);
            throw error;
        }
    }

    save(article: Article): void {
        if (!fs.existsSync(this.contentDir)) {
            fs.mkdirSync(this.contentDir, { recursive: true });
        }

        const filename = `${article.slug}.md`;
        const filepath = path.join(this.contentDir, filename);

        fs.writeFileSync(filepath, article.body, 'utf8');
        console.log(`Saved article to ${filepath}`);
    }

    exists(keyword: string): boolean {
        const filename = `${keyword}.md`;
        const filepath = path.join(this.contentDir, filename);
        return fs.existsSync(filepath);
    }
}
