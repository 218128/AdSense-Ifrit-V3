/**
 * SpamZilla Parser Tests
 * 
 * Tests for CSV parsing, tier classification, and preset detection.
 */

import {
    parseSpamZillaCSV,
    detectPresetFromFilename,
    determineQualityTier,
    getTierInfo,
    getPresetInfo,
    SpamZillaDomain,
    SpamZillaImportResult
} from '@/lib/domains/spamzillaParser';

// Sample CSV data for testing
const SAMPLE_CSV_HEADER = 'Name,Source,TF,CF,Majestic BL,Majestic RD,Moz DA,Moz PA,Moz Links,Age,SZ Score,SZ Drops,Live,Google Index,Archive,Redirect,Del Fnd,SEM Traffic,SEM Rank,SEM Keywords,Out Links,In Links,Date Added,Price,Expires,Pending Del,Language';

const GOLD_TIER_ROW = 'access-commerce.com,Dynadot,15,20,500,50,25,30,100,10,8,,Yes,1,Yes,No,0,1000,50000,5,10,100,12/22/2025,$13,12/25/2025,No,EN';
const SILVER_TIER_ROW = 'example-site.com,GoDaddy,9,15,200,30,14,20,50,3,12,,Yes,1,Yes,No,0,500,80000,3,5,50,12/22/2025,$8,12/26/2025,No,EN';
const BRONZE_TIER_ROW = 'my-domain.net,NameJet,6,12,100,20,11,15,30,1,18,,Yes,0,No,No,0,100,150000,1,3,20,12/22/2025,$5,12/27/2025,No,EN';
const AVOID_TIER_ROW = 'spammy-site.xyz,DropCatch,3,30,50,10,5,10,10,0,25,,No,0,No,No,0,0,0,0,1,5,12/22/2025,$1,12/28/2025,No,';

