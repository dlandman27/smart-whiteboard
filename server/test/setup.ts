// Server test setup
// Individual test suites that need a database should create an in-memory
// SQLite instance rather than importing the shared singleton.
//
// The supabaseAdmin mock is set up per-test-file via vi.mock() since
// different tests need different mock behaviors. See auth.test.ts and
// credentials.test.ts for examples.
