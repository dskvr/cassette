import { 
  Cassette, 
  CassetteLoaderOptions, 
  CassetteLoadResult, 
  CassetteSource,
  CassetteLoadError
} from './types.js';
import {
  toArrayBuffer,
  generateCassetteId,
  createLogger,
  isBrowser,
  isNode,
  createEventTracker
} from './utils.js';
import { WasmMemoryManager, createMemoryManager } from './memory.js';

/**
 * Default options for loading cassettes
 */
const DEFAULT_OPTIONS: CassetteLoaderOptions = {
  memoryInitialSize: 16,
  exposeExports: false,
  debug: false,
  deduplicateEvents: true
};

/**
 * Function to find exported functions by various possible names
 * @param exports WebAssembly exports
 * @param possibleNames Array of possible function names
 * @returns The function if found, null otherwise
 */
function findExportFunction(exports: WebAssembly.Exports, possibleNames: string[]): Function | null {
  // First try exact matches from possible names
  for (const name of possibleNames) {
    if (name in exports && typeof exports[name as keyof typeof exports] === 'function') {
      return exports[name as keyof typeof exports] as Function;
    }
  }
  
  // Try different naming conventions
  for (const exportName of Object.keys(exports)) {
    if (typeof exports[exportName as keyof typeof exports] !== 'function') continue;
    
    // Check if the export name matches any of the possible names (case-insensitive)
    for (const name of possibleNames) {
      const lowerExportName = exportName.toLowerCase();
      const lowerName = name.toLowerCase();
      
      // Check for various patterns
      if (lowerExportName === lowerName ||
          lowerExportName.endsWith(`_${lowerName}`) ||
          lowerExportName.endsWith(lowerName) ||
          lowerExportName.startsWith(lowerName)) {
        return exports[exportName as keyof typeof exports] as Function;
      }
    }
  }
  
  return null;
}

/**
 * Core interface for direct WebAssembly interactions without wasm-bindgen
 */
class CoreCassetteInterface {
  private exports: WebAssembly.Exports;
  private memory: WebAssembly.Memory;
  private memoryManager: WasmMemoryManager;
  private logger: ReturnType<typeof createLogger>;
  private eventTracker = createEventTracker();
  
  constructor(instance: WebAssembly.Instance, debug = false) {
    this.exports = instance.exports;
    this.memory = this.exports.memory as WebAssembly.Memory;
    this.memoryManager = createMemoryManager(instance, debug);
    this.logger = createLogger(debug, 'CoreCassetteInterface');
  }
  
  // Core cassette methods
  describe(): string {
    this.logger.log('Getting cassette description');
    
    // Try to use chunked method first
    if (typeof this.exports.get_description_size === 'function' && 
        typeof this.exports.get_description_chunk === 'function') {
      this.logger.log('Using chunked description method');
      const size = (this.exports.get_description_size as Function)();
      let description = '';
      
      // Load in chunks of 1000 bytes
      const chunkSize = 1000;
      for (let i = 0; i < size; i += chunkSize) {
        const ptr = (this.exports.get_description_chunk as Function)(i, chunkSize);
        const chunkStr = this.memoryManager.readString(ptr);
        description += chunkStr;
        this.memoryManager.deallocateString(ptr);
      }
      
      return description;
    }
    
    // Fall back to direct describe method
    this.logger.log('Using direct describe method');
    return this.memoryManager.callStringFunction('describe');
  }
  
  getSchema(): string {
    this.logger.log('Getting cassette schema');
    
    // Try to use chunked method first for schema
    if (typeof this.exports.get_schema_size === 'function' && 
        typeof this.exports.get_schema_chunk === 'function') {
      this.logger.log('Using chunked schema method');
      const size = (this.exports.get_schema_size as Function)();
      let schema = '';
      
      // Load in chunks of 1000 bytes
      const chunkSize = 1000;
      for (let i = 0; i < size; i += chunkSize) {
        const ptr = (this.exports.get_schema_chunk as Function)(i, chunkSize);
        const chunkStr = this.memoryManager.readString(ptr);
        schema += chunkStr;
        this.memoryManager.deallocateString(ptr);
      }
      
      return schema;
    }
    
    // Fall back to direct get_schema method
    this.logger.log('Using direct get_schema method');
    if (typeof this.exports.get_schema === 'function') {
      return this.memoryManager.callStringFunction('get_schema');
    }
    
    // Last resort - return empty schema
    this.logger.log('No schema method found, returning empty schema');
    return '{}';
  }
  
