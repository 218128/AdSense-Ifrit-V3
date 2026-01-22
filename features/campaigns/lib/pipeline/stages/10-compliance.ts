/**
 * Stage 10: Pre-Publish Compliance
 * FSD: features/campaigns/lib/pipeline/stages/10-compliance.ts
 *
 * Runs AdSense compliance checks before content is published.
 * Ensures content meets all policy requirements.
 */

import type { StageGroup } from '../types';
import type { PipelineContext, Campaign } from '../../../model/types';

export const complianceStages: StageGroup = {
    id: 'compliance',
    name: 'Compliance',
    parallel: false,
    runItemStatus: 'generating',
    stages: [
        {
            id: 'adsense_compliance',
            name: 'AdSense Compliance',
            optional: true,
            condition: (ctx) => !!ctx.content?.body,
            execute: async (ctx: PipelineContext) => {
                const { checkCompliance } = await import('../../adsenseCompliance');

                console.log('[Pipeline] Checking AdSense policy compliance...');

                const result = checkCompliance(ctx.content!.body, {
                    checkProhibitedTopics: true,
                    checkMinWordCount: true,
                    checkAffiliateDisclosure: true,
                    minWordCount: 500,
                });

                // Log issues
                if (result.issues.length > 0) {
                    console.log(`[Pipeline] Found ${result.issues.length} compliance issue(s):`);
                    result.issues.forEach(issue => {
                        console.log(`  - [${issue.severity}] ${issue.category}: ${issue.description}`);
                    });
                }

                // Critical issues flag for review
                const criticalIssues = result.issues.filter(i => i.severity === 'critical');
                if (criticalIssues.length > 0) {
                    console.warn('[Pipeline] Critical compliance issues - flagging for review');
                    ctx.needsManualReview = true;
                }

                console.log(`[Pipeline] Compliance score: ${result.score}/100 - ${result.isCompliant ? 'PASS' : 'NEEDS REVIEW'}`);
            },
        },
        {
            id: 'affiliate_disclosure',
            name: 'Affiliate Disclosure',
            optional: true,
            condition: (ctx, campaign) => !!ctx.content?.body && campaign.aiConfig.enableAffiliateLinks === true,
            execute: async (ctx: PipelineContext) => {
                const { injectAffiliateDisclosure } = await import('../../adsenseCompliance');

                // Check if disclosure already exists
                if (ctx.content!.body.includes('affiliate') || ctx.content!.body.includes('commission')) {
                    console.log('[Pipeline] Affiliate disclosure already present');
                    return;
                }

                // Check if article has affiliate links
                const hasAffiliateLinks = /amazon\.(com|co\.|de|fr)|amzn\.(to)|shareasale|awin|cj\.com/i.test(ctx.content!.body);

                if (hasAffiliateLinks) {
                    console.log('[Pipeline] Adding affiliate disclosure...');
                    ctx.content!.body = injectAffiliateDisclosure(ctx.content!.body, 'medium');
                }
            },
        },
        {
            id: 'pre_publish_check',
            name: 'Pre-Publish Final Check',
            optional: true,
            condition: (ctx) => !!ctx.content?.body,
            execute: async (ctx: PipelineContext) => {
                const { prePublishCheck } = await import('../../adsenseCompliance');

                const check = prePublishCheck(ctx.content!.body);

                if (!check.ready) {
                    console.warn('[Pipeline] Pre-publish check failed:', check.blockers);
                    // Don't fail the pipeline, but flag for review
                    if (check.blockers.length > 0) {
                        ctx.needsManualReview = true;
                    }
                }

                console.log(`[Pipeline] Pre-publish check: ${check.ready ? 'READY' : 'NEEDS REVIEW'} (score: ${check.score}/100)`);
            },
        },
    ],
};
