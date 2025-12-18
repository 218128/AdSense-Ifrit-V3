/**
 * Newsletter Signup Component Generator
 * Email collection form that stores to Ifrit
 */

export interface NewsletterConfig {
    siteUrl: string;
    siteName: string;
    placeholder?: string;
    buttonText?: string;
    successMessage?: string;
}

/**
 * Generate Newsletter Signup component
 */
export function generateNewsletter(config: NewsletterConfig): string {
    const { siteName, siteUrl, placeholder = 'Enter your email', buttonText = 'Subscribe', successMessage = 'Thanks for subscribing!' } = config;

    return `
// Newsletter Signup Component
'use client';
import { useState } from 'react';

function Newsletter() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email || !email.includes('@')) {
            setStatus('error');
            setMessage('Please enter a valid email address');
            return;
        }

        setStatus('loading');

        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                setStatus('success');
                setMessage('${successMessage}');
                setEmail('');
            } else {
                setStatus('error');
                setMessage('Something went wrong. Please try again.');
            }
        } catch {
            setStatus('error');
            setMessage('Something went wrong. Please try again.');
        }
    };

    return (
        <div className="newsletter">
            <div className="newsletter-content">
                <h3>Stay Updated</h3>
                <p>Get the latest articles delivered to your inbox.</p>
                
                {status === 'success' ? (
                    <div className="newsletter-success">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <span>{message}</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="newsletter-form">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="${placeholder}"
                            disabled={status === 'loading'}
                        />
                        <button type="submit" disabled={status === 'loading'}>
                            {status === 'loading' ? 'Subscribing...' : '${buttonText}'}
                        </button>
                    </form>
                )}
                
                {status === 'error' && (
                    <p className="newsletter-error">{message}</p>
                )}
            </div>
        </div>
    );
}`;
}

/**
 * Generate Newsletter API route (for generated sites)
 */
export function generateNewsletterAPI(domain: string): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();
        
        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { error: 'Invalid email' },
                { status: 400 }
            );
        }

        // Store subscriber in JSON file
        const dataDir = path.join(process.cwd(), 'data');
        const subscribersFile = path.join(dataDir, 'subscribers.json');
        
        // Ensure data directory exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Load existing subscribers
        let subscribers: Array<{ email: string; subscribedAt: string }> = [];
        if (fs.existsSync(subscribersFile)) {
            const data = fs.readFileSync(subscribersFile, 'utf-8');
            subscribers = JSON.parse(data);
        }

        // Check if already subscribed
        if (subscribers.some(s => s.email.toLowerCase() === email.toLowerCase())) {
            return NextResponse.json({ message: 'Already subscribed' });
        }

        // Add new subscriber
        subscribers.push({
            email,
            subscribedAt: new Date().toISOString()
        });

        // Save
        fs.writeFileSync(subscribersFile, JSON.stringify(subscribers, null, 2));

        return NextResponse.json({ message: 'Subscribed successfully' });
    } catch (error) {
        console.error('Newsletter error:', error);
        return NextResponse.json(
            { error: 'Failed to subscribe' },
            { status: 500 }
        );
    }
}`;
}

/**
 * Generate Newsletter CSS
 */
export function generateNewsletterStyles(): string {
    return `
/* Newsletter */
.newsletter {
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    border-radius: 1rem;
    padding: 2rem;
    margin: 2rem 0;
    color: white;
}
.newsletter-content {
    max-width: 500px;
    margin: 0 auto;
    text-align: center;
}
.newsletter h3 {
    color: white;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
}
.newsletter p {
    opacity: 0.9;
    margin-bottom: 1.5rem;
}
.newsletter-form {
    display: flex;
    gap: 0.5rem;
}
.newsletter-form input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
}
.newsletter-form input:focus {
    outline: 2px solid white;
}
.newsletter-form button {
    padding: 0.75rem 1.5rem;
    background: rgba(255,255,255,0.2);
    color: white;
    border: 2px solid white;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.newsletter-form button:hover {
    background: white;
    color: var(--color-primary);
}
.newsletter-form button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}
.newsletter-success {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(255,255,255,0.2);
    border-radius: 0.5rem;
}
.newsletter-error {
    color: #fca5a5;
    font-size: 0.875rem;
    margin-top: 0.5rem;
}

@media (max-width: 640px) {
    .newsletter-form {
        flex-direction: column;
    }
}
`;
}
