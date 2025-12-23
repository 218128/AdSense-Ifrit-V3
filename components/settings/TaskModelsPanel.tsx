'use client';

import { useState, useEffect } from 'react';
import { Cpu, ChevronDown } from 'lucide-react';
import {
    TaskType,
    TaskModelConfig,
    TASK_DESCRIPTIONS,
    getTaskModelConfig,
    setTaskModel,
    clearTaskModel,
    getAllTaskTypes
} from '@/lib/ai/taskModels';
import { ProviderId } from '@/lib/ai/providers/base';

interface AvailableModels {
    [providerId: string]: string[];
}

interface SelectedModels {
    [providerId: string]: string;
}

interface TaskModelsProps {
    availableModels: AvailableModels;
    selectedModels: SelectedModels;
}

/**
 * Task Model Assignment Panel
 * Allows assigning specific models to different tasks
 */
export function TaskModelsPanel({ availableModels, selectedModels }: TaskModelsProps) {
    const [config, setConfig] = useState<TaskModelConfig>(getTaskModelConfig());
    const [expandedTask, setExpandedTask] = useState<TaskType | null>(null);

    // Get providers that have models available
    const providersWithModels = Object.entries(availableModels)
        .filter(([_, models]) => models.length > 0)
        .map(([id]) => id as ProviderId);

    const handleSetModel = (taskType: TaskType, providerId: ProviderId, modelId: string) => {
        setTaskModel(taskType, providerId, modelId);
        setConfig(getTaskModelConfig());
    };

    const handleClearModel = (taskType: TaskType) => {
        clearTaskModel(taskType);
        setConfig(getTaskModelConfig());
    };

    const getProviderColor = (providerId: string): string => {
        const colors: Record<string, string> = {
            gemini: '#4285f4',
            deepseek: '#00d4aa',
            openrouter: '#ff6b35',
            vercel: '#000000',
            perplexity: '#20b2aa'
        };
        return colors[providerId] || '#666666';
    };

    const taskTypes = getAllTaskTypes();

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Task Model Assignments</h3>
            </div>

            <p className="text-sm text-gray-500">
                Assign specific AI models to different tasks. Leave empty to use the provider&apos;s default model.
            </p>

            {providersWithModels.length === 0 ? (
                <div className="p-4 text-center text-amber-600 bg-amber-50 rounded-lg">
                    Test your API keys first to see available models.
                </div>
            ) : (
                <div className="space-y-2">
                    {taskTypes.map(taskType => {
                        const taskInfo = TASK_DESCRIPTIONS[taskType];
                        const assignment = config[taskType];
                        const isExpanded = expandedTask === taskType;

                        return (
                            <div key={taskType} className="border rounded-lg overflow-hidden">
                                {/* Task Header */}
                                <button
                                    onClick={() => setExpandedTask(isExpanded ? null : taskType)}
                                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="text-left">
                                        <div className="font-medium">{taskInfo.name}</div>
                                        <div className="text-xs text-gray-500">{taskInfo.description}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {assignment ? (
                                            <span
                                                className="px-2 py-1 text-xs rounded-full text-white"
                                                style={{ backgroundColor: getProviderColor(assignment.providerId) }}
                                            >
                                                {assignment.providerId}/{assignment.modelId.split('/').pop()}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                                                Default
                                            </span>
                                        )}
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="p-3 pt-0 space-y-3 border-t bg-gray-50">
                                        <div className="text-xs text-gray-500 italic">
                                            💡 {taskInfo.recommendation}
                                        </div>

                                        {/* Provider/Model Selection */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {providersWithModels.map(providerId => (
                                                <div key={providerId}>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
                                                        {providerId}
                                                    </label>
                                                    <select
                                                        value={
                                                            assignment?.providerId === providerId
                                                                ? assignment.modelId
                                                                : ''
                                                        }
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                handleSetModel(taskType, providerId, e.target.value);
                                                            }
                                                        }}
                                                        className="w-full px-2 py-1.5 border rounded text-sm"
                                                    >
                                                        <option value="">Select model...</option>
                                                        {(availableModels[providerId] || []).map(model => (
                                                            <option key={model} value={model}>
                                                                {model}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>

                                        {assignment && (
                                            <button
                                                onClick={() => handleClearModel(taskType)}
                                                className="text-xs text-red-500 hover:underline"
                                            >
                                                Reset to default
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
