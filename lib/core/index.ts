/**
 * Core Module - Public API
 * 
 * The foundational layer of Ifrit.
 * All capability execution flows through here.
 * 
 * @module core
 */

// Engine (The Absolute Root)
export {
    IfritEngine,
    engine,
    type EngineOptions,
    type EngineExecuteOptions,
    type EngineDiagnostics,
} from './Engine';

// Configuration Provider (Isomorphic Config)
export {
    BrowserConfigProvider,
    ServerConfigProvider,
    createConfigProvider,
} from './ConfigProvider';
export type {
    ConfigProvider,
    StoredKey,
    CapabilitySettings,
} from './ConfigProvider';

// Handler Registry (Capability Management)
export {
    HandlerRegistry,
    handlerRegistry,
    type HandlerRegistration,
    type HandlerQuery,
} from './HandlerRegistry';
