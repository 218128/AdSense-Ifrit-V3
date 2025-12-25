/**
 * Keys Module - Public API
 * 
 * Exports the unified KeyManager for key validation, rotation, and health monitoring.
 */

export {
    KeyManager,
    keyManager,
    useKeyManager,
    type ValidatedKey,
    type ValidationResult,
    type RotationStatus,
    type KeyManagerConfig,
    type ProviderId,
    type StoredKey,
} from './KeyManager';
