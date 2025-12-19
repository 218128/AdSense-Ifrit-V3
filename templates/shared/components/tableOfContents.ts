/**
 * Table of Contents Component Generator
 * Generates sidebar TOC from markdown headings
 */

/**
 * Generate Table of Contents component
 */
export function generateTableOfContents(): string {
    return `
// Table of Contents Component
// Extracts headings from markdown and creates a navigable TOC
'use client';
import { useState, useEffect } from 'react';

interface TOCItem {
    id: string;
    text: string;
    level: number;
}

function TableOfContents({ content }: { content: string }) {
    const [headings, setHeadings] = useState<TOCItem[]>([]);
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        // Extract headings from markdown content
        const extractedHeadings: TOCItem[] = [];
        const headingRegex = /^(#{2,3})\\s+(.+)$/gm;
        let match;
        
        while ((match = headingRegex.exec(content)) !== null) {
            const level = match[1].length;
            const text = match[2].trim();
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            extractedHeadings.push({ id, text, level });
        }
        
        setHeadings(extractedHeadings);
    }, [content]);

    useEffect(() => {
        // Intersection Observer for active heading
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '-100px 0px -80% 0px' }
        );

        headings.forEach(({ id }) => {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [headings]);

    if (headings.length < 3) return null;

    return (
        <nav className="table-of-contents" aria-label="Table of contents">
            <h4>On This Page</h4>
            <ul>
                {headings.map(({ id, text, level }) => (
                    <li 
                        key={id} 
                        className={\`toc-item toc-item--\${level} \${activeId === id ? 'toc-item--active' : ''}\`}
                    >
                        <a href={\`#\${id}\`}>{text}</a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}`;
}

/**
 * Generate Table of Contents CSS
 */
export function generateTOCStyles(): string {
    return `
/* Table of Contents */
.table-of-contents {
    position: sticky;
    top: 2rem;
    padding: 1.5rem;
    background: var(--color-bg-alt);
    border-radius: 0.75rem;
    max-height: calc(100vh - 4rem);
    overflow-y: auto;
}
.table-of-contents h4 {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
}
.table-of-contents ul {
    list-style: none;
    margin: 0;
    padding: 0;
}
.toc-item {
    margin-bottom: 0.5rem;
}
.toc-item a {
    display: block;
    padding: 0.375rem 0;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-decoration: none;
    border-left: 2px solid transparent;
    padding-left: 0.75rem;
    transition: all 0.2s;
}
.toc-item a:hover {
    color: var(--color-primary);
}
.toc-item--3 a {
    padding-left: 1.5rem;
    font-size: 0.8125rem;
}
.toc-item--active a {
    color: var(--color-primary);
    border-left-color: var(--color-primary);
    font-weight: 500;
}
`;
}
