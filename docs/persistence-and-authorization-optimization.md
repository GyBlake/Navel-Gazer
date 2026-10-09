# Persistence and Authorization Optimization

## Conversation persistence

Conversation mutations are recorded in `conversations.json.ndjson` as versioned events instead of rewriting the full collection after every save. Supported events are upsert, delete, clear, and replace. The journal is replayed over the last JSON snapshot during startup.

- Each event is appended and synced before the mutation is reported as committed.
- A snapshot is compacted after 128 events, then the journal is truncated.
- Snapshot replacement is atomic and uses restrictive file permissions where supported.
- Legacy `conversations.json` snapshots remain readable.
- Invalid journal lines fail closed with a location-bearing error rather than silently discarding history.
- Mutations within a store instance are serialized to prevent overlapping saves from losing updates.

This reduces repeated serialization of the entire conversation collection. It does not yet encrypt data at rest, protect against another local process with the same user permissions, or guarantee recovery from hardware/filesystem failure. A partial final journal line is currently treated as corruption rather than silently ignored.

## Authorization decision cache

Authorization policies are immutable after creation. The runtime caches decisions by exact subject/resource/action tuple in a bounded 2,048-entry LRU associated with the policy object. A cache miss evaluates rules from last to first, preserving the existing last-matching-rule-wins behavior. The cache is an optimization only: it does not grant capabilities, mutate policies, or skip the runtime's authorization call.

## Evidence and provenance

Evidence and provenance remain human-readable and retain the source fields required to explain decisions. Cryptographic hashes are not yet used as a replacement for lineage. If integrity anchoring is added, it should be additive: hash canonicalized records and retain the evidence needed for inspection, audit, and incident response. A hash proves consistency against a trusted reference; it does not prove that an observation was true.

## Measurement boundary

These changes are structural optimizations, not a performance claim. No latency or disk-write benchmark is asserted. Benchmark cold startup, repeated saves, journal replay, compaction, and authorization hit/miss workloads before adding more complex caching or replacing Electron.
