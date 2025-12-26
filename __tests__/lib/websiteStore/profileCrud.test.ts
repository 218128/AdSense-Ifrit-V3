/**
 * Tests for profileCrud.ts - Domain Profile CRUD Operations
 */

// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(),
    unlinkSync: jest.fn()
}));

import * as fs from 'fs';
import {
    createMockDomainProfile,
    createMockProfileCrudDeps
} from './testUtils';

import {
    saveDomainProfile,
    getDomainProfile,
    listDomainProfiles,
    deleteDomainProfile,
    markProfileTransferred,
    _initProfileCrudDeps
} from '@/lib/websiteStore/profileCrud';

describe('profileCrud.ts', () => {
    let mockDeps: ReturnType<typeof createMockProfileCrudDeps>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeps = createMockProfileCrudDeps();
        _initProfileCrudDeps(mockDeps);
    });

    describe('saveDomainProfile()', () => {
        it('should write profile to correct path', () => {
            const profile = createMockDomainProfile({ domain: 'test-domain.com' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveDomainProfile(profile);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('test-domain.com'),
                expect.any(String)
            );
        });

        it('should serialize profile as JSON with formatting', () => {
            const profile = createMockDomainProfile({ niche: 'finance' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveDomainProfile(profile);

            const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
            expect(JSON.parse(writtenContent)).toHaveProperty('niche', 'finance');
        });

        it('should create profiles directory if it does not exist', () => {
            const profile = createMockDomainProfile();

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            saveDomainProfile(profile);

            expect(fs.mkdirSync).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ recursive: true })
            );
        });

        it('should sanitize domain name for file path', () => {
            const profile = createMockDomainProfile({ domain: 'sub.domain.co.uk' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveDomainProfile(profile);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('sub.domain.co.uk'),
                expect.any(String)
            );
        });
    });

    describe('getDomainProfile()', () => {
        it('should return profile when file exists', () => {
            const mockProfile = createMockDomainProfile({ domain: 'existing.com' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockProfile));

            const result = getDomainProfile('existing.com');

            expect(result).toEqual(mockProfile);
        });

        it('should return null when file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getDomainProfile('nonexistent.com');

            expect(result).toBeNull();
        });

        it('should return null when JSON is invalid', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

            const result = getDomainProfile('invalid.com');

            expect(result).toBeNull();
        });
    });

    describe('listDomainProfiles()', () => {
        it('should return empty array when no profiles exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue([]);

            const result = listDomainProfiles();

            expect(result).toEqual([]);
        });

        it('should return array of profiles sorted by researchedAt', () => {
            const profile1 = createMockDomainProfile({
                domain: 'old.com',
                researchedAt: 1000
            });
            const profile2 = createMockDomainProfile({
                domain: 'new.com',
                researchedAt: 2000
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['old.com.json', 'new.com.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce(JSON.stringify(profile1))
                .mockReturnValueOnce(JSON.stringify(profile2));

            const result = listDomainProfiles();

            expect(result).toHaveLength(2);
            expect(result[0].domain).toBe('new.com'); // newer first
            expect(result[1].domain).toBe('old.com');
        });

        it('should filter out non-JSON files', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['readme.txt', '.gitkeep']);

            const result = listDomainProfiles();

            expect(result).toEqual([]);
        });

        it('should skip invalid JSON files', () => {
            const validProfile = createMockDomainProfile();

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['invalid.json', 'valid.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce('invalid')
                .mockReturnValueOnce(JSON.stringify(validProfile));

            const result = listDomainProfiles();

            expect(result).toHaveLength(1);
        });
    });

    describe('deleteDomainProfile()', () => {
        it('should delete profile file when it exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = deleteDomainProfile('test.com');

            expect(fs.unlinkSync).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should return false when profile does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = deleteDomainProfile('nonexistent.com');

            expect(fs.unlinkSync).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('markProfileTransferred()', () => {
        it('should update transferredToWebsite flag', () => {
            const profile = createMockDomainProfile({
                domain: 'transfer.com',
                transferredToWebsite: false
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(profile));

            markProfileTransferred('transfer.com');

            const writtenContent = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(writtenContent.transferredToWebsite).toBe(true);
        });

        it('should set websiteCreatedAt timestamp', () => {
            const beforeTime = Date.now();
            const profile = createMockDomainProfile({ domain: 'transfer.com' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(profile));

            markProfileTransferred('transfer.com');

            const writtenContent = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(writtenContent.websiteCreatedAt).toBeGreaterThanOrEqual(beforeTime);
        });

        it('should do nothing when profile does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            markProfileTransferred('nonexistent.com');

            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });
    });
});
