'use client';

/**
 * StreamingArticlePreview Component
 * 
 * V4 Feature: Real-time article generation preview
 * Uses Server-Sent Events (SSE) to display content as it streams
 */

import { useState, useEffect, useRef } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, Loader2, Copy, Check, Edit3 } from 'lucide-react';

interface StreamingArticlePreviewProps {
    keyword: string;
    context: string;
    onComplete?: (content: string) => void;
    onError?: (error: string) => void;
    onRefine?: (content: string) => void; // V4: Open RefineArticleModal
}

type StreamState = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

export default function StreamingArticlePreview({
    keyword,
    context,
    onComplete,
    onError,
    onRefine
}: StreamingArticlePreviewProps) {
    const [content, setContent] = useState('');
    const [state, setState] = useState<StreamState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [modelName, setModelName] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!keyword) return;

        startStreaming();

        return () => {
            // Cleanup happens through AbortController in startStreaming
        };
    }, [keyword, context]);

    const startStreaming = async () => {
        // Get API key and model from localStorage
        const geminiKeys = localStorage.getItem('ifrit_gemini_keys');
        const selectedModel = localStorage.getItem('ifrit_gemini_model');
        const geminiEnabled = localStorage.getItem('ifrit_gemini_enabled');

        // V4 Hard Rule: Validate before streaming
        if (geminiEnabled !== 'true') {
            setError('AI Provider is disabled. Enable Gemini in Settings.');
            setState('error');
            onError?.('AI Provider is disabled');
            return;
        }

        if (!selectedModel) {
            setError('Model not selected. Select a model in Settings/AI Providers.');
            setState('error');
            onError?.('Model not selected');
            return;
        }

        let apiKey = '';
        if (geminiKeys) {
            try {
                const keys = JSON.parse(geminiKeys);
                if (keys.length > 0) {
                    apiKey = keys[0].key;
                }
            } catch {
                // Ignore parse error
            }
        }

        if (!apiKey) {
            setError('No API key configured. Add a Gemini key in Settings.');
            setState('error');
            onError?.('No API key');
            return;
        }

        setState('connecting');
        setContent('');
        setModelName(selectedModel);

        try {
            const response = await fetch('/api/generate/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword,
                    context,
                    modelId: selectedModel,
                    apiKey
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Stream request failed');
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'start') {
                                setState('streaming');
                                setModelName(data.model);
                            } else if (data.type === 'chunk') {
                                accumulatedContent += data.text;
                                setContent(accumulatedContent);
                                // Auto-scroll to bottom
                                if (previewRef.current) {
                                    previewRef.current.scrollTop = previewRef.current.scrollHeight;
                                }
                            } else if (data.type === 'done') {
                                setState('complete');
                                onComplete?.(accumulatedContent);
                            } else if (data.type === 'error') {
                                throw new Error(data.error);
                            }
                        } catch (parseError) {
                            // Skip invalid JSON lines
                        }
                    }
                }
            }

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);
            setState('error');
            onError?.(errorMsg);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getStatusIndicator = () => {
        switch (state) {
            case 'connecting':
                return (
                    <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Connecting to AI...</span>
                    </div>
                );
            case 'streaming':
                return (
                    <div className="flex items-center gap-2 text-indigo-600">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span className="text-sm">
                            Generating with {modelName}...
                        </span>
                    </div>
                );
            case 'complete':
                return (
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">Generation complete!</span>
                    </div>
                );
            case 'error':
                return (
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{error}</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-neutral-100 border-b border-neutral-200">
                {getStatusIndicator()}
                {content && (
                    <div className="flex items-center gap-2">
                        {state === 'complete' && onRefine && (
                            <button
                                onClick={() => onRefine(content)}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 text-white border border-indigo-600 rounded hover:bg-indigo-700"
                            >
                                <Edit3 className="w-3 h-3" />
                                Refine
                            </button>
                        )}
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-neutral-200 rounded hover:bg-neutral-50"
                        >
                            {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                )}
            </div>

            {/* Preview Area */}
            <div
                ref={previewRef}
                className="flex-1 p-4 overflow-auto bg-white font-mono text-sm whitespace-pre-wrap"
                style={{ minHeight: '300px', maxHeight: '500px' }}
            >
                {content || (
                    <div className="text-neutral-400 italic">
                        Article content will appear here as it generates...
                    </div>
                )}
                {state === 'streaming' && (
                    <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1" />
                )}
            </div>

            {/* Word Count */}
            {content && (
                <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500">
                    {content.split(/\s+/).filter(w => w.length > 0).length} words
                </div>
            )}
        </div>
    );
}