  req(requestStr: string): string {
    this.logger.log(`Processing request: ${requestStr.substring(0, 100)}${requestStr.length > 100 ? '...' : ''}`);
    
    if (typeof this.exports.req !== 'function') {
      throw new Error('req function not implemented by cassette');
    }
    
    // Parse the request to determine if it's a new REQ
    let isNewReq = false;
    try {
      const parsedReq = JSON.parse(requestStr);
      if (Array.isArray(parsedReq) && parsedReq.length >= 2 && parsedReq[0] === "REQ") {
        isNewReq = true;
        this.logger.log('New REQ message detected, resetting event tracker');
        
        // Reset the event tracker for new REQ messages
        if (this.eventTracker) {
          this.eventTracker.reset();
        }
      }
    } catch (parseError) {
      this.logger.warn(`Failed to parse request string: ${parseError}`);
    }
    
    // Write request string to memory
    let requestPtr = 0;
    let resultPtr = 0;
    let result = '';
    
    try {
      // First allocate and write the request string to memory
      try {
        requestPtr = this.memoryManager.writeString(requestStr);
        if (requestPtr === 0) {
          this.logger.error("Failed to allocate memory for request string");
          return JSON.stringify(["NOTICE", "Error: Failed to allocate memory for request"]);
        }
      } catch (allocError: any) {
        this.logger.error(`Error allocating memory for request: ${allocError}`);
        return JSON.stringify(["NOTICE", `Error: ${allocError.message}`]);
      }
    
      // Call req function (which should return a pointer to the result)
      try {
        this.logger.log('Calling req function');
        resultPtr = (this.exports.req as Function)(requestPtr);
        
        if (resultPtr === 0) {
          this.logger.warn('req function returned null pointer');
          return JSON.stringify(["NOTICE", "Error: Empty response from cassette"]);
        }
      } catch (callError: any) {
        this.logger.error(`Error calling req function: ${callError}`);
        return JSON.stringify(["NOTICE", `Error: ${callError.message}`]);
      }
      
      // Read result from memory
      try {
        result = this.memoryManager.readString(resultPtr);
        if (!result || result.length === 0) {
          this.logger.warn('Empty result from req function');
          return JSON.stringify(["NOTICE", "Error: Empty response from cassette"]);
        }
        
        this.logger.log(`Raw result from req: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);
      } catch (readError: any) {
        this.logger.error(`Error reading result from memory: ${readError}`);
        return JSON.stringify(["NOTICE", `Error: ${readError.message}`]);
      }
      
      // Validate the result before returning
      if (result.startsWith('[')) {
        try {
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            // Handle standard NIP-01 message types
            if (parsed[0] === "NOTICE" || parsed[0] === "EVENT" || parsed[0] === "EOSE") {
              this.logger.log(`Received ${parsed[0]}: ${parsed[1]?.substring?.(0, 50) || ''}`);
              
              // For EVENT messages, check if the event is a duplicate
              if (parsed[0] === "EVENT" && parsed.length >= 3 && this.eventTracker && 
                  typeof parsed[2] === 'object' && parsed[2].id) {
                const eventId = parsed[2].id;
                if (!this.eventTracker.addAndCheck(eventId)) {
                  this.logger.log(`Skipping duplicate event with ID: ${eventId}`);
                  return JSON.stringify(["NOTICE", `Skipping duplicate event: ${eventId}`]);
                }
              }
              
              return result; // Return NIP-01 formatted message as is
            }
          }
          
          // If it's an array of events, deduplicate and return it
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].kind !== undefined) {
            this.logger.log('Result is an array of events, deduplicating');
            if (this.eventTracker) {
              const deduplicatedEvents = this.eventTracker.filterDuplicates(parsed);
              this.logger.log(`Filtered out ${parsed.length - deduplicatedEvents.length} duplicate events`);
              return JSON.stringify(deduplicatedEvents);
            }
            return result;
          }
          
          // If it's NOT a proper NIP-01 message, handle accordingly
          if (parsed.events && Array.isArray(parsed.events)) {
            this.logger.log('Result contains events array, deduplicating');
            if (this.eventTracker) {
              const deduplicatedEvents = this.eventTracker.filterDuplicates(parsed.events);
              this.logger.log(`Filtered out ${parsed.events.length - deduplicatedEvents.length} duplicate events`);
              return JSON.stringify(deduplicatedEvents);
            }
            return JSON.stringify(parsed.events);
          }
          
          // If it has a single event object, wrap it in an array and check for duplicates
          if (parsed.id && parsed.pubkey && parsed.kind !== undefined) {
            this.logger.log('Result is a single event, checking for duplicates');
            if (this.eventTracker && !this.eventTracker.addAndCheck(parsed.id)) {
              this.logger.log(`Skipping duplicate event with ID: ${parsed.id}`);
              return JSON.stringify(["NOTICE", `Skipping duplicate event: ${parsed.id}`]);
            }
            return JSON.stringify([parsed]);
          }
          
          // Return as is for any other valid JSON
          return result;
        } catch (parseError: any) {
          // Not valid JSON, but starts with '[', might be malformed
          this.logger.warn(`Result starts with '[' but is not valid JSON: ${parseError.message}`);
          return JSON.stringify(["NOTICE", `Error: Invalid response format: ${parseError.message}`]);
        }
      }
      
      // Not a well-formatted NIP-01 response, try to parse as JSON anyway
      try {
        const parsed = JSON.parse(result);
        
        // Handle object response formats
        if (parsed.events && Array.isArray(parsed.events)) {
          if (this.eventTracker) {
            const deduplicatedEvents = this.eventTracker.filterDuplicates(parsed.events);
            this.logger.log(`Filtered out ${parsed.events.length - deduplicatedEvents.length} duplicate events`);
            return JSON.stringify(deduplicatedEvents);
          }
          return JSON.stringify(parsed.events);
        } else if (parsed.id && parsed.pubkey && parsed.kind !== undefined) {
          if (this.eventTracker && !this.eventTracker.addAndCheck(parsed.id)) {
            this.logger.log(`Skipping duplicate event with ID: ${parsed.id}`);
            return JSON.stringify(["NOTICE", `Skipping duplicate event: ${parsed.id}`]);
          }
          return JSON.stringify([parsed]);
        }
        
        // Otherwise return as is
        return result;
      } catch (parseError: any) {
        // Not valid JSON at all
        this.logger.warn(`Result is not valid JSON: ${parseError.message}`);
        return JSON.stringify(["NOTICE", `Error: Invalid response: ${result.substring(0, 50)}`]);
      }
    } catch (error: any) {
      this.logger.error(`Error in req method: ${error}`);
      return JSON.stringify(["NOTICE", `Error: ${error.message}`]);
    } finally {
      // Clean up memory (with proper error handling)
      if (requestPtr) {
        try {
          this.memoryManager.deallocateString(requestPtr);
        } catch (cleanupError) {
          this.logger.error(`Error cleaning up request memory: ${cleanupError}`);
        }
      }
      
      if (resultPtr) {
        try {
          this.memoryManager.deallocateString(resultPtr);
        } catch (cleanupError) {
          this.logger.error(`Error cleaning up result memory: ${cleanupError}`);
        }
      }
    }
  }
  
  close(closeStr: string): string {
    this.logger.log(`Processing close request: ${closeStr}`);
    
    if (typeof this.exports.close !== 'function') {
      this.logger.log('Close function not implemented, returning default notice');
      return JSON.stringify(["NOTICE", "Close not implemented"]);
    }
    
    // Write close string to memory
    let closePtr = 0;
    let resultPtr = 0;
    let result = '';
    
    try {
      // First allocate and write the close string to memory
      try {
        closePtr = this.memoryManager.writeString(closeStr);
        if (closePtr === 0) {
          this.logger.error("Failed to allocate memory for close string");
          return JSON.stringify(["NOTICE", "Error: Failed to allocate memory for close request"]);
        }
      } catch (allocError: any) {
        this.logger.error(`Error allocating memory for close request: ${allocError}`);
        return JSON.stringify(["NOTICE", `Error: ${allocError.message}`]);
      }
    
      // Call close function (which should return a pointer to the result)
      try {
        this.logger.log('Calling close function');
        resultPtr = (this.exports.close as Function)(closePtr);
        
        if (resultPtr === 0) {
          this.logger.warn('close function returned null pointer');
          return JSON.stringify(["NOTICE", "Error: Empty response from cassette"]);
        }
      } catch (callError: any) {
        this.logger.error(`Error calling close function: ${callError}`);
        return JSON.stringify(["NOTICE", `Error: ${callError.message}`]);
      }
      
      // Read result from memory
      try {
        result = this.memoryManager.readString(resultPtr);
        if (!result || result.length === 0) {
          this.logger.warn('Empty result from close function');
          return JSON.stringify(["NOTICE", "Error: Empty response from cassette"]);
        }
        
        this.logger.log(`Raw result from close: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);
      } catch (readError: any) {
        this.logger.error(`Error reading result from memory: ${readError}`);
        return JSON.stringify(["NOTICE", `Error: ${readError.message}`]);
      }
      
      // Validate the result before returning
      if (result.startsWith('[')) {
        try {
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            // Handle standard NIP-01 message types
            if (parsed[0] === "NOTICE") {
              this.logger.log(`Received NOTICE: ${parsed[1]}`);
              return result; // Return NOTICE as is
            }
          }
          
          // Return the result as is if it's already valid JSON
          return result;
        } catch (parseError: any) {
          // Not valid JSON, but starts with '[', might be malformed
          this.logger.warn(`Result starts with '[' but is not valid JSON: ${parseError.message}`);
          return JSON.stringify(["NOTICE", `Error: Invalid response format: ${parseError.message}`]);
        }
      }
      
      // Not a well-formatted response, try to parse it anyway
      try {
        JSON.parse(result); // Just check if it's valid JSON
        return result;
      } catch (parseError: any) {
        // Not valid JSON at all
        this.logger.warn(`Result is not valid JSON: ${parseError.message}`);
        return JSON.stringify(["NOTICE", `Error: Invalid response: ${result.substring(0, 50)}`]);
      }
    } catch (error: any) {
      this.logger.error(`Error in close method: ${error}`);
      return JSON.stringify(["NOTICE", `Error: ${error.message}`]);
    } finally {
      // Clean up memory (with proper error handling)
      if (closePtr) {
        try {
          this.memoryManager.deallocateString(closePtr);
        } catch (cleanupError) {
          this.logger.error(`Error cleaning up close memory: ${cleanupError}`);
        }
      }
      
      if (resultPtr) {
        try {
          this.memoryManager.deallocateString(resultPtr);
        } catch (cleanupError) {
          this.logger.error(`Error cleaning up result memory: ${cleanupError}`);
        }
      }
    }
  }
}

