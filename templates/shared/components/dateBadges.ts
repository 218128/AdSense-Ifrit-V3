/**
 * Date Badges Component Generator
 * Published/Modified date indicators for E-E-A-T
 */

/**
 * Generate Date Badges component
 */
export function generateDateBadges(): string {
    return `
// Date Badges Component - Shows publication and update dates
function DateBadges({ publishedDate, modifiedDate }: {
    publishedDate: string;
    modifiedDate?: string;
}) {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="date-badges">
            <div className="date-badge date-badge--published">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                </svg>
                <span>Published: {formatDate(publishedDate)}</span>
            </div>
            {modifiedDate && modifiedDate !== publishedDate && (
                <div className="date-badge date-badge--modified">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                    <span>Updated: {formatDate(modifiedDate)}</span>
                </div>
            )}
        </div>
    );
}`;
}

/**
 * Generate inline date badges for article header
 */
export function generateInlineDateBadges(): string {
    return `<div className="date-badges">
                <span className="date-badge date-badge--published">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                    </svg>
                    Published: {article.date}
                </span>
            </div>`;
}

/**
 * Generate Date Badges CSS
 */
export function generateDateBadgesStyles(): string {
    return `
/* Date Badges */
.date-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--color-text-muted);
}
.date-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
}
.date-badge svg {
    opacity: 0.7;
}
.date-badge--published {
    color: var(--color-text-muted);
}
.date-badge--modified {
    color: #059669;
}
`;
}
