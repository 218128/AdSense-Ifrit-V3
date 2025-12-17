'use client';

/**
 * Hunt Skeletons
 * Loading skeleton components for Hunt tab
 */

// Base skeleton component
function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-neutral-200 rounded ${className}`} />
    );
}

// Keyword card skeleton
export function KeywordCardSkeleton() {
    return (
        <div className="p-4 border border-neutral-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-3 w-full" />
        </div>
    );
}

// Keyword list skeleton
export function KeywordListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <KeywordCardSkeleton key={i} />
            ))}
        </div>
    );
}

// Domain card skeleton
export function DomainCardSkeleton() {
    return (
        <div className="p-4 border border-neutral-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
            <div className="grid grid-cols-4 gap-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
            </div>
        </div>
    );
}

// Domain list skeleton
export function DomainListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <DomainCardSkeleton key={i} />
            ))}
        </div>
    );
}

// Stats card skeleton
export function StatsCardSkeleton() {
    return (
        <div className="p-4 bg-neutral-50 rounded-xl">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
        </div>
    );
}

// Stats grid skeleton
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <StatsCardSkeleton key={i} />
            ))}
        </div>
    );
}

// Filter bar skeleton
export function FilterBarSkeleton() {
    return (
        <div className="flex gap-3 items-center p-4 bg-white rounded-xl border border-neutral-200">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <div className="flex-1" />
            <Skeleton className="h-10 w-24" />
        </div>
    );
}

// Full page skeleton for Hunt tab
export function HuntPageSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header skeleton */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl p-6">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-80" />
            </div>

            {/* Tabs skeleton */}
            <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Content skeleton */}
            <StatsGridSkeleton />
            <FilterBarSkeleton />
            <DomainListSkeleton count={3} />
        </div>
    );
}