/**
 * Load a cassette from various sources
 * @param source Source of the cassette (file, URL, or ArrayBuffer)
 * @param fileName Original file name of the cassette (optional, used for ID generation)
 * @param options Options for loading the cassette
 * @returns Promise that resolves with the result of loading the cassette
 */
export async function loadCassette(
  source: CassetteSource,
  fileName?: string,
  options: CassetteLoaderOptions = {}
): Promise<CassetteLoadResult> {
  // Merge options with defaults
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const logger = createLogger(opts.debug);
  
  try {
    // Get the original file name if it's a File object
    if (typeof File !== 'undefined' && source instanceof File) {
      fileName = fileName || source.name;
    }
    
    // Default file name if none provided
    fileName = fileName || 'unknown_cassette.wasm';
    
    // Generate a unique ID for this cassette
    const cassetteId = generateCassetteId(fileName);
    
    logger.log(`Loading cassette ${fileName} (ID: ${cassetteId})`);
    
    // Convert source to ArrayBuffer
    const buffer = await toArrayBuffer(source);
    
    // Create memory for the WebAssembly module
    const memory = new WebAssembly.Memory({ 
      initial: opts.memoryInitialSize || 16, 
      // maximum: 1024 // Uncomment to set a maximum memory size
    });
    
    // Create import object with memory
    const baseImports: WebAssembly.Imports = {
      env: {
        memory,
        log: (...args: any[]) => {
          logger.log('WASM log:', ...args);
        },
        error: (...args: any[]) => {
          logger.error('WASM error:', ...args);
        },
        warn: (...args: any[]) => {
          logger.warn('WASM warn:', ...args);
        },
        abort: (...args: any[]) => {
          logger.error('WASM abort:', ...args);
          throw new Error('WASM aborted: ' + args.join(' '));
        }
      },
      // Include wbindgen helpers for compatibility
      __wbindgen_placeholder__: {
        __wbindgen_string_new: (ptr: number, len: number) => {
          const memory = new Uint8Array((baseImports.env.memory as WebAssembly.Memory).buffer);
          const slice = memory.slice(ptr, ptr + len);
          const text = new TextDecoder().decode(slice);
          return text;
        },
        __wbindgen_throw: (ptr: number, len: number) => {
          const memory = new Uint8Array((baseImports.env.memory as WebAssembly.Memory).buffer);
          const slice = memory.slice(ptr, ptr + len);
          const text = new TextDecoder().decode(slice);
          throw new Error(text);
        }
      }
    };
    
    // Merge custom imports with base imports if provided
    const importObject = opts.customImports 
      ? mergeImports(baseImports, opts.customImports)
      : baseImports;
    
    // Compile and instantiate the WebAssembly module
    logger.log('Compiling WebAssembly module...');
    const { instance, module } = await WebAssembly.instantiate(buffer, importObject);
    logger.log('WebAssembly module compiled and instantiated');
    
    // Get the module's imports to detect missing imports
    const requiredImports = WebAssembly.Module.imports(module);

    // Check for any missing imports and add dynamic stubs
    addDynamicImports(importObject, requiredImports, logger);
    
    const exports = instance.exports;
    
    // Create a memory manager for this instance
    const memoryManager = createMemoryManager(instance, opts.debug);
    
    // Create an instance of the core interface
    const coreInterface = new CoreCassetteInterface(instance, opts.debug);
    
    // Get description from the cassette
    let description: string;
    try {
      description = coreInterface.describe();
      logger.log(`Cassette description: ${description}`);
    } catch (error) {
      logger.error('Failed to get description:', error);
      description = JSON.stringify({
        name: fileName.replace(/\.[^/.]+$/, ""),
        description: "No description available",
        version: "unknown"
      });
    }
    
    // Parse the description as JSON
    let metadata;
    try {
      metadata = JSON.parse(description);
    } catch (error) {
      logger.error('Failed to parse description JSON:', error);
      metadata = {
        name: fileName.replace(/\.[^/.]+$/, ""),
        description: "Error parsing description",
        version: "unknown"
      };
    }
    
    // Extract metadata fields
    const name = metadata.name || metadata.metadata?.name || fileName.replace(/\.[^/.]+$/, "");
    const desc = metadata.description || metadata.metadata?.description || "No description available";
    const version = metadata.version || metadata.metadata?.version || "unknown";
    
    // Create a cassette object with methods
    const cassette: Cassette = {
      id: cassetteId,
      fileName,
      name,
      description: desc,
      version,
      methods: {
        describe: () => coreInterface.describe(),
        req: (requestStr: string) => coreInterface.req(requestStr),
        close: (closeStr: string) => coreInterface.close(closeStr),
        getSchema: () => coreInterface.getSchema()
      },
      eventTracker: opts.deduplicateEvents !== false ? createEventTracker() : undefined
    };
    
    // Optionally expose exports and instance for advanced usage
    if (opts.exposeExports) {
      cassette.exports = exports;
      cassette.instance = instance;
      cassette.memory = memory;
    }
    
    logger.log(`Cassette loaded successfully: ${name} (v${version})`);
    
    return {
      success: true,
      cassette
    };
  } catch (error: any) {
    logger.error('Failed to load cassette:', error);
    return {
      success: false,
      error: `Failed to load cassette: ${error.message || error}`
    };
  }
}

