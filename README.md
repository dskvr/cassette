> ATTENTION: Alpha! WASM interface has not yet been standardized, cassettes you make today might be broken tomorrow. 

# Cassette 📼

Portable nostr relays that you can scrub, dub and cast notes from. Mostly rust, compiled to WASM.

## What is a Cassette?

A cassette is a WebAssembly module containing Nostr events that implements the Nostr relay protocol. Think of it as a portable, queryable database that runs anywhere WebAssembly does - browsers, servers, edge workers, or CLI tools.

### Use Cases

- **Archival**: Store important events in a portable format
- **Testing**: Create deterministic test fixtures for Nostr clients
- **Offline**: Query events without network access
- **Distribution**: Share curated event collections
- **Privacy**: Keep events local while maintaining relay compatibility

## What's New in v0.6.2

- **🎚️ Renamed commands for better tape metaphor**:
  - `play` → `scrub` (moving through cassette content)
  - `cast` → `play` (playing cassette to relays)
- **🌐 Enhanced `listen` command**: Serve cassettes as a WebSocket relay with NIP-11 support
- **🎛️ New `deck` command**: Run a full Nostr relay with cassette storage backend, or continuously record from other relays
- **🔧 NIP-11 improvements**: Added `software` and `version` fields to relay information
- **🐛 Bug fixes**: Fixed WebSocket connection state issues in the server

> **Note**: The old commands (`play`, `cast`, `listen`) are deprecated but still work with warnings. Please use the new commands.

## NIPs Look:

- [x] **NIP-01** - Basic Relay Protocol (REQ/EVENT/EOSE/CLOSE)
- [x] **NIP-11** - Relay Information Document (relay metadata and capabilities)
- [ ] **NIP-42** - Authentication (framework implemented, functionality planned)
- [x] **NIP-45** - Event Counts (COUNT queries for efficient event counting)
- [x] **NIP-50** - Search Capability (text search with relevance ranking)

## Table of Contents

- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Record a cassette](#record-a-cassette)
  - [Scrub through a cassette](#scrub-through-a-cassette)
  - [Dub a Mixtape](#dub-a-mixtape)
  - [Play to Relays](#play-to-relays)
  - [Listen - Serve cassettes as relay](#listen---serve-cassettes-as-relay)
  - [Deck - Continuous record and serve](#deck---continuous-record-and-serve)
- [CLI Commands](#cli-commands)
  - [`record`](#record---record-events-onto-cassettes)
  - [`scrub`](#scrub---scrub-through-cassettes-send-a-req)
  - [`dub`](#dub---combine-cassettes-into-a-mixtape)
  - [`play`](#play---play-events-to-nostr-relays)
  - [`listen`](#listen---serve-cassettes-as-websocket-relay)
  - [`deck`](#deck---continuous-record-and-serve)
- [Advanced Configuration](#advanced-configuration)
  - [Modular NIP Support](#modular-nip-support)
    - [NIP-01 (Basic Relay Protocol)](#nip-01-basic-relay-protocol)
    - [NIP-11 (Relay Information Document)](#nip-11-relay-information-document)
    - [NIP-45 (Event Counts)](#nip-45-event-counts)
    - [NIP-42 (Authentication)](#nip-42-authentication)
    - [NIP-50 (Search Capability)](#nip-50-search-capability)
  - [Combining NIPs](#combining-nips)
  - [Filtering and Querying](#filtering-and-querying)
  - [Performance and Size Optimization](#performance-and-size-optimization)
- [Building from Source](#building-from-source)
- [Project Structure](#project-structure)
- [WebAssembly Interface](#webassembly-interface)
- [Tape Decks](#tape-decks)
- [Advanced Usage](#advanced-usage)
  - [Running Cassettes as Relays](#running-cassettes-as-relays)
  - [Creating Custom Cassettes](#creating-custom-cassettes)
- [Contributing](#contributing)
- [Migration Guide](#migration-guide)
- [License](#license)

## Quick Start

Download the latest `cli` binary from [releases](https://github.com/dskvr/cassette/releases/latest).

_**Knowledge is power:** The `cli` includes an ability to both `record` and `scrub` cassettes (create/read). Cassettes respond to `REQ` messages to `stdin` with `EVENT`, `NOTICE` and `EOSE` messages to `stdout`._

### Prerequisites
- [Rust and Cargo](https://www.rust-lang.org/)

### Record a cassette

```bash
# From a relay
nak req -k 1 -l 100 wss://nos.lol | cassette record --name my-notes

# From a file
cassette record events.json --name my-notes

# Output: my-notes.wasm
```

### Scrub through a cassette

```bash
# Get all events
cassette scrub my-notes.wasm

# Filter by kind
cassette scrub my-notes.wasm --kinds 1

# Search events
cassette scrub my-notes.wasm --search "bitcoin"
```

### Dub a Mixtape

```bash
cassette dub alice.wasm bob.wasm combined.wasm
```

### Play to Relays

```bash
cassette play my-notes.wasm --relays wss://relay.damus.io
```

### Listen - Serve cassettes as relay

```bash
cassette listen my-notes.wasm

# Connect with any Nostr client
nak req ws://localhost:7777 -k 1 -l 10
```

### Deck - Full relay with cassette backend

```bash
# Run a writable relay (default mode)
cassette deck --name my-relay

# Record from other relays (record mode)
cassette deck --mode record --relays wss://relay.damus.io

# Connect to your deck relay
nak req ws://localhost:7777 -k 1 -l 10
nak event ws://localhost:7777 '{"content": "Hello cassette deck!"}'
```


## CLI Commands

### `record` - Record events onto cassettes

```bash
cassette record [OPTIONS] [INPUT_FILE]

# Options:
#   -n, --name         Name for the cassette
#   -d, --description  Description of contents
#   -a, --author       Author/curator name
#   -o, --output       Output directory (default: ./cassettes)
#   --no-bindings      Skip JavaScript bindings, WASM only
#   --nip-11           Enable NIP-11 (Relay Information Document)
#   --nip-42           Enable NIP-42 (Authentication)
#   --nip-45           Enable NIP-45 (Event Counts)
#   --nip-50           Enable NIP-50 (Search Capability)
#   --relay-name       Name for NIP-11
#   --relay-description Description for NIP-11
#   --relay-contact    Contact for NIP-11
#   --relay-pubkey     Owner pubkey for NIP-11

# Examples:
# Basic recording from relay
nak req -k 1 -l 100 wss://nos.lol | cassette record --name "my-notes"

# Record specific kinds from relay
nak req -k 30023 wss://relay.nostr.band | cassette record -n "long-form"

# From JSON file
cassette record my-events.json --name "my-backup"

# From NDJSON stream
cat events.ndjson | cassette record --name "stream-backup"

# With author metadata
cassette record events.json --name "curated" --author "Alice" \
  --description "Curated Bitcoin discussions"

# Enable COUNT support (NIP-45)
cassette record events.json --nip-45 --name "countable"

# Enable search support (NIP-50)
cassette record events.json --nip-50 --name "searchable"

# Full-featured relay with all NIPs
cassette record events.json --nip-11 --nip-45 --nip-50 --name "full-relay" \
  --relay-name "My Archive" \
  --relay-description "Personal event archive with search" \
  --relay-contact "admin@example.com" \
  --relay-pubkey "npub1..."

# Record from multiple relays
nak req -k 1 wss://relay.damus.io wss://nos.lol | cassette record -n "multi-relay"

# Custom output directory
cassette record events.json --name "backup" --output ./backups/2024
```

### `scrub` - Scrub through cassettes (send a `req`)

```bash
cassette scrub [OPTIONS] <CASSETTE>

# Options:
#   -s, --subscription  Subscription ID (default: sub1)
#   -f, --filter       Custom filter JSON
#   -k, --kinds        Event kinds to return
#   -a, --authors      Filter by authors
#   -l, --limit        Maximum events to return
#   --since            Events after timestamp
#   --until            Events before timestamp
#   -o, --output       Output format: json or ndjson
#   --info             Show NIP-11 relay information
#   --count            Perform COUNT query (NIP-45)
#   --search           Search query for NIP-50 text search
#   --relay-name       Set name for dynamic NIP-11 info
#   --relay-description Set description for dynamic NIP-11 info
#   --relay-contact    Set contact for dynamic NIP-11 info
#   --relay-pubkey     Set owner pubkey for dynamic NIP-11 info

# Examples:
# Basic queries
cassette scrub my-notes.wasm                        # Get all events
cassette scrub my-notes.wasm --kinds 1 --limit 50   # Text notes only
cassette scrub my-notes.wasm --kinds 0 --kinds 3    # Metadata and contacts

# Filter by author
cassette scrub archive.wasm --authors npub1abc... --authors npub1def...

# Time-based filtering
cassette scrub events.wasm --since 1700000000 --until 1700100000

# Complex filter JSON
cassette scrub archive.wasm --filter '{"#t": ["bitcoin", "lightning"]}'
cassette scrub events.wasm --filter '{"#p": ["npub1..."], "kinds": [1, 7]}'

# Output formats
cassette scrub events.wasm --output ndjson | grep "pattern"
cassette scrub events.wasm --output json | jq '.[] | select(.kind == 1)'

# NIP-11 relay information
cassette scrub relay.wasm --info
cassette scrub any.wasm --info --relay-name "Custom Name" \
  --relay-description "Runtime description"

# COUNT queries (NIP-45)
cassette scrub events.wasm --count --kinds 1        # Count text notes
cassette scrub events.wasm --count --authors npub1... # Count by author
cassette scrub events.wasm --count --since 1700000000 # Count recent

# Search queries (NIP-50)
cassette scrub search.wasm --search "bitcoin"
cassette scrub search.wasm --search "nostr protocol" --kinds 1
cassette scrub search.wasm --search "lightning" --limit 20

# Combine search with filters
cassette scrub data.wasm --search "bitcoin" --kinds 1 --authors npub1...

# Interactive mode with visual UI
cassette scrub my-notes.wasm --interactive
```

### `dub` - Combine cassettes into a Mixtape

```bash
cassette dub [OPTIONS] <CASSETTES...> <OUTPUT>

# Options:
#   -n, --name         Name for output cassette
#   -d, --description  Description
#   -a, --author       Author/curator
#   -f, --filter       Apply filters when combining
#   -k, --kinds        Include only these kinds
#   --authors          Include only these authors
#   -l, --limit        Limit total events
#   --since            Events after timestamp
#   --until            Events before timestamp

# Examples:
# Basic merge
cassette dub cassette1.wasm cassette2.wasm combined.wasm

# Merge all cassettes in directory
cassette dub *.wasm all-events.wasm --name "Complete Archive"

# Merge with metadata
cassette dub alice.wasm bob.wasm carol.wasm team.wasm \
  --name "Team Notes" \
  --description "Combined notes from the team" \
  --author "Team Lead"

# Filter during merge
cassette dub raw/*.wasm clean.wasm --kinds 1 --kinds 30023
cassette dub *.wasm recent.wasm --since 1700000000
cassette dub *.wasm limited.wasm --limit 1000

# Merge specific authors only
cassette dub full/*.wasm authors.wasm \
  --authors npub1abc... --authors npub1def...

# Time window merge
cassette dub archive/*.wasm january.wasm \
  --since 1704067200 --until 1706745600

# Create curated collection
cassette dub raw/*.wasm curated.wasm \
  --filter '{"#t": ["bitcoin", "lightning"], "kinds": [1, 30023]}' \
  --name "Bitcoin & Lightning Content" \
  --description "Curated Bitcoin and Lightning discussions"

# Merge and enable search
cassette dub *.wasm searchable.wasm --nip-50 --name "Searchable Archive"
```

### `play` - Play events to Nostr relays

```bash
cassette play [OPTIONS] <CASSETTES...> --relays <RELAYS...>

# Options:
#   -r, --relays       Target relay URLs (required)
#   -c, --concurrency  Max concurrent connections (default: 5)
#   -t, --throttle     Delay between events in ms (default: 100)
#   --timeout          Connection timeout in seconds (default: 30)
#   --dry-run          Preview without sending

# Examples:
# Basic play to single relay
cassette play events.wasm --relays wss://relay.damus.io

# Play to multiple relays
cassette play *.wasm --relays wss://nos.lol wss://relay.nostr.band

# Play multiple cassettes
cassette play alice.wasm bob.wasm --relays wss://relay.damus.io

# Test with dry-run (preview without sending)
cassette play archive.wasm --relays ws://localhost:7000 --dry-run

# Adjust concurrency for large broadcasts
cassette play huge-archive.wasm --relays wss://relay.damus.io \
  --concurrency 10 --throttle 50

# Set custom timeout for slow relays
cassette play events.wasm --relays wss://slow-relay.example.com \
  --timeout 60

# Play from multiple directories
cassette play 2023/*.wasm 2024/*.wasm --relays wss://archive.relay.io

# Verbose output to see progress
cassette play my-notes.wasm --relays wss://relay.damus.io --verbose

# Play with custom NIP-11 metadata
cassette play events.wasm --relays wss://relay.damus.io \
  --relay-name "My Backup" --relay-description "Personal archive"
```

### `listen` - Serve cassettes as WebSocket relay

```bash
cassette listen [OPTIONS] <CASSETTES...>

# Options:
#   -p, --port         Port to listen on (auto-selects if not specified)
#   --bind             Bind address (default: 127.0.0.1)
#   --tls              Enable TLS/WSS
#   --tls-cert         Path to TLS certificate
#   --tls-key          Path to TLS key
#   -v, --verbose      Show connection details

# Examples:
# Serve single cassette (auto-selects port)
cassette listen my-notes.wasm

# Serve on specific port
cassette listen *.wasm --port 8080

# Serve from multiple directories
cassette listen cassettes/*.wasm archives/*.wasm --port 7777

# Listen on all interfaces (accessible from network)
cassette listen dir/*.wasm --bind 0.0.0.0 --port 1337

# Enable HTTPS/WSS with auto-generated certificate
cassette listen secure.wasm --tls --port 443

# Use custom TLS certificate
cassette listen relay.wasm --tls \
  --tls-cert /path/to/cert.pem \
  --tls-key /path/to/key.pem \
  --port 443

# Verbose mode to see connections
cassette listen archive.wasm --verbose

# Serve specific cassettes by name
cassette listen alice.wasm bob.wasm carol.wasm --port 8080

# Production deployment
cassette listen /var/cassettes/*.wasm \
  --bind 0.0.0.0 \
  --port 80 \
  --tls \
  --verbose
```

### `deck` - Full relay with cassette backend

```bash
cassette deck [OPTIONS]

# Options:
#   -m, --mode         Mode: 'relay' (default) or 'record'
#   -r, --relays       Relay URLs to record from (record mode only)
#   -n, --name         Base name for cassettes (default: deck)
#   -o, --output       Output directory (default: ./deck)
#   -p, --port         Port to serve on (default: 7777)
#   --bind             Bind address (default: 127.0.0.1)
#   -e, --event-limit  Max events per cassette (default: 10000)
#   -s, --size-limit   Max cassette size in MB (default: 100)
#   -d, --duration     Recording duration per cassette in seconds (default: 3600)
#   -f, --filter       Custom filter JSON (record mode only)
#   -k, --kinds        Event kinds to record (record mode only)
#   -a, --authors      Authors to filter (record mode only)
#   --nip-11           Enable NIP-11 support
#   --nip-45           Enable NIP-45 (COUNT) support
#   --nip-50           Enable NIP-50 (search) support
#   -v, --verbose      Show verbose output
#   --skip-validation  Skip event validation (relay mode)

# Examples:

## RELAY MODE (default) - Run a full Nostr relay
# Basic writable relay
cassette deck

# Custom configuration
cassette deck --name my-relay --event-limit 50000 --port 8080

# Production relay with all features
cassette deck --name production \
  --output /var/cassettes \
  --bind 0.0.0.0 \
  --port 443 \
  --nip-11 --nip-45 --nip-50 \
  --relay-name "My Cassette Relay" \
  --relay-description "High-performance relay with cassette storage" \
  --relay-contact "admin@example.com"

# Test relay with validation disabled
cassette deck --skip-validation --verbose

# Custom rotation settings
cassette deck --event-limit 100000 --size-limit 500 --duration 7200

## RECORD MODE - Mirror and archive other relays
# Record from single relay
cassette deck --mode record --relays wss://relay.damus.io

# Record from multiple relays
cassette deck --mode record \
  --relays wss://nos.lol wss://relay.nostr.band \
  --name archive

# Filter specific kinds
cassette deck --mode record \
  --relays wss://relay.damus.io \
  --kinds 1 --kinds 30023

# Record specific authors
cassette deck --mode record \
  --relays wss://relay.nostr.band \
  --authors npub1alice... --authors npub1bob...

# Custom filter JSON
cassette deck --mode record \
  --relays wss://relay.nostr.band \
  --filter '{"#t": ["bitcoin", "lightning"]}'

# Features:
## Relay Mode:
# - Full NIP-01 compliant Nostr relay
# - Accepts and stores EVENT messages from clients
# - Automatic cassette rotation based on limits
# - Serves both current buffer and archived cassettes
# - Hot-loads newly compiled cassettes
# - Optional event validation
# - NIP-11 relay information support

## Record Mode:
# - Connects to other relays as a client
# - Records events matching filters
# - Compiles cassettes in background
# - Serves recorded cassettes via WebSocket
# - Automatic reconnection on failure
# - Supports complex filtering

# Features:
# - Serves cassettes as a NIP-01 compliant WebSocket relay
# - Supports NIP-11 relay information via HTTP with Accept: application/nostr+json
# - Handles multiple cassettes - aggregates responses from all loaded cassettes
# - Auto-selects available port if not specified (tries 7777, 8080, 8888, etc.)
# - Compatible with all Nostr clients (nak, nostcat, web clients, etc.)
# - Each connection gets a fresh state to prevent cross-connection contamination
```

## Advanced Configuration

### Modular NIP Support

Cassettes support modular NIP (Nostr Implementation Possibilities) implementation, allowing you to build cassettes with exactly the features you need:

#### NIP-01 (Basic Relay Protocol)
Always included. Provides REQ/EVENT/EOSE/CLOSE message handling.

```bash
# Basic cassette with only NIP-01
cassette record events.json --name basic-relay
```

#### NIP-11 (Relay Information Document)
Always available for basic info. Enables dynamic relay metadata and capability discovery.

```bash
# With static relay information
cassette record events.json --name my-relay --nip-11 \
  --relay-name "My Relay" \
  --relay-description "My curated event collection" \
  --relay-contact "contact@example.com" \
  --relay-pubkey "npub1abc..."

# View relay information
cassette scrub my-relay.wasm --info

# Dynamic relay info at runtime
cassette scrub any-cassette.wasm --info \
  --relay-name "Custom Name" \
  --relay-description "Runtime description"
```

> **Note**: NIP-11 info automatically includes `software: "@sandwichfarm/cassette"` and the current CLI version.

#### NIP-45 (Event Counts)
Adds COUNT query support for efficient event counting without retrieving full events.

```bash
# Record with COUNT support
cassette record events.json --name countable --nip-45

# Query event counts
cassette scrub countable.wasm --count --kinds 1        # Count kind 1 events
cassette scrub countable.wasm --count --authors npub1...  # Count by author
cassette scrub countable.wasm --count --since 1700000000 # Count recent events
```

#### NIP-42 (Authentication)
Framework for authentication support (currently placeholder for future implementation).

```bash
# Record with auth framework
cassette record events.json --name secure --nip-42
```

#### NIP-50 (Search Capability)
Adds text search functionality with relevance-based ranking instead of chronological ordering.

```bash
# Record with search support
cassette record events.json --name searchable --nip-50

# Basic text search
cassette scrub searchable.wasm --search "bitcoin lightning"

# Search with additional filters
cassette scrub searchable.wasm --search "nostr protocol" --kinds 1 --limit 20

# Search supports extensions (advanced)
cassette scrub searchable.wasm --search "bitcoin domain:example.com"
cassette scrub searchable.wasm --search "news language:en"
```

### Combining NIPs

You can combine multiple NIPs for full-featured cassettes:

```bash
# Full-featured cassette
cassette record events.json --name full-relay \
  --nip-11 --nip-42 --nip-45 --nip-50 \
  --description "Full-featured Nostr archive" \
  --contact "contact@example.com" \
  --pubkey "npub1abc..."

# Test all features
cassette scrub full-relay.wasm --info                    # Show relay info
cassette scrub full-relay.wasm --count --kinds 1         # Count events
cassette scrub full-relay.wasm --search "bitcoin"        # Search events
cassette scrub full-relay.wasm --kinds 1 --limit 10      # Get events
```

### Filtering and Querying

Cassettes support comprehensive NIP-01 filtering:

```bash
# By event kind
cassette scrub relay.wasm --kinds 1 --kinds 30023

# By author (accepts npub, hex, or partial)
cassette scrub relay.wasm --authors npub1abc... --authors npub1def...

# Time-based filtering
cassette scrub relay.wasm --since 1700000000 --until 1700100000

# Combination filters
cassette scrub relay.wasm --kinds 1 --authors npub1abc... --limit 50

# Custom JSON filters (advanced)
cassette scrub relay.wasm --filter '{"#t": ["bitcoin"], "#p": ["npub1..."]}'

# Output formats
cassette scrub relay.wasm --kinds 1 --output ndjson | jq .
```

### Performance and Size Optimization

Different NIP combinations affect cassette size and capabilities:

- **NIP-01 only**: Smallest size, basic querying
- **+ NIP-11**: Adds ~2KB, relay metadata support  
- **+ NIP-45**: Adds ~5KB, efficient event counting
- **+ NIP-50**: Adds ~4KB, text search with relevance ranking
- **+ NIP-42**: Adds ~3KB, authentication framework

Choose NIPs based on your use case:
- **Archival**: NIP-01 + NIP-11 for basic archive with metadata
- **Analytics**: NIP-01 + NIP-11 + NIP-45 for counting and analysis
- **Search**: NIP-01 + NIP-11 + NIP-50 for text search capabilities
- **Full-featured**: All NIPs for maximum compatibility

## Building from Source

### Prerequisites

- Rust and Cargo
- wasm32-unknown-unknown target: `rustup target add wasm32-unknown-unknown`

### Build

```bash
git clone https://github.com/dskvr/cassette.git
cd cassette
cargo build --release

# Binary will be at: target/release/cassette
```

## Project Structure

```
cassette/
├── cli/                    # Command-line interface
├── cassette-tools/         # Core WASM functionality and modular NIP support
├── loaders/                # Language-specific tape decks
│   ├── js/                 # JavaScript/TypeScript deck
│   ├── py/                 # Python deck
│   ├── rust/               # Rust deck
│   ├── go/                 # Go deck
│   ├── cpp/                # C++ deck
│   └── dart/               # Dart deck
├── boombox/               # WebSocket relay server for cassettes
└── gui/                   # Web interface for testing
```

### Components

- **CLI**: Command-line tool for creating and querying cassettes
- **Cassette Tools**: Rust library providing memory management and modular NIP implementations (NIP-01, NIP-11, NIP-42, NIP-45, NIP-50)
- **Tape Decks**: Language-specific libraries for playing cassettes in JavaScript/TypeScript, Python, Rust, Go, C++, and Dart
- **Boombox**: WebSocket server that serves cassettes as Nostr relays
- **GUI**: Web interface for testing cassettes in the browser

## WebAssembly Interface

Cassettes implement a simplified WebAssembly interface:

```rust
// Core export (v0.5.0+)
fn send(ptr, len) -> ptr       // Handle all NIP-01 messages (REQ, CLOSE, EVENT, COUNT)

// NIP-11 support (always available)
fn info() -> ptr               // Relay information document

// NIP-11 dynamic configuration (when nip11 feature enabled)
fn set_relay_info(ptr, len) -> i32  // Set relay metadata

// Memory management
fn alloc_buffer(size) -> ptr
fn dealloc_string(ptr, len)
fn get_allocation_size(ptr) -> size
```

The `send` method accepts any NIP-01 protocol message in JSON format, including:
- `["REQ", subscription_id, filters...]` - Query events
- `["CLOSE", subscription_id]` - Close subscription
- `["EVENT", subscription_id, event]` - Submit event (for compatible cassettes)
- `["COUNT", subscription_id, filters...]` - Count events (NIP-45)

This unified interface allows cassettes to be loaded by any compatible runtime without language-specific bindings.

## Tape Decks

Cassette provides official tape decks for multiple programming languages, allowing you to play cassettes in your applications regardless of your tech stack. All tape decks implement the same interface and provide consistent functionality across languages.

### Available Tape Decks

#### JavaScript/TypeScript
- **Package**: `cassette-loader`
- **Installation**: `npm install cassette-loader`
- **Features**: Browser and Node.js support, TypeScript definitions, event deduplication
- **[Tape Deck Documentation](./loaders/js/README.md)**

```javascript
import { loadCassette } from 'cassette-loader';

const result = await loadCassette('/path/to/cassette.wasm');
if (result.success) {
    const response = result.cassette.methods.send('["REQ", "sub1", {"kinds": [1]}]');
    console.log(response);
}
```

#### Python
- **Package**: `cassette-loader`
- **Installation**: `pip install cassette-loader`
- **Features**: Memory management, event deduplication, debug mode
- **[Tape Deck Documentation](./loaders/py/README.md)**

```python
from cassette_loader import load_cassette

result = load_cassette(wasm_bytes, name='my-cassette')
if result['success']:
    cassette = result['cassette']
    response = cassette.send('["REQ", "sub1", {"kinds": [1]}]')
```

#### Rust
- **Crate**: `cassette-loader`
- **Installation**: Add to `Cargo.toml`
- **Features**: Native performance, thread-safe event tracking, comprehensive error handling
- **[Tape Deck Documentation](./loaders/rust/README.md)**

```rust
use cassette_loader::Cassette;

let mut cassette = Cassette::load("path/to/cassette.wasm", true)?;
let response = cassette.send(r#"["REQ", "sub1", {"kinds": [1]}]"#)?;
```

#### Go
- **Package**: `github.com/cassette/loaders/go`
- **Installation**: `go get github.com/cassette/loaders/go`
- **Features**: Thread-safe operations, debug logging
- **[Tape Deck Documentation](./loaders/go/README.md)**

```go
import cassette "github.com/cassette/loaders/go"

c, err := cassette.LoadCassette("path/to/cassette.wasm", true)
result, err := c.Send(`["REQ", "sub1", {"kinds": [1]}]`)
```

#### C++
- **Library**: `cassette-loader`
- **Installation**: CMake integration
- **Features**: Exception-based error handling, MSGB format support
- **[Tape Deck Documentation](./loaders/cpp/README.md)**

```cpp
#include <cassette_loader.hpp>

cassette::Cassette cassette("path/to/cassette.wasm", true);
std::string response = cassette.send(R"(["REQ", "sub1", {"kinds": [1]}])");
```

#### Dart
- **Package**: `cassette_loader`
- **Installation**: Add to `pubspec.yaml`
- **Features**: Web support, async operations
- **[Tape Deck Documentation](./loaders/dart/README.md)**

```dart
import 'package:cassette_loader/cassette_loader.dart';

final cassette = await Cassette.load('path/to/cassette.wasm');
final response = cassette.send('["REQ", "sub1", {"kinds": [1]}]');
```

### Common Features

All tape decks provide:
- **Unified Interface**: Single `send()` method for all NIP-01 messages
- **Event Deduplication**: Automatic filtering of duplicate events
- **Memory Management**: Proper handling of WASM memory allocation/deallocation
- **Debug Support**: Optional verbose logging for troubleshooting
- **Error Handling**: Consistent error reporting across languages

### Creating Your Own Tape Deck

If you need to create a tape deck for a language not listed above, implement these core functions:

1. **Load WASM module** - Instantiate the WebAssembly module
2. **Memory management** - Handle string passing between host and WASM
3. **Call `send()` function** - Pass messages and retrieve responses
4. **Event tracking** - Implement deduplication for EVENT messages

See the existing tape deck implementations for reference patterns.

## Advanced Usage

### Running Cassettes as Relays

Using the Boombox server, cassettes can be served as WebSocket endpoints:

```bash
cd boombox
bun install
bun index.ts

# Cassettes in ./cassettes directory are now available at ws://localhost:3001
```

### Creating Custom Cassettes

Beyond recording existing events, you can create cassettes programmatically using `cassette-tools`:

```rust
use cassette_tools::{string_to_ptr, ptr_to_string};

#[no_mangle]
pub extern "C" fn send(ptr: *const u8, len: usize) -> *mut u8 {
    let message = ptr_to_string(ptr, len);
    
    // Parse the message to determine type
    let parsed: Vec<serde_json::Value> = serde_json::from_str(&message).unwrap();
    let command = parsed[0].as_str().unwrap();
    
    let response = match command {
        "REQ" => handle_req_command(&parsed),
        "CLOSE" => handle_close_command(&parsed),
        "COUNT" => handle_count_command(&parsed),
        _ => json!(["NOTICE", "Unknown command"]).to_string(),
    };
    
    string_to_ptr(response)
}
```

See `cassette-tools/` for the full API.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

AI Tips:
1. Use BDD! Write tests and Docs First. The default agent on this repo uses tests and docs as its North Star.
2. Use Context Programming for mission critical features. AKA Don't vibe API or business logic, but yes vibe interfaces, SPAs and prototypes.

## Migration Guide

### v0.6.2
- Command renames for better analog tape metaphor:
  - `cassette play` → `cassette scrub` (view cassette contents)
  - `cassette cast` → `cassette play` (play to relays)
- The old commands still work but show deprecation warnings
- Update your scripts to use the new command names
- NIP-11 relay info now includes `software` and `version` fields automatically

## License

MIT
