/**
 * Tests for Persona System
 */

import {
    DEFAULT_PERSONAS,
    getPersonaById,
    getRandomPersona,
    getPersonasBySpecialty,
    getBestPersonaForTopic
} from '@/lib/humanization/personas';

describe('Persona System', () => {
    describe('DEFAULT_PERSONAS', () => {
        it('should have 10 personas', () => {
            expect(DEFAULT_PERSONAS).toHaveLength(10);
        });

        it('should have unique IDs for all personas', () => {
            const ids = DEFAULT_PERSONAS.map(p => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have required fields for all personas', () => {
            DEFAULT_PERSONAS.forEach(persona => {
                expect(persona.id).toBeTruthy();
                expect(persona.name).toBeTruthy();
                expect(persona.profession).toBeTruthy();
                expect(persona.yearsExperience).toBeGreaterThan(0);
                expect(persona.specialties.length).toBeGreaterThan(0);
                expect(persona.voiceTraits.length).toBeGreaterThan(0);
                expect(persona.commonPhrases.length).toBeGreaterThan(0);
                expect(persona.personalExperiences.length).toBeGreaterThan(0);
            });
        });
    });

    describe('getPersonaById', () => {
        it('should return persona by ID', () => {
            const persona = getPersonaById('tech-sarah');

            expect(persona).toBeDefined();
            expect(persona?.name).toBe('Sarah Chen');
        });

        it('should return undefined for unknown ID', () => {
            const persona = getPersonaById('unknown-id');

            expect(persona).toBeUndefined();
        });
    });

    describe('getRandomPersona', () => {
        it('should return a valid persona', () => {
            const persona = getRandomPersona();

            expect(persona).toBeDefined();
            expect(persona.id).toBeTruthy();
            expect(persona.name).toBeTruthy();
        });
    });

    describe('getPersonasBySpecialty', () => {
        it('should find personas by specialty', () => {
            const financePersonas = getPersonasBySpecialty('finance');

            expect(financePersonas.length).toBeGreaterThan(0);
            financePersonas.forEach(p => {
                expect(p.specialties.some(s =>
                    s.toLowerCase().includes('finance')
                )).toBe(true);
            });
        });

        it('should return empty array for unknown specialty', () => {
            const personas = getPersonasBySpecialty('xyz-nonexistent');

            expect(personas).toHaveLength(0);
        });
    });

    describe('getBestPersonaForTopic', () => {
        it('should match tech topics to tech persona', () => {
            const persona = getBestPersonaForTopic('best ai software tools');

            expect(persona.id).toBe('tech-sarah');
        });

        it('should match finance topics to finance persona', () => {
            const persona = getBestPersonaForTopic('investment strategies for retirement');

            expect(persona.id).toBe('finance-marcus');
        });

        it('should match security topics to security persona', () => {
            const persona = getBestPersonaForTopic('best vpn for privacy');

            expect(persona.id).toBe('security-james');
        });

        it('should return a persona for unknown topics', () => {
            const persona = getBestPersonaForTopic('random xyz topic');

            expect(persona).toBeDefined();
            expect(persona.id).toBeTruthy();
        });
    });
});
