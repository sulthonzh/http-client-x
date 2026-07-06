# http-client-x

A fast, minimal HTTP client for Node.js with retries, interceptors, auth, and a CLI — without the bloat of axios or got.

## Features

- 🔌 **Minimal Dependencies** - Only `commander` for CLI; core HTTP client is zero-dependency
- 🚀 **Modern API** - Promise-based with async/await support
- 📦 **Request/Response Interceptors** - Middleware for request/response transformation
- 🔐 **Authentication** - Built-in support for Bearer, Basic Auth, API Key
- 🔄 **Retries** - Configurable retry logic with exponential backoff
- 🎯 **Timeouts** - Request and response timeout handling
- 📊 **Response Handling** - Automatic JSON parsing, error detection
- 🔍 **Request Debugging** - Built-in logging and debugging utilities
- 🎨 **CLI Tool** - Command-line HTTP client with common operations
- 🧪 **TypeScript Support** - Full TypeScript definitions included

## Built to Solve

Many Node.js HTTP libraries are either too heavy with dependencies or too basic for real-world use. `http-client-x` provides:

- A clean, modern API that follows HTTP best practices
- Practical features that developers actually need
- Core HTTP client with zero external dependencies (CLI uses `commander`)
- Comprehensive error handling and debugging capabilities

## Tech Stack

- JavaScript (ES modules)
- Node.js 18+
- Core library: zero dependencies
- CLI: uses `commander`
- TypeScript support
- Comprehensive test suite (39/39 passing)

## Quick Start

```javascript
import { HttpClient } from 'http-client-x';

const client = new HttpClient();

// Simple GET request
const response = await client.get('https://api.example.com/data');
console.log(response.data);

// POST request with JSON body
const result = await client.post('https://api.example.com/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// With authentication
const authClient = new HttpClient({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
});

const user = await authClient.get('/profile');
```

## CLI Usage

```bash
# Simple GET request
npx http-client-x get https://api.example.com/data

# POST with JSON
npx http-client-x post https://api.example.com/users -d '{"name":"John"}'

# With headers and authentication
npx http-client-x get https://api.example.com/protected \
  --header "Authorization: Bearer token" \
  --timeout 5000

# Save response to file
npx http-client-x get https://api.example.com/data --save response.json
```

## Installation

```bash
npm install http-client-x
```

## Why http-client-x?

| Feature | http-client-x | axios | got | node-fetch |
|---------|--------------|-------|-----|------------|
| Core deps | 0 | 1 | 13+ | 2 |
| Bundle size | ~9 KB | ~13 KB | ~50 KB+ | ~25 KB |
| CLI included | ✅ | ❌ | ❌ | ❌ |
| Interceptors | ✅ | ✅ | hooks | ❌ |
| Retry + backoff | ✅ | ❌ | ✅ | ❌ |
| TypeScript defs | ✅ | ✅ | ✅ | ✅ |
| Node 18+ ESM | ✅ | CJS | ✅ | ✅ |

## Real-World Examples

### API Client with Retry
```javascript
import { HttpClient } from 'http-client-x';

const client = new HttpClient({
  baseURL: 'https://api.github.com',
  timeout: 5000,
  retry: { attempts: 3, delay: 1000, backoffFactor: 2 }
});

// Automatically retries on 5xx and 429
const repos = await client.get('/users/sulthonzh/repos');
```

### Request/Response Interceptors
```javascript
const client = new HttpClient();

// Log every request
client.use({
  request: (config) => {
    console.log(`${config.method} ${config.url}`);
    return config;
  },
  response: (response) => {
    console.log(`← ${response.status} (${response.statusText})`);
    return response;
  }
});
```

### Multiple Auth Strategies
```javascript
const client = new HttpClient({
  baseURL: 'https://api.example.com',
  auth: { type: 'bearer', token: process.env.API_TOKEN }
});

// Per-request override
await client.post('/webhook', payload, {
  auth: { type: 'api-key', token: 'abc123', keyName: 'X-Webhook-Key' }
});
```

## Development

```bash
# Clone the repository
git clone https://github.com/sulthonzh/http-client-x
cd http-client-x

# Install dependencies
npm install

# Run tests
npm test

# Build for distribution
npm run build
```

## License

MIT License - see [LICENSE](LICENSE) for details.