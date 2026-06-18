# http-client-x

Zero-dependency HTTP client library for Node.js with modern features and practical utilities.

## Features

- 🔌 **Zero Dependencies** - Pure Node.js implementation, no external dependencies
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
- Zero external dependencies for security and simplicity
- Comprehensive error handling and debugging capabilities

## Tech Stack

- JavaScript (ES modules)
- Node.js 18+
- Zero external dependencies
- TypeScript support
- Comprehensive test suite

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

## Documentation

See the [full documentation](docs/API.md) for complete API reference and examples.

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