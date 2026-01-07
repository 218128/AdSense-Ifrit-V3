/**
 * Stage 04: Enhancement
 * FSD: features/campaigns/lib/pipeline/stages/04-enhancement.ts
 * 
 * Parallel enhancement: E-E-A-T injection, images, internal linking, schema.
 */

import type { StageGroup } from '../types';

export const enhancementStages: StageGroup = {
    id: 'enhancement',
    name: 'Content Enhancement',
    parallel: true,  // These can all run in parallel after content exists
    runItemStatus: 'generating',
    stages: [
        {
            id: 'eeat_inject',
            name: 'E-E-A-T Enhancement',
            optional: true,
            condition: (ctx, campaign) =>
                campaign.aiConfig.injectEEATSignals && !!ctx.matchedAuthor && !!ctx.content,
            execute: async (ctx) => {
                const { injectEEATSignals } = await import('../../eeatInjector');
                const { useAuthorStore } = await import('@/features/authors');

                const author = useAuthorStore.getState().getAuthor(ctx.matchedAuthor!.id);
                if (author) {
                    const result = injectEEATSignals(ctx, author, {
                        injectByline: true,
                        injectBioBox: true,
                        injectExperienceIntro: true,
                        injectSchema: false, // Schema stage handles this
                    });
                    ctx.content!.body = result.modifiedContent;
                    console.log(`[Pipeline] E-E-A-T injected: ${result.injections.join(', ')}`);
                }
            },
        },
        {
            id: 'images',
            name: 'Image Generation',
            optional: true,
            condition: (ctx, campaign) => campaign.aiConfig.includeImages && !!ctx.content,
            execute: async (ctx, campaign) => {
                const { generateImages } = await import('../../imageGenerator');
                ctx.images = await generateImages(ctx.content!.title, campaign.aiConfig);
                console.log(`[Pipeline] Images generated: cover=${!!ctx.images?.cover}`);
            },
        },
        {
            id: 'linking',
            name: 'Internal Linking',
            optional: true,
            condition: (ctx, campaign) => campaign.aiConfig.optimizeForSEO && !!ctx.content,
            execute: async (ctx, _, wpSite) => {
                const { fetchExistingPosts, findLinkOpportunities, injectInternalLinks } =
                    await import('../../internalLinking');

                const existingPosts = await fetchExistingPosts(wpSite);
                if (existingPosts.length > 0) {
                    const suggestions = findLinkOpportunities(ctx.content!.body, existingPosts, 5);
                    if (suggestions.length > 0) {
                        const result = injectInternalLinks(ctx.content!.body, suggestions, 3);
                        ctx.content!.body = result.content;
                        console.log(`[Pipeline] Added ${result.linksAdded} internal links`);
                    }
                }
            },
        },
        {
            id: 'schema',
            name: 'Schema Markup',
            optional: true,
            condition: (ctx, campaign) => campaign.aiConfig.includeSchema && !!ctx.content,
            execute: async (ctx) => {
                const { generateAllSchemas } = await import('../../schemaMarkup');

                // Use matched author name if available
                const authorName = ctx.matchedAuthor?.name || 'Content Team';

                const schemas = generateAllSchemas(
                    ctx.content!.title,
                    ctx.content!.excerpt || ctx.content!.body.substring(0, 160),
                    ctx.content!.body,
                    { authorName, articleType: 'BlogPosting' }
                );
                ctx.content!.body += '\n\n' + schemas;
                console.log('[Pipeline] Schema markup added');
            },
        },
        {
            id: 'affiliate_disclosure',
            name: 'Affiliate Disclosure',
            optional: true,
            condition: (ctx, campaign) =>
                !!campaign.aiConfig.enableAffiliateLinks && !!ctx.content,
            execute: async (ctx, campaign) => {
                const { generateDisclosure } = await import('../../affiliateContent');

                const disclosureType = campaign.aiConfig.affiliateDisclosureType || 'general';
                const disclosure = generateDisclosure(disclosureType);

                // Add disclosure at the beginning of the content
                ctx.content!.body = disclosure + '\n\n' + ctx.content!.body;
                console.log(`[Pipeline] Affiliate disclosure (${disclosureType}) injected`);
            },
        },
    ],
};
