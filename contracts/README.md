# Contract reference

The JSON schemas use draft 2020-12 and describe proposed VibeScroller serialization. Their public-looking `$id` values identify the schema; they do not claim that the domain currently hosts it.

Runtime validation must also verify tenant ownership, evidence existence, timestamp ordering, repository path existence, line ranges, approval state, funding scope, and current lease. JSON-schema validity cannot prove those facts.

The synthetic fixtures contain no valid credentials and no real repository claims. Their hashes are illustrative fixed strings. Never use a fixture approval or job as a real authorization record.

Pin and generate compatible TypeScript validators in the implementation. Treat unknown fields as errors at security-sensitive boundaries. Version a breaking contract change and test an older runner's rejection behavior.
