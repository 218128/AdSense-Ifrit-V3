'use client';

/**
 * MediaLibraryPanel - View and Manage Persisted Media Assets
 * FSD: features/campaigns/components/MediaLibraryPanel.tsx
 * 
 * Displays all collected images from campaigns for review, selection, and A/B testing.
 */

import { useState, useMemo } from 'react';
import { Image, Grid, List, Filter, Check, Star, RefreshCw, Trash2, Download } from 'lucide-react';
import { useMediaAssetLibrary, type MediaAsset, type PostMediaLibrary } from '../lib/mediaAssetLibrary';

// ============================================================================
// Types
// ============================================================================

type SourceFilter = 'all' | 'ai' | 'unsplash' | 'pexels' | 'brave' | 'perplexity';
type StatusFilter = 'all' | 'used' | 'url' | 'uploaded' | 'archived';
type ViewMode = 'grid' | 'list';

// ============================================================================
// Component
// ============================================================================

export function MediaLibraryPanel() {
    const { libraries, getStats, selectCover, selectInline } = useMediaAssetLibrary();
    const stats = getStats();

    const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

    // Get library list sorted by date
    const libraryList = useMemo(() => {
        return Object.entries(libraries)
            .map(([key, lib]) => ({ key, ...lib }))
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [libraries]);

    // Currently displayed library
    const currentLibrary = selectedLibrary ? libraries[selectedLibrary] : null;

    // Filter assets
    const filteredAssets = useMemo(() => {
        if (!currentLibrary) return [];

        return currentLibrary.assets.filter(asset => {
            if (sourceFilter !== 'all' && asset.source !== sourceFilter) return false;
            if (statusFilter !== 'all' && asset.status !== statusFilter) return false;
            return true;
        });
    }, [currentLibrary, sourceFilter, statusFilter]);

    // Toggle asset selection
    const toggleAssetSelection = (assetId: string) => {
        setSelectedAssets(prev => {
            const next = new Set(prev);
            if (next.has(assetId)) {
                next.delete(assetId);
            } else {
                next.add(assetId);
            }
            return next;
        });
    };

    // Set as cover
    const handleSetAsCover = (assetId: string) => {
        if (currentLibrary && selectedLibrary) {
            const [campaignId, topic] = selectedLibrary.split(':');
            selectCover(campaignId, topic, assetId);
        }
    };

    // Set as inline
    const handleSetAsInline = () => {
        if (currentLibrary && selectedLibrary && selectedAssets.size > 0) {
            const [campaignId, topic] = selectedLibrary.split(':');
            const existingInline = currentLibrary.selectedInlineIds || [];
            const newInline = [...new Set([...existingInline, ...selectedAssets])].slice(0, 5);
            selectInline(campaignId, topic, newInline);
            setSelectedAssets(new Set());
        }
    };

    // Format date
    const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

    // ========================================================================
    // Render
    // ========================================================================

    if (Object.keys(libraries).length === 0) {
        return (
            <div className="media-library-empty">
                <Image size={48} strokeWidth={1} />
                <h3>No Media Assets Yet</h3>
                <p>Run a campaign with image generation enabled to collect media assets.</p>
                <style jsx>{`
                    .media-library-empty {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 80px 40px;
                        text-align: center;
                        color: var(--color-text-secondary);
                        gap: 16px;
                    }
                    h3 { margin: 0; color: var(--color-text-primary); }
                    p { margin: 0; max-width: 300px; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="media-library-panel">
            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stat">
                    <span className="stat-value">{stats.totalLibraries}</span>
                    <span className="stat-label">Posts</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{stats.totalAssets}</span>
                    <span className="stat-label">Assets</span>
                </div>
                {Object.entries(stats.bySource).slice(0, 4).map(([source, count]) => (
                    <div key={source} className="stat source-stat">
                        <span className="stat-value">{count}</span>
                        <span className="stat-label">{source}</span>
                    </div>
                ))}
            </div>

            <div className="library-content">
                {/* Library List Sidebar */}
                <div className="library-sidebar">
                    <h4>Collections</h4>
                    <div className="library-list">
                        {libraryList.map(lib => (
                            <button
                                key={lib.key}
                                className={`library-item ${selectedLibrary === lib.key ? 'active' : ''}`}
                                onClick={() => setSelectedLibrary(lib.key)}
                            >
                                <div className="library-info">
                                    <span className="library-topic">{lib.topic.slice(0, 40)}...</span>
                                    <span className="library-meta">
                                        {lib.assets.length} images • {formatDate(lib.createdAt)}
                                    </span>
                                </div>
                                {lib.postId && <Check size={14} className="linked-icon" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="library-main">
                    {currentLibrary ? (
                        <>
                            {/* Toolbar */}
                            <div className="library-toolbar">
                                <div className="filter-group">
                                    <Filter size={14} />
                                    <select
                                        value={sourceFilter}
                                        onChange={e => setSourceFilter(e.target.value as SourceFilter)}
                                    >
                                        <option value="all">All Sources</option>
                                        <option value="ai">AI Generated</option>
                                        <option value="unsplash">Unsplash</option>
                                        <option value="pexels">Pexels</option>
                                        <option value="brave">Brave Search</option>
                                        <option value="perplexity">Perplexity</option>
                                    </select>
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="used">In Use</option>
                                        <option value="url">Available</option>
                                        <option value="uploaded">Uploaded</option>
                                    </select>
                                </div>

                                <div className="view-toggle">
                                    <button
                                        className={viewMode === 'grid' ? 'active' : ''}
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <Grid size={16} />
                                    </button>
                                    <button
                                        className={viewMode === 'list' ? 'active' : ''}
                                        onClick={() => setViewMode('list')}
                                    >
                                        <List size={16} />
                                    </button>
                                </div>

                                {selectedAssets.size > 0 && (
                                    <div className="bulk-actions">
                                        <button onClick={handleSetAsInline} className="action-btn">
                                            <Image size={14} />
                                            Set as Inline ({selectedAssets.size})
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Asset Grid/List */}
                            <div className={`asset-container ${viewMode}`}>
                                {filteredAssets.map(asset => (
                                    <AssetCard
                                        key={asset.id}
                                        asset={asset}
                                        isSelected={selectedAssets.has(asset.id)}
                                        isCover={currentLibrary.selectedCoverId === asset.id}
                                        isInline={currentLibrary.selectedInlineIds.includes(asset.id)}
                                        onToggleSelect={() => toggleAssetSelection(asset.id)}
                                        onSetAsCover={() => handleSetAsCover(asset.id)}
                                        viewMode={viewMode}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="select-library-prompt">
                            <Image size={32} />
                            <p>Select a collection to view assets</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .media-library-panel {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: var(--color-background);
                }
                
                .stats-bar {
                    display: flex;
                    gap: 24px;
                    padding: 16px 24px;
                    background: var(--color-surface);
                    border-bottom: 1px solid var(--color-border);
                }
                
                .stat {
                    display: flex;
                    flex-direction: column;
                }
                
                .stat-value {
                    font-size: 20px;
                    font-weight: 600;
                    color: var(--color-text-primary);
                }
                
                .stat-label {
                    font-size: 11px;
                    color: var(--color-text-secondary);
                    text-transform: uppercase;
                }
                
                .source-stat .stat-label {
                    text-transform: capitalize;
                }
                
                .library-content {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                }
                
                .library-sidebar {
                    width: 280px;
                    border-right: 1px solid var(--color-border);
                    display: flex;
                    flex-direction: column;
                }
                
                .library-sidebar h4 {
                    margin: 0;
                    padding: 16px;
                    font-size: 12px;
                    text-transform: uppercase;
                    color: var(--color-text-secondary);
                    border-bottom: 1px solid var(--color-border);
                }
                
                .library-list {
                    flex: 1;
                    overflow-y: auto;
                }
                
                .library-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    text-align: left;
                    border-bottom: 1px solid var(--color-border);
                    transition: background 0.15s;
                }
                
                .library-item:hover {
                    background: var(--color-surface-hover);
                }
                
                .library-item.active {
                    background: var(--color-primary-subtle);
                }
                
                .library-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .library-topic {
                    font-size: 13px;
                    color: var(--color-text-primary);
                    font-weight: 500;
                }
                
                .library-meta {
                    font-size: 11px;
                    color: var(--color-text-secondary);
                }
                
                .linked-icon {
                    color: var(--color-success);
                }
                
                .library-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                .library-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 12px 16px;
                    background: var(--color-surface);
                    border-bottom: 1px solid var(--color-border);
                }
                
                .filter-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--color-text-secondary);
                }
                
                .filter-group select {
                    padding: 6px 12px;
                    border: 1px solid var(--color-border);
                    border-radius: 6px;
                    background: var(--color-background);
                    color: var(--color-text-primary);
                    font-size: 12px;
                }
                
                .view-toggle {
                    display: flex;
                    gap: 4px;
                    margin-left: auto;
                }
                
                .view-toggle button {
                    padding: 6px 10px;
                    border: 1px solid var(--color-border);
                    background: var(--color-background);
                    cursor: pointer;
                    color: var(--color-text-secondary);
                    border-radius: 6px;
                }
                
                .view-toggle button.active {
                    background: var(--color-primary);
                    color: white;
                    border-color: var(--color-primary);
                }
                
                .bulk-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .action-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border: 1px solid var(--color-primary);
                    background: var(--color-primary-subtle);
                    color: var(--color-primary);
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .asset-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                }
                
                .asset-container.grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 16px;
                    align-content: start;
                }
                
                .asset-container.list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .select-library-prompt {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--color-text-secondary);
                    gap: 12px;
                }
            `}</style>
        </div>
    );
}

// ============================================================================
// Asset Card Sub-component
// ============================================================================

interface AssetCardProps {
    asset: MediaAsset;
    isSelected: boolean;
    isCover: boolean;
    isInline: boolean;
    onToggleSelect: () => void;
    onSetAsCover: () => void;
    viewMode: ViewMode;
}

function AssetCard({
    asset,
    isSelected,
    isCover,
    isInline,
    onToggleSelect,
    onSetAsCover,
    viewMode
}: AssetCardProps) {
    const sourceColors: Record<string, string> = {
        ai: '#8b5cf6',
        unsplash: '#000000',
        pexels: '#05a081',
        brave: '#fb542b',
        perplexity: '#20808d',
    };

    if (viewMode === 'list') {
        return (
            <div className={`asset-list-item ${isSelected ? 'selected' : ''}`}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggleSelect}
                />
                <img src={asset.url} alt={asset.alt} className="thumbnail" />
                <div className="asset-info">
                    <span className="asset-alt">{asset.alt.slice(0, 60)}...</span>
                    <span className="asset-meta">
                        <span className="source-badge" style={{ background: sourceColors[asset.source] }}>
                            {asset.source}
                        </span>
                        <span>Score: {asset.score}</span>
                        {asset.photographer && <span>by {asset.photographer}</span>}
                    </span>
                </div>
                <div className="asset-badges">
                    {isCover && <span className="badge cover">Cover</span>}
                    {isInline && <span className="badge inline">Inline</span>}
                </div>
                <button className="set-cover-btn" onClick={onSetAsCover} title="Set as Cover">
                    <Star size={14} fill={isCover ? 'currentColor' : 'none'} />
                </button>
                <style jsx>{`
                    .asset-list-item {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 10px 12px;
                        background: var(--color-surface);
                        border: 1px solid var(--color-border);
                        border-radius: 8px;
                    }
                    .asset-list-item.selected {
                        border-color: var(--color-primary);
                        background: var(--color-primary-subtle);
                    }
                    .thumbnail {
                        width: 60px;
                        height: 40px;
                        object-fit: cover;
                        border-radius: 4px;
                    }
                    .asset-info {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .asset-alt {
                        font-size: 13px;
                        color: var(--color-text-primary);
                    }
                    .asset-meta {
                        display: flex;
                        gap: 8px;
                        font-size: 11px;
                        color: var(--color-text-secondary);
                        align-items: center;
                    }
                    .source-badge {
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 10px;
                        color: white;
                        text-transform: uppercase;
                    }
                    .asset-badges {
                        display: flex;
                        gap: 4px;
                    }
                    .badge {
                        padding: 2px 8px;
                        border-radius: 4px;
                        font-size: 10px;
                        font-weight: 600;
                    }
                    .badge.cover {
                        background: var(--color-warning-subtle);
                        color: var(--color-warning);
                    }
                    .badge.inline {
                        background: var(--color-success-subtle);
                        color: var(--color-success);
                    }
                    .set-cover-btn {
                        padding: 6px;
                        border: 1px solid var(--color-border);
                        background: var(--color-background);
                        border-radius: 6px;
                        cursor: pointer;
                        color: var(--color-warning);
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className={`asset-card ${isSelected ? 'selected' : ''}`} onClick={onToggleSelect}>
            <div className="image-container">
                <img src={asset.url} alt={asset.alt} />
                <div className="hover-overlay">
                    <button onClick={(e) => { e.stopPropagation(); onSetAsCover(); }}>
                        <Star size={16} fill={isCover ? 'currentColor' : 'none'} />
                        {isCover ? 'Cover' : 'Set Cover'}
                    </button>
                </div>
                {(isCover || isInline) && (
                    <div className="usage-badge">
                        {isCover ? '⭐ Cover' : '📍 Inline'}
                    </div>
                )}
            </div>
            <div className="card-footer">
                <span className="source-dot" style={{ background: sourceColors[asset.source] }} title={asset.source} />
                <span className="score">{asset.score}</span>
                {isSelected && <Check size={14} className="check-icon" />}
            </div>
            <style jsx>{`
                .asset-card {
                    background: var(--color-surface);
                    border: 2px solid var(--color-border);
                    border-radius: 10px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .asset-card:hover {
                    border-color: var(--color-primary);
                    transform: translateY(-2px);
                }
                .asset-card.selected {
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 2px var(--color-primary-subtle);
                }
                .image-container {
                    position: relative;
                    aspect-ratio: 16/10;
                    overflow: hidden;
                }
                .image-container img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .hover-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.15s;
                }
                .asset-card:hover .hover-overlay {
                    opacity: 1;
                }
                .hover-overlay button {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 16px;
                    background: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    color: var(--color-warning);
                }
                .usage-badge {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    padding: 4px 8px;
                    background: rgba(0,0,0,0.7);
                    color: white;
                    font-size: 10px;
                    border-radius: 4px;
                }
                .card-footer {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 10px;
                }
                .source-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                .score {
                    font-size: 12px;
                    color: var(--color-text-secondary);
                }
                .check-icon {
                    margin-left: auto;
                    color: var(--color-primary);
                }
            `}</style>
        </div>
    );
}

export default MediaLibraryPanel;
