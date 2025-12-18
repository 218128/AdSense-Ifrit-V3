'use client';

/**
 * RefineArticleModal
 * 
 * V4 Feature: Chat-based article refinement
 * Uses ai.chats for conversational editing:
 * - "Make the intro more engaging"
 * - "Add more examples to section 2"
 * - "Remove the first FAQ"
 * - "Make it more concise"
 */

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, RefreshCw, Sparkles, Copy, Check, MessageSquare } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface RefineArticleModalProps {
    articleContent: string;
    articleTitle: string;
    onClose: () => void;
    onSave: (content: string) => void;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

const REFINEMENT_SUGGESTIONS = [
    '✨ Make the intro more engaging',
    '📝 Add more examples',
    '🔍 Improve SEO structure',
    '✂️ Make it more concise',
    '💡 Add actionable tips',
    '❓ Expand the FAQ section',
];

export default function RefineArticleModal({
    articleContent,
    articleTitle,
    onClose,
    onSave
}: RefineArticleModalProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentContent, setCurrentContent] = useState(articleContent);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<ReturnType<InstanceType<typeof GoogleGenAI>['chats']['create']> | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const initializeChat = async () => {
        // Get API key and model
        const geminiKeys = localStorage.getItem('ifrit_gemini_keys');
        const selectedModel = localStorage.getItem('ifrit_gemini_model');
        const geminiEnabled = localStorage.getItem('ifrit_gemini_enabled');

        if (geminiEnabled !== 'true') {
            setError('AI Provider is disabled. Enable Gemini in Settings.');
            return null;
        }

        if (!selectedModel) {
            setError('Model not selected. Select a model in Settings/AI Providers.');
            return null;
        }

        let apiKey = '';
        if (geminiKeys) {
            try {
                const keys = JSON.parse(geminiKeys);
                if (keys.length > 0) {
                    apiKey = keys[0].key;
                }
            } catch {
                // Ignore
            }
        }

        if (!apiKey) {
            setError('No API key configured. Add a Gemini key in Settings.');
            return null;
        }

        const ai = new GoogleGenAI({ apiKey });

        // Create chat with system context
        const chat = ai.chats.create({
            model: selectedModel,
            history: [
                {
                    role: 'user',
                    parts: [{
                        text: `You are an article editor assistant. I'll share an article and ask you to refine specific parts. When making changes:
1. Keep the same markdown format
2. Preserve frontmatter (---)
3. Only modify what I request
4. Return the full updated article after each change

Here's the article to edit:

${articleContent}`
                    }]
                },
                {
                    role: 'model',
                    parts: [{
                        text: `I've reviewed the article "${articleTitle}". I'm ready to help you refine it. You can ask me to:

• Make sections more engaging
• Add or remove content
• Improve SEO structure
• Make text more concise
• Add examples or tips
• Expand the FAQ section

What would you like me to change?` }]
                }
            ]
        });

        return chat;
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        setInput('');
        setError(null);
        setLoading(true);

        // Add user message
        const userMessage: ChatMessage = {
            role: 'user',
            text: text.trim(),
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            // Initialize chat if not already
            if (!chatRef.current) {
                const chat = await initializeChat();
                if (!chat) {
                    setLoading(false);
                    return;
                }
                chatRef.current = chat;
            }

            // Send message and get response
            const response = await chatRef.current.sendMessage({
                message: text.trim()
            });

            const responseText = response.text || 'No response received';

            // Check if response contains updated article (has frontmatter)
            if (responseText.includes('---')) {
                // Extract just the article content (find first --- block)
                const articleMatch = responseText.match(/---[\s\S]*?---[\s\S]*/);
                if (articleMatch) {
                    setCurrentContent(articleMatch[0]);
                }
            }

            const modelMessage: ChatMessage = {
                role: 'model',
                text: responseText,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, modelMessage]);

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
            setError(errorMsg);

            const errorMessage: ChatMessage = {
                role: 'model',
                text: `❌ Error: ${errorMsg}`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        // Remove emoji prefix for cleaner prompt
        const cleanSuggestion = suggestion.replace(/^[^\s]+\s/, '');
        sendMessage(cleanSuggestion);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(currentContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = () => {
        onSave(currentContent);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600">
                    <div className="flex items-center gap-2 text-white">
                        <MessageSquare className="w-5 h-5" />
                        <h3 className="font-bold">Refine Article: {articleTitle}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Chat Section */}
                    <div className="flex-1 flex flex-col border-r border-neutral-200">
                        {/* Messages */}
                        <div className="flex-1 overflow-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="text-center py-8">
                                    <Sparkles className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
                                    <p className="text-neutral-500 mb-4">
                                        Ask me to refine any part of your article
                                    </p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {REFINEMENT_SUGGESTIONS.map(suggestion => (
                                            <button
                                                key={suggestion}
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm hover:bg-indigo-100 transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-neutral-100 text-neutral-800'
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-neutral-100 p-3 rounded-lg flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                        <span className="text-sm text-neutral-500">Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mx-4 mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 border-t border-neutral-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me to refine the article..."
                                    className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    disabled={loading}
                                />
                                <button
                                    onClick={() => sendMessage(input)}
                                    disabled={loading || !input.trim()}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="w-80 flex flex-col bg-neutral-50">
                        <div className="p-3 border-b border-neutral-200 flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-700">Current Content</span>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-neutral-200 rounded hover:bg-neutral-50"
                            >
                                {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-3">
                            <pre className="text-xs text-neutral-600 whitespace-pre-wrap font-mono">
                                {currentContent.slice(0, 2000)}
                                {currentContent.length > 2000 && '...'}
                            </pre>
                        </div>
                        <div className="p-3 border-t border-neutral-200 text-xs text-neutral-500">
                            {currentContent.split(/\s+/).filter(w => w.length > 0).length} words
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-200 flex justify-between items-center bg-neutral-50">
                    <button
                        onClick={() => {
                            setMessages([]);
                            setCurrentContent(articleContent);
                            chatRef.current = null;
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-neutral-600 hover:bg-neutral-100 rounded"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reset
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