/**
 * Add any missing imports that the module requires
 * @param importObject Import object to modify
 * @param requiredImports Required imports from the module
 * @param logger Logger instance
 */
function addDynamicImports(
  importObject: WebAssembly.Imports, 
  requiredImports: WebAssembly.ModuleImportDescriptor[],
  logger: ReturnType<typeof createLogger>
): void {
  // Check for each required import
  for (const imp of requiredImports) {
    // Create the module namespace if it doesn't exist
    if (!importObject[imp.module]) {
      importObject[imp.module] = {};
    }
    
    // Skip if the import already exists
    if (imp.name in (importObject[imp.module] as object)) {
      continue;
    }
    
    // Add a stub function or global based on the kind
    if (imp.kind === 'function') {
      // Create a stub function based on name patterns
      logger.log(`Creating stub function for ${imp.module}.${imp.name}`);
      (importObject[imp.module] as any)[imp.name] = createStubFunction(imp.module, imp.name, logger);
    } else if (imp.kind === 'global') {
      logger.log(`Creating stub global for ${imp.module}.${imp.name}`);
      (importObject[imp.module] as any)[imp.name] = 0;
    }
  }
}

/**
 * Create a stub function for an import based on its name
 * @param module Module name
 * @param name Function name
 * @param logger Logger instance
 * @returns Stub function
 */
