DO NOT EDIT

SandwichsFavs Cassette/
├── README.md - Main project documentation with build instructions and usage examples.
├── WASM-QUICKSTART.md - Quick start guide for working with WebAssembly in this project.
├── FILE_STRUCTURE.md - Overview of the project's directory and file organization.
├── .gitignore - Global Git ignore rules for the project.
├── Makefile - Build automation rules for compiling and testing the project.
├── CHANGELOG.md - Record of version changes and updates to the project.
├── package.json - Root project configuration for Node.js dependencies.
├── package-lock.json - Locked versions of Node.js dependencies.
├── integration-test.sh - Shell script for running integration tests.
├── test-close.js - JavaScript test for connection closing behavior.
│
├── tests/ - Directory containing test files for the project.
│   ├── test-nip119.js - Tests for NIP-119 implementation.
│   ├── integration-test.sh - Shell script for running integration tests inside tests directory.
│   └── .gitkeep - Empty file used to ensure the directory is included in Git.
│
├── logs/ - Directory for storing application logs.
│
├── sandwichs-favs/ - Rust WASM project implementing Nostr relay functionality for the Cassette platform.
│   ├── src/ - Source code for the Rust implementation.
│   │   ├── lib.rs - Main library implementing the SandwichsFavs cassette with WebAssembly exports.
│   │   └── main.rs - Simple executable entry point for testing the library locally.
│   ├── Cargo.toml - Rust project configuration defining dependencies and metadata.
│   ├── Cargo.lock - Locked versions of dependencies to ensure reproducible builds.
│   ├── notes.json - Sample Nostr notes data for testing.
│   ├── .gitignore - Git ignore rules specific to the Rust project.
│   └── target/ - Build output directory containing compiled artifacts.
│
├── cli/ - CLI tool for creating and managing Cassette platform modules.
│   ├── src/ - Source code for the CLI implementation.
│   │   ├── lib.rs - Library code implementing the cassette functionality.
│   │   ├── main.rs - CLI executable entry point with subcommands for cassette operations.
│   │   └── templates/ - Templates for generating Rust code for cassettes.
│   │       ├── cassette_template.rs - Template for the Rust implementation of a cassette.
│   │       └── Cargo.toml - Template for the cassette project configuration.
│   ├── Cargo.toml - Rust project configuration with CLI dependencies.
│   ├── Cargo.lock - Locked versions of dependencies.
│   ├── notes.json - Sample Nostr notes data for testing.
│   ├── README.md - Documentation for the CLI tool and its usage.
│   ├── .gitignore - Git ignore rules specific to the CLI project.
│   └── target/ - Build output directory containing compiled artifacts.
│
├── boombox/ - JavaScript/TypeScript WebSocket server that loads and communicates with cassettes.
│   ├── wasm/ - Generated WebAssembly bindings for the sandwichs-favs module.
│   ├── scripts/ - Helper scripts for building and processing WASM files.
│   │   ├── README.md - Documentation for the scripts usage and purpose.
│   │   ├── process-wasm.js - Script to process WASM files from Rust builds into JS bindings.
│   │   └── update-wasm-bindings.js - Script to manually update WASM bindings when adding new methods.
│   ├── index.ts - WebSocket server that loads and manages cassettes.
│   ├── schema-validator.ts - Utility for validating messages against JSON schemas.
│   ├── validate-schema.js - Original schema validation utility.
│   ├── schema.test.ts - Tests for schema validation functionality.
│   ├── wasm.test.ts - Tests for WebAssembly bindings and functionality.
│   ├── package.json - Node.js project configuration with dependencies and scripts.
│   ├── bun.lock - Dependency lock file for Bun package manager.
│   ├── tsconfig.json - TypeScript compiler configuration.
│   ├── README.md - Documentation for the JavaScript test suite.
│   ├── .gitignore - Git ignore rules for the Node.js project.
│   └── node_modules/ - Directory containing installed Node.js dependencies.
│
├── nostr-proxy/ - Simple WebSocket proxy for Nostr relay messages.
│   ├── index.ts - WebSocket server that forwards messages to the boombox.
│   ├── package.json - Node.js project configuration with dependencies and scripts.
│   ├── bun.lock - Dependency lock file for Bun package manager.
│   ├── tsconfig.json - TypeScript compiler configuration.
│   ├── README.md - Documentation for the proxy usage.
│   ├── .gitignore - Git ignore rules specific to the proxy project.
│   └── node_modules/ - Directory containing installed Node.js dependencies.
│
├── cassette-tools/ - Rust library providing core functionality for cassette projects.
│   ├── src/ - Source code for the cassette-tools library.
│   │   └── lib.rs - Library code defining the Cassette trait and schema structures.
│   ├── Cargo.toml - Rust project configuration for the cassette-tools library.
│   └── .gitignore - Git ignore rules specific to the cassette-tools project.
│
├── node_modules/ - Root directory containing installed Node.js dependencies.
│
└── schemata/ - Collection of JSON schemas for Nostr protocol formats.
    ├── bundle/ - Bundled schemas for easy import in JavaScript applications.
    │   ├── schemas.bundle.js - Minified bundle of all schemas.
    │   ├── schemas.bundle.js.map - Source map for debugging the bundled code.
    │   ├── schemas.d.ts - TypeScript type definitions for the schema exports.
    │   └── schemas.js - Original schema JavaScript export file.
    └── nips/ - Nostr Implementation Possibilities (NIPs) schema definitions.
        ├── nip-01/ - Core protocol schema definitions.
        │   ├── kind-0/ - Metadata event schemas.
        │   ├── kind-1/ - Text note schemas.
        │   ├── messages/ - Protocol message schemas.
        │   ├── note/ - Note structure schemas.
        │   ├── note-unsigned/ - Unsigned note schemas.
        │   ├── secp256k1/ - Cryptographic key schemas.
        │   └── tag/ - Tag structure schemas.
        ├── nip-02/ - Contact list and follows-related schemas.
        ├── nip-11/ - Relay metadata and capabilities schemas.
        ├── nip-18/ - Reposts and quote schemas.
        ├── nip-22/ - Event references schemas.
        ├── nip-40/ - Expiration timestamp schemas.
        └── nip-65/ - Relay list metadata schemas.