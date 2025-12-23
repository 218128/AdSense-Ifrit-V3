/**
 * MCP Module Exports (Client-Safe)
 * 
 * This file only exports client-safe utilities.
 * For server-side MCP functionality, import directly from:
 *   - './mcpManager' for MCPManagerClass and mcpManager singleton
 * 
 * The mcpManager is NOT exported here because it imports the MCP SDK
 * which uses Node.js-only modules (child_process, fs).
 */

// Server configs (no Node.js deps)
export {
    MCP_SERVERS,
    getServerById,
    getServersByCategory
} from './servers';
export type { MCPServerConfig } from './servers';

// Tool mapper utilities (no Node.js deps)
export {
    inferCapabilities,
    getCapabilitiesForTool,
    createMCPExecutor,
    DEFAULT_TOOL_MAPPINGS,
    getCustomMappings,
    setCustomMapping,
} from './toolMapper';
export type { MCPToolInfo } from './toolMapper';