function createStubFunction(module: string, name: string, logger: ReturnType<typeof createLogger>): Function {
  const lowerName = name.toLowerCase();
  
  // Log functions
  if (lowerName.includes('log') || lowerName.includes('print')) {
    return function(...args: any[]) {
      console.log(`[WASM ${module}.${name}]`, ...args);
      return 0;
    };
  }
  
  // Error functions
  if (lowerName.includes('error') || lowerName.includes('panic')) {
    return function(...args: any[]) {
      console.error(`[WASM ${module}.${name}]`, ...args);
      return 0;
    };
  }
  
  // Default stub
  return function(...args: any[]) {
    logger.log(`Called ${module}.${name} with args:`, args);
    return 0;
  };
}

/**
 * Merge two import objects
 * @param base Base import object
 * @param custom Custom import object to merge
 * @returns Merged import object
 */
function mergeImports(base: WebAssembly.Imports, custom: WebAssembly.Imports): WebAssembly.Imports {
  const result: WebAssembly.Imports = { ...base };
  
  // Merge each module from custom imports
  for (const module of Object.keys(custom)) {
    if (!result[module]) {
      result[module] = {};
    }
    
    // Merge the module
    result[module] = { ...result[module], ...custom[module] };
  }
  
  return result;
}

/**
 * Extract a result from a WebAssembly function
 * @param result Result from a WebAssembly function
 * @param memory WebAssembly memory
 * @param deallocFn Deallocation function (optional)
 * @returns Extracted string value
 */
