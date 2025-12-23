/**
 * Flip Pipeline Types
 * 
 * Type definitions for domain flipping features.
 */

import type { ReactNode } from 'react';

// ============ STAGES ============

export type FlipStage = 'acquired' | 'building' | 'listed' | 'sold';

export interface StageConfig {
    id: FlipStage;
    label: string;
    icon: ReactNode;
    color: string;
    guidance: string;
}

// ============ PROJECT ============

export interface FlipProject {
    id: string;
    domain: string;
    stage: FlipStage;
    purchasePrice: number;
    purchaseDate: string;
    registrar: string;
    buildingNotes?: string;
    contentCount?: number;
    trafficEstimate?: number;
    currentValuation?: number;
    targetPrice?: number;
    salePrice?: number;
    saleDate?: string;
    marketplace?: string;
    roi?: number;
    profit?: number;
    daysHeld?: number;
    createdAt: number;
    updatedAt: number;
}

// ============ STATS ============

export interface FlipStats {
    total: number;
    inPipeline: number;
    totalInvested: number;
    totalProfit: number;
    avgROI: number;
}

// ============ CONSTANTS ============

export const MARKETPLACES = [
    'Sedo',
    'Dan.com',
    'Afternic',
    'Flippa',
    'Namecheap',
    'GoDaddy',
    'Other'
];

export const STORAGE_KEY = 'ifrit_flip_projects';
