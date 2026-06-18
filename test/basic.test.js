import { test } from 'node:test';
import assert from 'node:assert';
import { HttpClient } from '../dist/index.js';

test('HttpClient - basic functionality', () => {
  const client = new HttpClient();
  assert.ok(client instanceof HttpClient);
  assert.strictEqual(typeof client.get, 'function');
  assert.strictEqual(typeof client.post, 'function');
  assert.strictEqual(typeof client.put, 'function');
  assert.strictEqual(typeof client.patch, 'function');
  assert.strictEqual(typeof client.delete, 'function');
});

test('HttpClient - configuration', () => {
  const client = new HttpClient({
    baseURL: 'https://api.example.com',
    timeout: 5000,
    headers: {
      'Custom-Header': 'test-value'
    }
  });
  
  assert.strictEqual(client.config.baseURL, 'https://api.example.com');
  assert.strictEqual(client.config.timeout, 5000);
  assert.strictEqual(client.config.headers['Custom-Header'], 'test-value');
});

test('HttpClient - authentication configuration', () => {
  const client = new HttpClient({
    auth: {
      type: 'bearer',
      token: 'test-token'
    }
  });
  
  assert.ok(client.config.auth);
  assert.strictEqual(client.config.auth.type, 'bearer');
  assert.strictEqual(client.config.auth.token, 'test-token');
});

test('HttpClient - retry configuration', () => {
  const client = new HttpClient({
    retry: {
      attempts: 5,
      delay: 1000,
      maxDelay: 10000
    }
  });
  
  assert.ok(client.config.retry);
  assert.strictEqual(client.config.retry.attempts, 5);
  assert.strictEqual(client.config.retry.delay, 1000);
  assert.strictEqual(client.config.retry.maxDelay, 10000);
});

test('HttpClient - interceptors', () => {
  const client = new HttpClient();
  
  const requestInterceptor = (config) => {
    config.headers['X-Test'] = 'intercepted';
    return config;
  };
  
  const responseInterceptor = (response) => {
    response.data.intercepted = true;
    return response;
  };
  
  client.use({ request: requestInterceptor });
  client.use({ response: responseInterceptor });
  
  assert.ok(client.interceptors.length === 2);
  assert.strictEqual(client.interceptors[0].request, requestInterceptor);
  assert.strictEqual(client.interceptors[1].response, responseInterceptor);
});

test('HttpClient - remove interceptor', () => {
  const client = new HttpClient();
  
  const interceptor1 = { request: (config) => config };
  const interceptor2 = { request: (config) => config };
  
  client.use(interceptor1);
  client.use(interceptor2);
  
  assert.strictEqual(client.interceptors.length, 2);
  
  client.eject(interceptor1);
  assert.strictEqual(client.interceptors.length, 1);
  assert.strictEqual(client.interceptors[0], interceptor2);
});

test('HttpClient - convenience methods exist', () => {
  const client = new HttpClient();
  
  // These should exist even if they fail when called
  assert.strictEqual(typeof client.get, 'function');
  assert.strictEqual(typeof client.post, 'function');
  assert.strictEqual(typeof client.put, 'function');
  assert.strictEqual(typeof client.patch, 'function');
  assert.strictEqual(typeof client.delete, 'function');
});