function extractWasmResult(result: any, memory: WebAssembly.Memory, deallocFn: Function | null | undefined): string {
  // If the result is a string, return it directly
  if (typeof result === 'string') {
    return result;
  }
  
  // If the result is an array with two elements [ptr, len], handle it
  if (Array.isArray(result) && result.length === 2) {
    const ptr = result[0];
    const len = result[1];
    
    // Read the string from memory using TextDecoder
    const memoryArray = new Uint8Array(memory.buffer, ptr, len);
    const response = new TextDecoder('utf-8').decode(memoryArray);
    
    // If there's a dealloc function, free the memory
    if (deallocFn) {
      deallocFn.call(null, ptr, len);
    }
    
    return response;
  }
  
  // If the result is a number, assume it's a pointer to a null-terminated string
  if (typeof result === 'number') {
    const mem = new Uint8Array(memory.buffer);
    let response = '';
    let i = result;
    const maxLen = 10000; // Safety limit to prevent infinite loops
    let count = 0;
    
    while (i < mem.length && mem[i] !== 0 && count < maxLen) {
      response += String.fromCharCode(mem[i]);
      i++;
      count++;
    }
    
    if (count === 0) {
      console.error('Empty string at pointer:', result);
      return JSON.stringify({
        error: 'Empty response from function'
      });
    }
    
    return response;
  }
  
  // Handle other types of results
  if (result === undefined || result === null) {
    return JSON.stringify({
      error: 'Function returned undefined or null'
    });
  }
  
  // Try to stringify the result
  try {
    return JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({
      error: `Could not stringify result: ${error}`
    });
  }
} 