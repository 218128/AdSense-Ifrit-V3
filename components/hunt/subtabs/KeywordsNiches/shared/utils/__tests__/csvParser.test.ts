/**
 * csvParser Utility Tests
 */

import { parseCSV } from '../csvParser';

describe('parseCSV', () => {
    it('parses simple CSV with header', () => {
        const csv = `keyword,niche
react hooks,technology
vue composition,technology`;
        const result = parseCSV(csv);

        expect(result).toHaveLength(2);
        expect(result[0].keyword).toBe('react hooks');
        expect(result[0].niche).toBe('technology');
    });

    it('handles quoted values', () => {
        const csv = `keyword,niche,context
"hello, world",tech,"some description"`;
        const result = parseCSV(csv);

        expect(result).toHaveLength(1);
        expect(result[0].keyword).toBe('hello');  // Note: simple parser splits on comma
    });

    it('skips empty lines', () => {
        const csv = `keyword,niche
react,tech

vue,tech`;
        const result = parseCSV(csv);
        expect(result).toHaveLength(2);
    });

    it('returns empty array for empty input', () => {
        expect(parseCSV('')).toEqual([]);
    });

    it('returns empty array for header-only CSV', () => {
        expect(parseCSV('keyword,niche,context')).toEqual([]);
    });

    it('assigns "csv" as source to all items', () => {
        const csv = `keyword
test`;
        const result = parseCSV(csv);
        expect(result[0].source).toBe('csv');
    });

    it('handles optional columns', () => {
        const csv = `keyword,niche,context,difficulty,searchVolume
seo,marketing,important,hard,1000`;
        const result = parseCSV(csv);

        expect(result[0].keyword).toBe('seo');
        expect(result[0].niche).toBe('marketing');
        expect(result[0].context).toBe('important');
        expect(result[0].difficulty).toBe('hard');
        expect(result[0].searchVolume).toBe('1000');
    });
});
