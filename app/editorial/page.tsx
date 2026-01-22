/**
 * Editorial Review Page
 * Route: /editorial
 * 
 * Dedicated page for editorial review workflow.
 */

import { ReviewDashboard } from '@/features/editorial';

export const metadata = {
    title: 'Editorial Review | AdSense Ifrit',
    description: 'Review and approve content before publishing',
};

export default function EditorialPage() {
    return (
        <main className="min-h-screen bg-neutral-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-neutral-900">
                        Editorial Review
                    </h1>
                    <p className="text-neutral-600 mt-1">
                        Review content quality, approve for publishing, and track revisions
                    </p>
                </div>

                <ReviewDashboard />
            </div>
        </main>
    );
}
