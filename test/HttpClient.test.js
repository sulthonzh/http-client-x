import { test } from 'node:test';
import assert from 'node:assert';
import { setTimeout } from 'timers/promises';
import { HttpClient } from '../src/HttpClient.js';

// Mock HTTP server for testing
let testServer;
let testServerUrl;

test.before(async () => {
  // Create a test server
  const http = await import('http');
  testServer = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Parse path
    const path = url.pathname;
    
    if (path === '/get') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'GET request successful',
        query: url.searchParams.toString(),
        headers: req.headers
      }));
    } else if (path === '/post') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            message: 'POST request successful',
            data: jsonData,
            headers: req.headers
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } else if (path === '/error') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } else if (path === '/slow') {
      await new Promise(resolve => setTimeout(resolve, 100));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Slow response' }));
    } else if (path === '/retry') {
      if (req.headers['x-retry-count'] === '2') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Success after retry' }));
      } else {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' });
        res.end(JSON.stringify({ error: 'Too many requests' }));
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ path }));
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

test('HttpClient - GET request', async () => {
  const client = new HttpClient();
  const response = await client.get(`${testServerUrl}/get`);
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.message, 'GET request successful');
  assert.ok(response.headers['content-type'].includes('application/json'));
  assert.strictEqual(response.url, `${testServerUrl}/get`);
});

test('HttpClient - POST request with JSON', async () => {
  const client = new HttpClient();
  const data = { name: 'test', value: 123 };
  const response = await client.post(`${testServerUrl}/post`, data);
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.message, 'POST request successful');
  assert.deepStrictEqual(response.data.data, data);
});

test('HttpClient - PUT request', async () => {
  const client = new HttpClient();
  const data = { name: 'updated', value: 456 };
  const response = await client.put(`${testServerUrl}/post`, data);
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.message, 'POST request successful'); // Server treats PUT as POST
  assert.deepStrictEqual(response.data.data, data);
});

test('HttpClient - PATCH request', async () => {
  const client = new HttpClient();
  const data = { name: 'patched' };
  const response = await client.patch(`${testServerUrl}/post`, data);
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.message, 'POST request successful'); // Server treats PATCH as POST
  assert.deepStrictEqual(response.data.data, data);
});

test('HttpClient - DELETE request', async () => {
  const client = new HttpClient();
  const response = await client.delete(`${testServerUrl}/get`);
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.message, 'GET request successful');
});

test('HttpClient - Request with query parameters', async () => {
  const client = new HttpClient();
  const response = await client.get(`${testServerUrl}/get`, {
    params: { name: 'test', value: 123 }
  });
  
  assert.strictEqual(response.status, 200);
  assert.ok(response.data.query.includes('name=test'));
  assert.ok(response.data.query.includes('value=123'));
});

test('HttpClient - Request with custom headers', async () => {
  const client = new HttpClient();
  const response = await client.get(`${testServerUrl}/get`, {
    headers: { 'X-Custom-Header': 'test-value' }
  });
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.headers['x-custom-header'], 'test-value');
});

test('HttpClient - Request with authentication', async () => {
  const client = new HttpClient({
    auth: {
      type: 'bearer',
      token: 'test-token'
    }
  });
  
  const response = await client.get(`${testServerUrl}/get`);
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.headers['authorization'], 'Bearer test-token');
});

test('HttpClient - Request timeout', async () => {
  const client = new HttpClient({ timeout: 50 });
  
  try {
    await client.get(`${testServerUrl}/slow`);
    assert.fail('Should have timed out');
  } catch (error) {
    assert.ok(error.message.includes('timeout'));
  }
});

test('HttpClient - Retry mechanism', async () => {
  const client = new HttpClient({
    retry: {
      attempts: 3,
      delay: 10,
      retryCondition: (error) => {
        return error.response && error.response.status === 429;
      }
    }
  });
  
  const response = await client.get(`${testServerUrl}/retry`, {
    headers: { 'X-Retry-Count': '0' }
  });
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.message, 'Success after retry');
});

test('HttpClient - Interceptors', async () => {
  const client = new HttpClient();
  
  // Add request interceptor
  client.use({
    request: (config) => {
      config.headers['X-Interceptor'] = 'test';
      return config;
    }
  });
  
  // Add response interceptor
  client.use({
    response: (response) => {
      response.data.intercepted = true;
      return response;
    }
  });
  
  const response = await client.get(`${testServerUrl}/get`);
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.headers['x-interceptor'], 'test');
  assert.strictEqual(response.data.intercepted, true);
});

test('HttpClient - Base URL configuration', async () => {
  const client = new HttpClient({
    baseURL: testServerUrl
  });
  
  const response = await client.get('/get');
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.message, 'GET request successful');
});

test('HttpClient - Error handling', async () => {
  const client = new HttpClient();
  
  try {
    await client.get(`${testServerUrl}/error`);
    assert.fail('Should have thrown an error');
  } catch (error) {
    assert.ok(error.response);
    assert.strictEqual(error.response.status, 404);
    assert.ok(error.message.includes('404'));
  }
});

test('HttpClient - 404 error handling', async () => {
  const client = new HttpClient();
  
  try {
    await client.get('http://localhost:9999/nonexistent');
    assert.fail('Should have thrown an error');
  } catch (error) {
    assert.ok(error.code);
    assert.ok(error.message.includes('ENOTFOUND'));
  }
});