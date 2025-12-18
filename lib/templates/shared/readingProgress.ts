/**
 * Reading Progress Bar Component Generator
 * Shows reading progress as user scrolls
 */

/**
 * Generate Reading Progress component
 */
export function generateReadingProgress(): string {
    return `
// Reading Progress Bar Component
'use client';
import { useState, useEffect } from 'react';

function ReadingProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const updateProgress = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            setProgress(Math.min(100, Math.max(0, scrollProgress)));
        };

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();

        return () => window.removeEventListener('scroll', updateProgress);
    }, []);

    return (
        <div className="reading-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="reading-progress-bar" style={{ width: \`\${progress}%\` }} />
        </div>
    );
}`;
}

/**
 * Generate Reading Progress CSS
 */
export function generateReadingProgressStyles(): string {
    return `
/* Reading Progress Bar */
.reading-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--color-border);
    z-index: 9999;
}
.reading-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    transition: width 0.1s ease-out;
}
`;
}

/**
 * Generate Reading Time calculator
 */
export function generateReadingTime(): string {
    return `
// Calculate reading time for an article
function calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\\s+/).length;
    return Math.ceil(words / wordsPerMinute);
}`;
}
