'use client';

/**
 * Site Preview Component
 * 
 * Real-time preview of site templates with customization options.
 * Shows how the generated site will look before deployment.
 */

import { useState, useMemo } from 'react';
import {
    Monitor,
    Smartphone,
    Tablet,
    Sun,
    Moon,
    RefreshCw,
    Eye,
    EyeOff,
    Maximize2,
    X
} from 'lucide-react';

export type TemplateType = 'niche-authority' | 'topical-magazine' | 'expert-hub';
export type DeviceType = 'desktop' | 'tablet' | 'mobile';
export type ThemeType = 'light' | 'dark';

export interface SitePreviewConfig {
    siteName: string;
    tagline: string;
    template: TemplateType;
    primaryColor: string;
    secondaryColor: string;
    author: {
        name: string;
        role: string;
    };
    showEEATBadges?: boolean;
}

interface SitePreviewProps {
    config: SitePreviewConfig;
    fullscreen?: boolean;
    onClose?: () => void;
}

// Template color schemes
const TEMPLATE_COLORS: Record<TemplateType, { primary: string; secondary: string; accent: string }> = {
    'niche-authority': {
        primary: '#1e40af',   // Blue-800
        secondary: '#3b82f6', // Blue-500
        accent: '#dbeafe'     // Blue-100
    },
    'topical-magazine': {
        primary: '#db2777',   // Pink-600
        secondary: '#8b5cf6', // Violet-500
        accent: '#fce7f3'     // Pink-100
    },
    'expert-hub': {
        primary: '#0f172a',   // Slate-900
        secondary: '#0ea5e9', // Sky-500
        accent: '#f1f5f9'     // Slate-100
    }
};

// Sample article data for preview
const SAMPLE_ARTICLES = [
    {
        title: 'Complete Guide to Getting Started',
        description: 'Everything you need to know to begin your journey in this field.',
        date: '2024-12-15',
        category: 'Getting Started',
        eeatBadges: ['✅ Tested', '💡 Expert Tips']
    },
    {
        title: 'Top 10 Mistakes to Avoid',
        description: 'Learn from common pitfalls and save yourself time and money.',
        date: '2024-12-14',
        category: 'Best Practices',
        eeatBadges: ['📊 Data-Backed', '🔗 Sources Cited']
    },
    {
        title: 'Advanced Strategies for Experts',
        description: 'Take your skills to the next level with these proven techniques.',
        date: '2024-12-13',
        category: 'Advanced',
        eeatBadges: ['🏛️ Definitive Guide', '👤 Expert Author']
    }
];

