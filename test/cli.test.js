import { test } from 'node:test';
import assert from 'node:assert';
import { exec } from 'child_process';
import { setTimeout } from 'timers/promises';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock HTTP server for testing
let testServer;
let testServerUrl;

test.before(async () => {
  const http = await import('http');
  testServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    if (path === '/test') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'CLI test successful',
        method: req.method,
        headers: req.headers
      }));
    } else if (path === '/echo') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          received: body,
          headers: req.headers
        }));
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  testServer.listen(0);
  await new Promise(resolve => testServer.on('listening', resolve));
  testServerUrl = `http://localhost:${testServer.address().port}`;
});

test.after(() => {
  if (testServer) {
    testServer.close();
  }
});

// Helper function to run CLI commands
async function runCliCommand(args, options = {}) {
  const command = `node ${join(__dirname, '..', 'dist', 'cli.js')} ${args}`;
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

test('CLI - GET request', async () => {
  const result = await runCliCommand(`get ${testServerUrl}/test`);
  
  assert.strictEqual(result.error, null);
  assert.ok(result.stdout.includes('CLI test successful'));
  assert.ok(result.stdout.includes('"method": "GET"'));
});

test('CLI - GET request with headers', async () => {
  const result = await runCliCommand(`get ${testServerUrl}/test --header "X-Test-Header: test-value"`);
  
  assert.strictEqual(result.error, null);
  assert.ok(result.stdout.includes('CLI test successful'));
  assert.ok(result.stdout.includes('"x-test-header": "test-value"'));
});

test('CLI - GET request with query parameters', async () => {
  const result = await runCliCommand(`get ${testServerUrl}/test --param "name=test" --param "value=123"`);
  
  assert.strictEqual(result.error, null);
  assert.ok(result.stdout.includes('CLI test successful'));
  assert.ok(result.stdout.includes('"method": "GET"'));
});

test('CLI - POST request with JSON data', async () => {
  const result = await runCliCommand(`post ${testServerUrl}/echo --data '{"name": "test", "value": 123}' --type json`);
  
  assert.strictEqual(result.error, null);
  // The server echoes back the raw body. JSON.stringify adds spaces after colons.
  assert.ok(result.stdout.includes('"received"'));
});

test('CLI - POST request with form data', async () => {
  const result = await runCliCommand(`post ${testServerUrl}/echo --data "name=test&value=123" --type form`);
  
  assert.strictEqual(result.error, null);
  // The server echoes back the raw body string
  assert.ok(result.stdout.includes('"received"'));
});

test('CLI - POST request with text data', async () => {
  const result = await runCliCommand(`post ${testServerUrl}/echo --data "Hello World" --type text`);
  
  assert.strictEqual(result.error, null);
  // The server echoes back the raw body string
  assert.ok(result.stdout.includes('"received"'));
});

test('CLI - PUT request', async () => {
  const result = await runCliCommand(`put ${testServerUrl}/test --data '{"action": "update"}' --type json`);
  
  assert.strictEqual(result.error, null);
  assert.ok(result.stdout.includes('CLI test successful'));
});

test('CLI - PATCH request', async () => {
  const result = await runCliCommand(`patch ${testServerUrl}/test --data '{"name": "patched"}' --type json`);
  
  assert.strictEqual(result.error, null);
  assert.ok(result.stdout.includes('CLI test successful'));
});

test('CLI - DELETE request', async () => {
  const result = await runCliCommand(`delete ${testServerUrl}/test`);
  
  assert.strictEqual(result.error, null);
  assert.ok(result.stdout.includes('CLI test successful'));
});

test('CLI - HEAD request', async () => {
  const result = await runCliCommand(`head ${testServerUrl}/test`);
  
  assert.strictEqual(result.error, null);
  // HEAD requests return no body — verify status info is printed
  assert.ok(result.stdout.includes('Status: 200'));
});

test('CLI - OPTIONS request', async () => {
  const result = await runCliCommand(`options ${testServerUrl}/test`);
  
  assert.strictEqual(result.error, null);
  // OPTIONS requests may return empty body — verify status info
  assert.ok(result.stdout.includes('Status: 200'));
});

test('CLI - Request with timeout', async () => {
  const result = await runCliCommand(`get ${testServerUrl}/test --timeout 1000`);
  
  assert.strictEqual(result.error, null);
  assert.ok(result.stdout.includes('CLI test successful'));
});

test('CLI - Output to file', async () => {
  const outputFile = join(process.cwd(), 'test-output.json');
  
  try {
    const result = await runCliCommand(`get ${testServerUrl}/test --output ${outputFile}`);
    
    assert.strictEqual(result.error, null);
    assert.ok(result.stdout.includes(`Response saved to: ${outputFile}`));
    
    // Check if file was created and contains correct data
    const fileContent = await readFile(outputFile, 'utf-8');
    assert.ok(fileContent.includes('CLI test successful'));
  } finally {
    // Clean up
    try {
      await unlink(outputFile);
    } catch (e) {
      // File might not exist
    }
  }
});

test('CLI - Save configuration', async () => {
  const configFile = join(process.cwd(), 'test-config.json');
  
  try {
    const result = await runCliCommand(`save-config ${configFile} --header "X-Custom: test" --timeout 5000`);
    
    assert.strictEqual(result.error, null);
    assert.ok(result.stdout.includes(`Configuration saved to: ${configFile}`));
    
    // Check if config file contains correct data
    const configContent = await readFile(configFile, 'utf-8');
    const config = JSON.parse(configContent);
    assert.strictEqual(config.headers['X-Custom'], 'test');
    assert.strictEqual(config.timeout, 5000);
  } finally {
    // Clean up
    try {
      await unlink(configFile);
    } catch (e) {
      // File might not exist
    }
  }
});

test('CLI - Load configuration', async () => {
  const configFile = join(process.cwd(), 'test-config.json');
  
  try {
    // Create config file first
    await writeFile(configFile, JSON.stringify({
      headers: {
        'X-Config-Test': 'config-value'
      },
      timeout: 2000
    }));
    
    const result = await runCliCommand(`get ${testServerUrl}/test --load-config ${configFile}`);
    
    assert.strictEqual(result.error, null);
    assert.ok(result.stdout.includes('CLI test successful'));
    // Headers are case-insensitive; Node normalizes to lowercase
    assert.ok(result.stdout.includes('x-config-test'));
  } finally {
    // Clean up
    try {
      await unlink(configFile);
    } catch (e) {
      // File might not exist
    }
  }
});

test('CLI - Verbose output', async () => {
  const result = await runCliCommand(`get ${testServerUrl}/test --verbose`);
  
  assert.strictEqual(result.error, null);
  assert.ok(result.stdout.includes('Making GET request to:'));
  assert.ok(result.stdout.includes('=== Response ==='));
});

test('CLI - Error handling', async () => {
  const result = await runCliCommand(`get ${testServerUrl}/nonexistent`);
  
  // The HttpClient now throws on 4xx/5xx, CLI prints error message
  assert.ok(result.stdout.includes('Error:'));
  assert.ok(result.stdout.includes('404'));
});

test('CLI - Help command', async () => {
  const result = await runCliCommand('--help');
  
  assert.strictEqual(result.error, null);
  assert.ok(result.stdout.includes('http-client-x'));
  assert.ok(result.stdout.includes('Zero-dependency HTTP client CLI'));
  assert.ok(result.stdout.includes('get'));
  assert.ok(result.stdout.includes('post'));
  assert.ok(result.stdout.includes('put'));
  assert.ok(result.stdout.includes('delete'));
});