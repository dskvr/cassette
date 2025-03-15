# SandwichsFavs Cassette

A WASM-based Nostr relay implementation for the Cassette platform. This project demonstrates how to implement NIP-01 and NIP-119 compliant Nostr relay functionality using WebAssembly.

## Project Overview

The project consists of:

- **sandwichs-favs**: A Rust implementation of a Nostr relay that gets compiled to WebAssembly
- **boombox**: A TypeScript server that loads and interacts with the WebAssembly module
- **nostr-proxy**: A WebSocket proxy for testing Nostr clients

## Build Instructions

### Prerequisites

- Rust and Cargo
- [Bun](https://bun.sh/) for running TypeScript code and scripts
- [nak](https://github.com/fiatjaf/nak) (recommended for testing)

### Building the WASM Module

You can build the WebAssembly module using the Makefile:

```bash
make build-wasm
```

This will:
1. Navigate to the `sandwichs-favs` directory and build the Rust project targeting WebAssembly
2. Process the WASM file to generate JavaScript bindings

If you prefer to do this manually:

1. Navigate to the `sandwichs-favs` directory and build the Rust project targeting WebAssembly:
   ```bash
   cd sandwichs-favs
   cargo build --target wasm32-unknown-unknown
   ```

2. Process the WASM file to generate JavaScript bindings:
   ```bash
   cd ../boombox
   bun scripts/process-wasm.js
   ```

### Running the Integration Tests

The project includes several Makefile commands to simplify testing:

```bash
# Run all integration tests (starts services if needed)
make test

# Only start the boombox and nostr-proxy services without running tests
make start-services

# Run just the filter tests (assumes services are already running)
make test-filters

# Display all available commands
make help
```

After the servers are running, you can manually test the Nostr relay functionality with various commands:

```bash
# Request 5 notes of kind 1
nak req -l 5 -k 1 localhost:3001

# Request notes with timestamps after a specific time
nak req -s 1741380000 localhost:3001

# Request notes with timestamps before a specific time
nak req -u 1741400000 localhost:3001

# Request notes by a specific ID
nak req -i 380c1dd962349cecbaf65eca3c66574f93ebbf7b1c1e5d7ed5bfc253c94c5211 localhost:3001

# Request notes with NIP-119 AND tag filtering (notes that have both 'value1' AND 'value2' t-tags)
make test-filters
```

### Logs and Debugging

Logs are stored in the `logs` directory:

```bash
# View boombox logs
tail -f ./logs/boombox.log

# View nostr-proxy logs
tail -f ./logs/nostr-proxy.log
```

To stop all servers and clean up logs:

```bash
make clean
```

## Nostr Protocol Implementation

The WebAssembly module implements the following NIP specifications:

### NIP-01: Basic Protocol

1. **REQ**: For requesting notes with various filters:
   - `kinds`: Filter by event kind
   - `authors`: Filter by author public key
   - `ids`: Filter by specific event IDs
   - `since`: Filter by timestamps after a specific time
   - `until`: Filter by timestamps before a specific time
   - `limit`: Limit the number of results
   - `#e`, `#p`, etc.: Filter by tags

2. **EVENT**: For sending events from the relay to clients

3. **CLOSE**: For closing subscriptions

### NIP-119: AND Tag Queries

This implementation supports AND conditions for tag filtering using the '&' prefix:

- `&t`: Match events with ALL specified 't' tag values
- `&e`: Match events with ALL specified 'e' tag values
- etc.

This allows for more precise filtering by requiring that all specified values for a given tag type must be present, rather than just any one of them.

Example usage in a test script:
```javascript
// Request events that have both 'value1' AND 'value2' as 't' tags
const reqMsg = ['REQ', '1:', {'&t': ['value1', 'value2']}];
```

## Project Structure

- `sandwichs-favs/`: The Rust WebAssembly implementation
  - `src/lib.rs`: The core Rust implementation of NIP-01 functionality
  - `notes.json`: Sample note data used by the relay

- `boombox/`: The TypeScript server that loads the WebAssembly module
  - `index.ts`: The main server implementation
  - `wasm/`: Directory for processed WebAssembly files
  - `scripts/process-wasm.js`: Script for processing the WASM file

- `nostr-proxy/`: A WebSocket proxy for testing
  - `index.ts`: The proxy server implementation

- `tests/`: Integration tests
  - `integration-test.sh`: Main integration test script
  - `test-nip119.js`: Tests NIP-119 AND tag filtering

## Advanced Customization

### Adding New Methods to the WebAssembly Module

1. Add the method to the Rust code in `sandwichs-favs/src/lib.rs`
2. Rebuild the WebAssembly module with `make build-wasm`
3. Update the bindings (if needed) with:
   ```bash
   echo "method1,method2" | bun scripts/update-wasm-bindings.js
   ```

For more details on the WebAssembly binding structure and common issues, see the `WASM-QUICKSTART.md` file. 