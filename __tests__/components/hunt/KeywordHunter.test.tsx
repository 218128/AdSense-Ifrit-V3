/**
 * KeywordHunter Component Tests
 * 
 * Tests for the main keyword hunting component that uses Zustand store
 * for state management.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Default mock store factory
const createMockStoreData = (overrides = {}) => ({
    // CSV keywords
    csvKeywords: [],
    addCSVKeywords: jest.fn(),
    clearCSVKeywords: jest.fn(),
    // Analysis
    analyzedKeywords: [],
    clearAnalyzedKeywords: jest.fn(),
    isAnalyzing: false,
    runAnalysis: jest.fn(),
    // Selection for keyword cards
    selectedKeywords: new Set<string>(),
    toggleSelect: jest.fn(),
    isSelected: jest.fn(() => false),
    clearSelection: jest.fn(),
    getSelectedCount: jest.fn(() => 0),
    // Selection for analyzed cards
    selectedAnalyzedIds: new Set<string>(),
    toggleAnalyzedSelect: jest.fn(),
    selectAllAnalyzed: jest.fn(),
    clearAnalyzedSelection: jest.fn(),
    isAnalyzedSelected: jest.fn(() => false),
    getSelectedAnalyzedCount: jest.fn(() => 0),
    getSelectedAnalyzedKeywords: jest.fn(() => []),
    // Save functionality
    saveCurrentAnalysis: jest.fn(),
    getEnrichedKeywords: jest.fn(() => []),
    savedAnalyses: [],
    deleteSavedAnalysis: jest.fn(),
    loadSavedAnalysis: jest.fn(),
    // History
    history: [],
    loadHistoryItem: jest.fn(),
    clearHistory: jest.fn(),
    // Computed & Status
    actionStatus: null,
    getAllKeywords: jest.fn(() => []),
    getEvergreenKeywords: jest.fn(() => []),
    // Research
    researchResults: {},
    addResearchResult: jest.fn(),
    ...overrides,
});

// Mock store state (mutable for tests)
let mockStoreData = createMockStoreData();

// Mock useKeywordStore to support both direct calls and selector patterns
jest.mock('@/stores/keywordStore', () => ({
    useKeywordStore: jest.fn((selector?: (state: unknown) => unknown) => {
        if (selector) {
            return selector(mockStoreData);
        }
        return mockStoreData;
    })
}));

jest.mock('@/stores/settingsStore', () => ({
    useSettingsStore: Object.assign(jest.fn(() => ({})), {
        getState: jest.fn(() => ({
            mcpServers: { apiKeys: {} },
            providerKeys: {}
        }))
    })
}));

// Import after mocking
import KeywordHunter from '@/components/hunt/subtabs/KeywordsNiches/features/KeywordHunter/KeywordHunter';
import { useKeywordStore } from '@/stores/keywordStore';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('KeywordHunter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
        // Reset mock store data to defaults
        mockStoreData = createMockStoreData();
    });

    describe('Rendering', () => {
        it('should render the component header', () => {
            render(<KeywordHunter />);
            expect(screen.getByText('Keyword Hunter')).toBeInTheDocument();
        });

        it('should show history button with count', () => {
            mockStoreData = createMockStoreData({
                history: [{ id: '1' }, { id: '2' }]
            });
            render(<KeywordHunter />);
            expect(screen.getByText(/History \(2\)/)).toBeInTheDocument();
        });

        it('should show empty state when no keywords', () => {
            render(<KeywordHunter />);
            expect(screen.getByText('No keywords yet')).toBeInTheDocument();
            expect(screen.getByText(/Import keywords from CSV/)).toBeInTheDocument();
        });

        it('should show evergreen keywords section', () => {
            mockStoreData = createMockStoreData({
                getEvergreenKeywords: jest.fn(() => [
                    { keyword: 'test1' },
                    { keyword: 'test2' }
                ])
            });
            render(<KeywordHunter />);
            expect(screen.getByText('Evergreen Keywords')).toBeInTheDocument();
            expect(screen.getByText(/2 high-CPC keywords/)).toBeInTheDocument();
        });
    });

    describe('Keyword Display', () => {
        it('should display all keywords when available', () => {
            const mockKeywords = [
                { keyword: 'best laptops 2024', source: 'csv', volume: 1000, competition: 'medium' },
                { keyword: 'cheap phones', source: 'evergreen', volume: 500, competition: 'low' }
            ];
            mockStoreData = createMockStoreData({
                getAllKeywords: jest.fn(() => mockKeywords)
            });
            render(<KeywordHunter />);
            expect(screen.getByText(/Select Keywords to Analyze/)).toBeInTheDocument();
            expect(screen.getByText(/2 available/)).toBeInTheDocument();
        });

        it('should show selection buttons when keywords are selected', () => {
            const mockKeywords = [{ keyword: 'test', source: 'csv' }];
            mockStoreData = createMockStoreData({
                getAllKeywords: jest.fn(() => mockKeywords),
                getSelectedCount: jest.fn(() => 2),
                selectedKeywords: new Set(['test1', 'test2'])
            });
            render(<KeywordHunter />);
            expect(screen.getByText(/Research \(2\)/)).toBeInTheDocument();
            expect(screen.getByText(/Analyze \(2\)/)).toBeInTheDocument();
        });
    });

    describe('Analysis Results', () => {
        it('should display analyzed keywords', () => {
            const analyzedKeywords = [
                {
                    keyword: 'test keyword',
                    source: 'csv',
                    analysis: {
                        niche: 'Technology',
                        estimatedCPC: '$2.50',
                        potential: 'high'
                    }
                }
            ];
            mockStoreData = createMockStoreData({ analyzedKeywords });
            render(<KeywordHunter />);
            expect(screen.getByText(/Analysis Results \(1\)/)).toBeInTheDocument();
        });

        it('should show Hunt Domains button when results exist and callback provided', () => {
            const analyzedKeywords = [
                { keyword: 'test', analysis: { niche: 'Tech', estimatedCPC: '$1' } }
            ];
            mockStoreData = createMockStoreData({ analyzedKeywords });
            const onNavigateToDomains = jest.fn();
            render(<KeywordHunter onNavigateToDomains={onNavigateToDomains} />);
            expect(screen.getByText('Hunt Domains')).toBeInTheDocument();
        });
    });

    describe('Interactions', () => {
        it('should toggle history panel when button clicked', () => {
            mockStoreData = createMockStoreData({
                history: [{ id: '1', keywords: [] }]
            });
            render(<KeywordHunter />);
            const historyButton = screen.getByText(/History/);
            fireEvent.click(historyButton);
            expect(historyButton).toBeInTheDocument();
        });

        it('should call clearCSVKeywords via CSVImporter', () => {
            const clearCSVKeywords = jest.fn();
            mockStoreData = createMockStoreData({
                csvKeywords: [{ keyword: 'test' }],
                clearCSVKeywords
            });
            render(<KeywordHunter />);
            expect(screen.getByText(/imported/i)).toBeInTheDocument();
        });

        it('should call onNavigateToDomains when Hunt Domains clicked', () => {
            const analyzedKeywords = [
                { keyword: 'kw1', analysis: { niche: 'Tech', estimatedCPC: '$1' } },
                { keyword: 'kw2', analysis: { niche: 'Finance', estimatedCPC: '$2' } }
            ];
            mockStoreData = createMockStoreData({ analyzedKeywords });
            const onNavigateToDomains = jest.fn();
            render(<KeywordHunter onNavigateToDomains={onNavigateToDomains} />);
            fireEvent.click(screen.getByText('Hunt Domains'));
            expect(onNavigateToDomains).toHaveBeenCalledWith(['kw1', 'kw2']);
        });
    });

    describe('Disabled State', () => {
        it('should disable analyze button when disabled prop is true', () => {
            const mockKeywords = [{ keyword: 'test', source: 'csv' }];
            mockStoreData = createMockStoreData({
                getAllKeywords: jest.fn(() => mockKeywords),
                getSelectedCount: jest.fn(() => 1),
                selectedKeywords: new Set(['test']),
                isAnalyzing: false
            });
            render(<KeywordHunter disabled={true} />);
            const buttons = screen.getAllByRole('button');
            const analyzeButton = buttons.find(btn => btn.textContent?.includes('Analyze'));
            expect(analyzeButton).toBeDisabled();
        });

        it('should disable research button when disabled prop is true', () => {
            const mockKeywords = [{ keyword: 'test', source: 'csv' }];
            mockStoreData = createMockStoreData({
                getAllKeywords: jest.fn(() => mockKeywords),
                getSelectedCount: jest.fn(() => 1),
                selectedKeywords: new Set(['test'])
            });
            render(<KeywordHunter disabled={true} />);
            const buttons = screen.getAllByRole('button');
            const researchButton = buttons.find(btn => btn.textContent?.includes('Research'));
            expect(researchButton).toBeDisabled();
        });
    });

    describe('Callbacks', () => {
        it('should render analysis results when onSelect is provided', () => {
            const analyzedKeywords = [
                {
                    keyword: 'test keyword',
                    source: 'csv',
                    analysis: {
                        niche: 'Technology',
                        estimatedCPC: '$2.50'
                    }
                }
            ];
            mockStoreData = createMockStoreData({ analyzedKeywords });
            const onSelect = jest.fn();
            render(<KeywordHunter onSelect={onSelect} />);
            expect(screen.getByText(/Analysis Results/)).toBeInTheDocument();
        });
    });
});