export function SitePreview({ config, fullscreen = false, onClose }: SitePreviewProps) {
    const [device, setDevice] = useState<DeviceType>('desktop');
    const [theme, setTheme] = useState<ThemeType>('light');
    const [showGrid, setShowGrid] = useState(false);

    // Get colors based on template or custom
    const colors = useMemo(() => {
        const templateColors = TEMPLATE_COLORS[config.template];
        return {
            primary: config.primaryColor || templateColors.primary,
            secondary: config.secondaryColor || templateColors.secondary,
            accent: templateColors.accent
        };
    }, [config.template, config.primaryColor, config.secondaryColor]);

    // Device frame dimensions
    const deviceDimensions = {
        desktop: { width: '100%', maxWidth: '1200px' },
        tablet: { width: '768px', maxWidth: '768px' },
        mobile: { width: '375px', maxWidth: '375px' }
    };

    const containerStyle = fullscreen ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: '#000',
        display: 'flex',
        flexDirection: 'column' as const
    } : {};

    return (
        <div style={containerStyle}>
            {/* Preview Controls */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: '#1f2937',
                borderBottom: '1px solid #374151'
            }}>
                {/* Device Selector */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setDevice('desktop')}
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            background: device === 'desktop' ? '#3b82f6' : 'transparent',
                            color: device === 'desktop' ? 'white' : '#9ca3af',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                        title="Desktop view"
                    >
                        <Monitor size={18} />
                    </button>
                    <button
                        onClick={() => setDevice('tablet')}
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            background: device === 'tablet' ? '#3b82f6' : 'transparent',
                            color: device === 'tablet' ? 'white' : '#9ca3af',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                        title="Tablet view"
                    >
                        <Tablet size={18} />
                    </button>
                    <button
                        onClick={() => setDevice('mobile')}
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            background: device === 'mobile' ? '#3b82f6' : 'transparent',
                            color: device === 'mobile' ? 'white' : '#9ca3af',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                        title="Mobile view"
                    >
                        <Smartphone size={18} />
                    </button>
                </div>

                {/* Template Info */}
                <div style={{
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Eye size={14} />
                    <span>{config.template.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                </div>

                {/* Theme & Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            background: 'transparent',
                            color: '#9ca3af',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                    <button
                        onClick={() => setShowGrid(!showGrid)}
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            background: showGrid ? '#3b82f6' : 'transparent',
                            color: showGrid ? 'white' : '#9ca3af',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Toggle grid overlay"
                    >
                        <Maximize2 size={18} />
                    </button>
                    {fullscreen && onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Close preview"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Preview Frame */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                background: '#111827',
                display: 'flex',
                justifyContent: 'center',
                padding: fullscreen ? '2rem' : '1rem'
            }}>
                <div style={{
                    width: deviceDimensions[device].width,
                    maxWidth: deviceDimensions[device].maxWidth,
                    background: theme === 'light' ? '#ffffff' : '#0f172a',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '1px solid #374151',
                    position: 'relative'
                }}>
                    {/* Grid Overlay */}
                    {showGrid && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                            pointerEvents: 'none',
                            zIndex: 10
                        }} />
                    )}

                    {/* Template Preview */}
                    {config.template === 'niche-authority' && (
                        <NicheAuthorityPreview
                            config={config}
                            colors={colors}
                            theme={theme}
                            device={device}
                        />
                    )}
                    {config.template === 'topical-magazine' && (
                        <TopicalMagazinePreview
                            config={config}
                            colors={colors}
                            theme={theme}
                            device={device}
                        />
                    )}
                    {config.template === 'expert-hub' && (
                        <ExpertHubPreview
                            config={config}
                            colors={colors}
                            theme={theme}
                            device={device}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// TEMPLATE PREVIEWS
// ============================================

interface TemplatePreviewProps {
    config: SitePreviewConfig;
    colors: { primary: string; secondary: string; accent: string };
    theme: ThemeType;
    device: DeviceType;
}

function NicheAuthorityPreview({ config, colors, theme, device }: TemplatePreviewProps) {
    const isDark = theme === 'dark';
    const isMobile = device === 'mobile';

    return (
        <div style={{ minHeight: '600px' }}>
            {/* Header */}
            <header style={{
                background: isDark ? '#1e293b' : '#ffffff',
                borderBottom: `3px solid ${colors.primary}`,
                padding: isMobile ? '1rem' : '1.5rem 2rem'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    justifyContent: 'space-between',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: '1rem'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: isMobile ? '1.25rem' : '1.5rem',
                            fontWeight: 800,
                            color: colors.primary,
                            margin: 0
                        }}>
                            {config.siteName}
                        </h1>
                        <p style={{
                            fontSize: '0.875rem',
                            color: isDark ? '#94a3b8' : '#64748b',
                            margin: '0.25rem 0 0'
                        }}>
                            {config.tagline}
                        </p>
                    </div>
                    <nav style={{
                        display: 'flex',
                        gap: '1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 500
                    }}>
                        <span style={{ color: colors.secondary }}>Home</span>
                        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Articles</span>
                        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>About</span>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                padding: isMobile ? '2rem 1rem' : '3rem 2rem',
                color: 'white',
                textAlign: 'center'
            }}>
                <h2 style={{
                    fontSize: isMobile ? '1.5rem' : '2rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem'
                }}>
                    Expert {config.tagline}
                </h2>
                <p style={{ opacity: 0.9, maxWidth: '500px', margin: '0 auto' }}>
                    Trusted insights from industry professionals
                </p>
            </section>

            {/* Articles */}
            <section style={{ padding: isMobile ? '1.5rem 1rem' : '2rem' }}>
                <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    marginBottom: '1rem',
                    borderLeft: `4px solid ${colors.secondary}`,
                    paddingLeft: '0.75rem'
                }}>
                    Latest Articles
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {SAMPLE_ARTICLES.map((article, i) => (
                        <article key={i} style={{
                            padding: '1rem',
                            background: isDark ? '#1e293b' : '#ffffff',
                            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                            borderRadius: '0.5rem',
                            borderLeft: `3px solid ${colors.secondary}`
                        }}>
                            <h4 style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: isDark ? '#f1f5f9' : '#0f172a',
                                marginBottom: '0.5rem'
                            }}>
                                {article.title}
                            </h4>
                            <p style={{
                                fontSize: '0.875rem',
                                color: isDark ? '#94a3b8' : '#64748b',
                                marginBottom: '0.5rem'
                            }}>
                                {article.description}
                            </p>
                            {config.showEEATBadges && (
                                <div style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap',
                                    marginTop: '0.5rem'
                                }}>
                                    {article.eeatBadges.map((badge, j) => (
                                        <span key={j} style={{
                                            fontSize: '0.75rem',
                                            background: colors.accent,
                                            color: colors.primary,
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '9999px'
                                        }}>
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

function TopicalMagazinePreview({ config, colors, theme, device }: TemplatePreviewProps) {
    const isDark = theme === 'dark';
    const isMobile = device === 'mobile';

    return (
        <div style={{ minHeight: '600px' }}>
            {/* Header */}
            <header style={{
                borderBottom: `4px solid ${colors.primary}`,
                padding: isMobile ? '1.5rem 1rem' : '2rem',
                textAlign: 'center',
                background: isDark ? '#0f172a' : '#ffffff'
            }}>
                <h1 style={{
                    fontSize: isMobile ? '2rem' : '2.5rem',
                    fontWeight: 900,
                    background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: 0
                }}>
                    {config.siteName}
                </h1>
                <p style={{
                    fontFamily: 'serif',
                    fontStyle: 'italic',
                    color: isDark ? '#94a3b8' : '#6b7280',
                    marginTop: '0.5rem'
                }}>
                    {config.tagline}
                </p>
            </header>

            {/* Featured Article */}
            <section style={{
                display: isMobile ? 'block' : 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
                gap: '2rem',
                padding: isMobile ? '1rem' : '2rem',
                background: isDark ? '#1e293b' : '#f3f4f6'
            }}>
                <div style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                    borderRadius: '0.5rem',
                    height: isMobile ? '200px' : '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '3rem'
                }}>
                    ★
                </div>
                <div style={{
                    padding: isMobile ? '1rem 0' : '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <span style={{
                        color: colors.primary,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: '0.75rem'
                    }}>
                        Featured Story
                    </span>
                    <h2 style={{
                        fontSize: isMobile ? '1.25rem' : '1.5rem',
                        fontWeight: 700,
                        color: isDark ? '#f1f5f9' : '#111827',
                        margin: '0.5rem 0'
                    }}>
                        {SAMPLE_ARTICLES[0].title}
                    </h2>
                    <p style={{
                        color: isDark ? '#94a3b8' : '#6b7280',
                        fontSize: '0.875rem'
                    }}>
                        {SAMPLE_ARTICLES[0].description}
                    </p>
                </div>
            </section>

            {/* Article Grid */}
            <section style={{ padding: isMobile ? '1rem' : '2rem' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '1.5rem'
                }}>
                    {SAMPLE_ARTICLES.slice(1).map((article, i) => (
                        <article key={i} style={{
                            background: isDark ? '#1e293b' : '#ffffff',
                            borderRadius: '0.5rem',
                            overflow: 'hidden',
                            border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`
                        }}>
                            <div style={{
                                height: '120px',
                                background: isDark ? '#374151' : '#f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                color: isDark ? '#6b7280' : '#9ca3af'
                            }}>
                                📄
                            </div>
                            <div style={{ padding: '1rem' }}>
                                <span style={{
                                    color: colors.primary,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase'
                                }}>
                                    {article.category}
                                </span>
                                <h3 style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: isDark ? '#f1f5f9' : '#111827',
                                    margin: '0.25rem 0'
                                }}>
                                    {article.title}
                                </h3>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

function ExpertHubPreview({ config, colors, theme, device }: TemplatePreviewProps) {
    const isDark = theme === 'dark';
    const isMobile = device === 'mobile';

    return (
        <div style={{ minHeight: '600px', background: isDark ? '#0f172a' : '#f8fafc' }}>
            {/* Header */}
            <header style={{
                background: isDark ? '#1e293b' : '#ffffff',
                borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                padding: isMobile ? '1rem' : '1.5rem 2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            background: colors.secondary,
                            borderRadius: '4px'
                        }} />
                        <span style={{
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: colors.primary
                        }}>
                            {config.siteName}
                        </span>
                    </div>
                    <nav style={{
                        display: 'flex',
                        gap: '1.5rem',
                        fontSize: '0.875rem',
                        color: isDark ? '#94a3b8' : '#64748b'
                    }}>
                        <span>Insights</span>
                        <span>Expertise</span>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section style={{
                background: colors.primary,
                color: 'white',
                padding: isMobile ? '2rem 1rem' : '3rem 2rem',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: isMobile ? '1.75rem' : '2.5rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem'
                }}>
                    {config.siteName}
                </h1>
                <p style={{
                    color: '#94a3b8',
                    maxWidth: '500px',
                    margin: '0 auto'
                }}>
                    {config.tagline}
                </p>
            </section>

            {/* Articles */}
            <section style={{ padding: isMobile ? '1.5rem 1rem' : '2rem' }}>
                <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    marginBottom: '1rem',
                    borderLeft: `4px solid ${colors.secondary}`,
                    paddingLeft: '0.75rem'
                }}>
                    Latest Analysis
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '1rem'
                }}>
                    {SAMPLE_ARTICLES.map((article, i) => (
                        <article key={i} style={{
                            padding: '1.25rem',
                            background: isDark ? '#1e293b' : '#ffffff',
                            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                            borderRadius: '0.5rem',
                            transition: 'box-shadow 0.2s'
                        }}>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: isDark ? '#f1f5f9' : '#0f172a',
                                marginBottom: '0.5rem'
                            }}>
                                {article.title}
                            </h3>
                            <p style={{
                                fontSize: '0.875rem',
                                color: isDark ? '#94a3b8' : '#475569',
                                marginBottom: '0.75rem'
                            }}>
                                {article.description}
                            </p>
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                fontSize: '0.75rem',
                                color: isDark ? '#64748b' : '#94a3b8'
                            }}>
                                <span>📅 {article.date}</span>
                                <span>👤 {config.author.name}</span>
                            </div>
                            {config.showEEATBadges && (
                                <div style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap',
                                    marginTop: '0.75rem'
                                }}>
                                    {article.eeatBadges.map((badge, j) => (
                                        <span key={j} style={{
                                            fontSize: '0.7rem',
                                            background: isDark ? '#1e3a5f' : colors.accent,
                                            color: colors.secondary,
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '9999px'
                                        }}>
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

export default SitePreview;
