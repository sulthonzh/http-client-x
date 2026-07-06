# Changelog

## [1.0.0] - 2026-06-18

### Added
- Initial release
- `HttpClient` class with GET, POST, PUT, PATCH, DELETE methods
- Request/response interceptors (`use`/`eject`)
- Authentication: Bearer, Basic, API Key, Custom
- Retry with exponential backoff + jitter
- Request timeout handling
- Automatic JSON parsing
- CLI tool with all HTTP methods, headers, query params, output to file
- Configuration save/load (CLI)
- Full TypeScript definitions
- 39 tests (all passing)