describe('SpamZilla Parser', () => {
    describe('parseSpamZillaCSV', () => {
        it('should parse valid CSV with multiple rows', () => {
            const csv = `${SAMPLE_CSV_HEADER}\n${GOLD_TIER_ROW}\n${SILVER_TIER_ROW}`;

            const result = parseSpamZillaCSV(csv, 'export.csv');

            expect(result.domains).toHaveLength(2);
            expect(result.domains[0].domain).toBe('access-commerce.com');
            expect(result.domains[1].domain).toBe('example-site.com');
        });

        it('should extract all SpamZilla metrics correctly', () => {
            const csv = `${SAMPLE_CSV_HEADER}\n${GOLD_TIER_ROW}`;

            const result = parseSpamZillaCSV(csv, 'export.csv');
            const domain = result.domains[0];

            expect(domain.trustFlow).toBe(15);
            expect(domain.citationFlow).toBe(20);
            expect(domain.domainAuthority).toBe(25);
            expect(domain.age).toBe(10);
            expect(domain.szScore).toBe(8);
            expect(domain.backlinks).toBe(500);
            expect(domain.referringDomains).toBe(50);
            expect(domain.auctionSource).toBe('Dynadot');
            expect(domain.price).toBe('$13');
        });

        it('should calculate TF:CF ratio correctly', () => {
            const csv = `${SAMPLE_CSV_HEADER}\n${GOLD_TIER_ROW}`;

            const result = parseSpamZillaCSV(csv, 'export.csv');
            const domain = result.domains[0];

            // TF=15, CF=20, ratio = 15/20 = 0.75
            expect(domain.tfCfRatio).toBeCloseTo(0.75, 2);
        });

        it('should handle zero CF gracefully', () => {
            const rowWithZeroCF = 'test.com,Dynadot,10,0,100,10,20,15,50,5,10,,Yes,1,Yes,No,0,100,50000,2,5,20,12/22/2025,$5,12/25/2025,No,EN';
            const csv = `${SAMPLE_CSV_HEADER}\n${rowWithZeroCF}`;

            const result = parseSpamZillaCSV(csv, 'export.csv');

            expect(result.domains[0].tfCfRatio).toBe(0);
        });

        it('should extract TLD correctly', () => {
            const csv = `${SAMPLE_CSV_HEADER}\n${GOLD_TIER_ROW}\n${BRONZE_TIER_ROW}`;

            const result = parseSpamZillaCSV(csv, 'export.csv');

            expect(result.domains[0].tld).toBe('com');
            expect(result.domains[1].tld).toBe('net');
        });

        it('should return import statistics', () => {
            const csv = `${SAMPLE_CSV_HEADER}\n${GOLD_TIER_ROW}\n${SILVER_TIER_ROW}\n${BRONZE_TIER_ROW}\n${AVOID_TIER_ROW}`;

            const result = parseSpamZillaCSV(csv, 'export.csv');

            expect(result.stats.total).toBe(4);
            expect(result.stats.adsenseReady).toBeGreaterThanOrEqual(1);
            expect(result.stats.avgTF).toBeGreaterThan(0);
            expect(result.stats.avgDA).toBeGreaterThan(0);
        });

        it('should handle empty CSV gracefully', () => {
            const csv = SAMPLE_CSV_HEADER;

            const result = parseSpamZillaCSV(csv, 'export.csv');

            expect(result.domains).toHaveLength(0);
            expect(result.stats.total).toBe(0);
        });

        it('should skip malformed rows', () => {
            const malformedRow = 'only,two,columns';
            const csv = `${SAMPLE_CSV_HEADER}\n${GOLD_TIER_ROW}\n${malformedRow}`;

            const result = parseSpamZillaCSV(csv, 'export.csv');

            expect(result.domains).toHaveLength(1);
        });
    });

    describe('detectPresetFromFilename', () => {
        it('should detect Gold Standard preset', () => {
            expect(detectPresetFromFilename('GoldStandard-export-12345.csv')).toBe('Gold Standard');
            expect(detectPresetFromFilename('gold-standard-domains.csv')).toBe('Gold Standard');
            expect(detectPresetFromFilename('AdSenseGold-export.csv')).toBe('Gold Standard');
        });

        it('should detect Safe to Relax preset', () => {
            expect(detectPresetFromFilename('SafeToRelax-export-12345.csv')).toBe('Safe to Relax');
            expect(detectPresetFromFilename('safe_to_relax-domains.csv')).toBe('Safe to Relax');
            expect(detectPresetFromFilename('RelaxedFilters-export.csv')).toBe('Safe to Relax');
        });

        it('should detect Maximum Volume preset', () => {
            expect(detectPresetFromFilename('MaximumVolumeSetup-export-148010.csv')).toBe('Maximum Volume');
            expect(detectPresetFromFilename('maximum-volume-domains.csv')).toBe('Maximum Volume');
            expect(detectPresetFromFilename('max-vol-export.csv')).toBe('Maximum Volume');
        });

        it('should return Custom for unrecognized filenames', () => {
            expect(detectPresetFromFilename('export-12345.csv')).toBe('Custom');
            expect(detectPresetFromFilename('domains.csv')).toBe('Custom');
            expect(detectPresetFromFilename('random-file.csv')).toBe('Custom');
        });
    });

    describe('determineQualityTier', () => {
        it('should classify domain as Gold with excellent metrics', () => {
            const domain: SpamZillaDomain = {
                domain: 'premium.com',
                tld: 'com',
                trustFlow: 15,
                citationFlow: 20,
                tfCfRatio: 0.75,
                domainAuthority: 25,
                age: 10,
                szScore: 5,
                backlinks: 500,
                referringDomains: 50,
                auctionSource: 'Dynadot',
                qualityTier: 'avoid', // Will be updated
                adsenseReady: false
            };

            const tier = determineQualityTier(domain);

            expect(tier).toBe('gold');
        });

        it('should classify domain as Silver with good metrics', () => {
            const domain: SpamZillaDomain = {
                domain: 'decent.com',
                tld: 'com',
                trustFlow: 9,
                citationFlow: 15,
                tfCfRatio: 0.6,
                domainAuthority: 14,
                age: 3,
                szScore: 12,
                backlinks: 200,
                referringDomains: 30,
                auctionSource: 'GoDaddy',
                qualityTier: 'avoid',
                adsenseReady: false
            };

            const tier = determineQualityTier(domain);

            expect(tier).toBe('silver');
        });

        it('should classify domain as Bronze with minimal acceptable metrics', () => {
            const domain: SpamZillaDomain = {
                domain: 'basic.net',
                tld: 'net',
                trustFlow: 6,
                citationFlow: 15,
                tfCfRatio: 0.4,
                domainAuthority: 11,
                age: 1,
                szScore: 18,
                backlinks: 100,
                referringDomains: 20,
                auctionSource: 'NameJet',
                qualityTier: 'avoid',
                adsenseReady: false
            };

            const tier = determineQualityTier(domain);

            expect(tier).toBe('bronze');
        });

        it('should classify domain as Avoid with poor metrics', () => {
            const domain: SpamZillaDomain = {
                domain: 'spam.xyz',
                tld: 'xyz',
                trustFlow: 2,
                citationFlow: 30,
                tfCfRatio: 0.07,
                domainAuthority: 3,
                age: 0,
                szScore: 30,
                backlinks: 50,
                referringDomains: 5,
                auctionSource: 'DropCatch',
                qualityTier: 'avoid',
                adsenseReady: false
            };

            const tier = determineQualityTier(domain);

            expect(tier).toBe('avoid');
        });

        it('should mark high SZ Score domains as Avoid', () => {
            const domain: SpamZillaDomain = {
                domain: 'spammy.com',
                tld: 'com',
                trustFlow: 15,
                citationFlow: 20,
                tfCfRatio: 0.75,
                domainAuthority: 25,
                age: 10,
                szScore: 25, // Too high!
                backlinks: 500,
                referringDomains: 50,
                auctionSource: 'Dynadot',
                qualityTier: 'avoid',
                adsenseReady: false
            };

            const tier = determineQualityTier(domain);

            expect(tier).toBe('avoid');
        });

        it('should mark low TF:CF ratio domains as Avoid', () => {
            const domain: SpamZillaDomain = {
                domain: 'unbalanced.com',
                tld: 'com',
                trustFlow: 5,
                citationFlow: 50, // Very unbalanced
                tfCfRatio: 0.1,
                domainAuthority: 25,
                age: 10,
                szScore: 5,
                backlinks: 500,
                referringDomains: 50,
                auctionSource: 'Dynadot',
                qualityTier: 'avoid',
                adsenseReady: false
            };

            const tier = determineQualityTier(domain);

            expect(tier).toBe('avoid');
        });
    });

    describe('getTierInfo', () => {
        it('should return correct info for gold tier', () => {
            const info = getTierInfo('gold');

            expect(info.emoji).toBe('🥇');
            expect(info.name).toBe('Gold');
            expect(info.color).toContain('yellow');
        });

        it('should return correct info for silver tier', () => {
            const info = getTierInfo('silver');

            expect(info.emoji).toBe('🥈');
            expect(info.name).toBe('Silver');
        });

        it('should return correct info for bronze tier', () => {
            const info = getTierInfo('bronze');

            expect(info.emoji).toBe('🥉');
            expect(info.name).toBe('Bronze');
        });

        it('should return correct info for avoid tier', () => {
            const info = getTierInfo('avoid');

            expect(info.emoji).toBe('⛔');
            expect(info.name).toBe('Avoid');
        });
    });

    describe('getPresetInfo', () => {
        it('should return info for gold preset', () => {
            const info = getPresetInfo('gold');

            expect(info.name).toBeTruthy();
            expect(info.color).toBeTruthy();
        });

        it('should return info for all presets', () => {
            const presets = ['gold', 'safe-relax', 'max-volume', 'custom'];

            presets.forEach(preset => {
                const info = getPresetInfo(preset);
                expect(info.name).toBeTruthy();
            });
        });
    });

    describe('Integration: Full CSV Parse Flow', () => {
        it('should correctly tier a realistic export', () => {
            const csv = `${SAMPLE_CSV_HEADER}
${GOLD_TIER_ROW}
${SILVER_TIER_ROW}
${BRONZE_TIER_ROW}
${AVOID_TIER_ROW}`;

            const result = parseSpamZillaCSV(csv, 'MaximumVolumeSetup-export.csv');

            // Check preset detection (uses internal format)
            expect(result.preset).toBe('max-volume');

            // Check we have 4 domains
            expect(result.domains).toHaveLength(4);

            // Check tiers are assigned
            const tiers = result.domains.map(d => d.qualityTier);
            expect(tiers).toContain('gold');
            expect(tiers).toContain('avoid');

            // Check AdSense readiness
            const goldDomains = result.domains.filter(d => d.qualityTier === 'gold');
            expect(goldDomains.every(d => d.adsenseReady)).toBe(true);
        });
    });
});
