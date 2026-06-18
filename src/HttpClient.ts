import { createHash } from 'crypto';
import { request, Agent } from 'http';
import { request as httpsRequest, Agent as HttpsAgent } from 'https';
import { URL, URLSearchParams } from 'url';
import type {
  HttpClientConfig,
  HttpRequestConfig,
  HttpResponse,
  HttpError,
  Interceptor,
  RequestOptions
} from './types.js';

export class HttpClient {
  private config: HttpClientConfig;
  private interceptors: Interceptor[] = [];
  private defaultAgent: Agent;
  private defaultHttpsAgent: HttpsAgent;

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      timeout: 30000,
      headers: {
        'User-Agent': 'http-client-x/1.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...config.headers
      },
      ...config
    };
    
    this.defaultAgent = new Agent({ keepAlive: true });
    this.defaultHttpsAgent = new HttpsAgent({ keepAlive: true });
  }

  /**
   * Add request/response interceptor
   */
  use(interceptor: Interceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  /**
   * Remove interceptor
   */
  eject(interceptor: Interceptor): this {
    const index = this.interceptors.indexOf(interceptor);
    if (index > -1) {
      this.interceptors.splice(index, 1);
    }
    return this;
  }

  /**
   * HTTP GET request
   */
  async get<T = any>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * HTTP POST request
   */
  async post<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * HTTP PUT request
   */
  async put<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * HTTP PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * HTTP DELETE request
   */
  async delete<T = any>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Generic HTTP request
   */
  async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    let requestConfig = { ...config };
    
    // Apply base URL
    if (this.config.baseURL && !requestConfig.url.startsWith('http')) {
      requestConfig.url = new URL(requestConfig.url, this.config.baseURL).href;
    }

    // Apply default headers
    requestConfig.headers = { ...this.config.headers, ...requestConfig.headers };

    // Apply authentication
    if (this.config.auth && !requestConfig.auth) {
      requestConfig.auth = this.config.auth;
    }

    // Apply default timeout
    if (!requestConfig.timeout && this.config.timeout) {
      requestConfig.timeout = this.config.timeout;
    }

    // Apply interceptors
    for (const interceptor of this.interceptors) {
      if (interceptor.request) {
        requestConfig = await interceptor.request(requestConfig);
      }
    }

    // Execute with retry logic
    return this.executeWithRetry<T>(requestConfig);
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(config: HttpRequestConfig, attempt = 1): Promise<HttpResponse<T>> {
    try {
      return await this.executeRequest<T>(config);
    } catch (error) {
      const httpError = error as HttpError;
      
      // Check if retry is needed
      if (shouldRetry(httpError, attempt, this.config.retry)) {
        const delay = calculateDelay(attempt, this.config.retry);
        
        if (this.config.retry?.retryCondition) {
          const shouldRetry = this.config.retry.retryCondition(httpError, httpError.response);
          if (!shouldRetry) {
            throw httpError;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(config, attempt + 1);
      }
      
      throw httpError;
    }
  }

  /**
   * Execute single HTTP request
   */
  private async executeRequest<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    return new Promise((resolve, reject) => {
      const url = new URL(config.url);
      const isHttps = url.protocol === 'https:';
      const agent = isHttps ? this.defaultHttpsAgent : this.defaultAgent;
      
      // Add query parameters
      if (config.params) {
        const searchParams = new URLSearchParams();
        Object.entries(config.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        if (searchParams.toString()) {
          url.search = searchParams.toString();
        }
      }

      // Prepare headers
      const headers: Record<string, string> = { ...config.headers };
      if (config.auth) {
        this.applyAuth(headers, config.auth);
      }

      // Set up request options
      const requestOptions: any = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: config.method.toUpperCase(),
        headers,
        agent,
        timeout: config.timeout
      };

      // Create request
      const req = isHttps ? httpsRequest(requestOptions) : request(requestOptions);

      let responseData = '';
      let responseStatusCode: number | null = null;
      let responseStatusText: string = '';
      let responseHeaders: Record<string, string> = {};

      // Handle timeout
      const timeoutTimer = setTimeout(() => {
        req.destroy();
        const timeoutError = createHttpError(
          `Request timeout after ${config.timeout}ms`,
          config,
          'ETIMEDOUT'
        );
        reject(timeoutError);
      }, config.timeout);

      // Collect response data
      req.on('response', (res) => {
        responseStatusCode = res.statusCode!;
        responseStatusText = res.statusMessage || '';
        
        // Normalize headers
        const normalizedHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          normalizedHeaders[key.toLowerCase()] = typeof value === 'string' ? value : String(value);
        }
        responseHeaders = normalizedHeaders;

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          clearTimeout(timeoutTimer);
          
          // Parse response data
          let data = responseData;
          try {
            if (responseHeaders['content-type']?.includes('application/json')) {
              data = JSON.parse(responseData);
            }
          } catch (e) {
            // Keep raw data if JSON parsing fails
          }

          // Create response object
          const response: HttpResponse<T> = {
            data: data as T,
            status: responseStatusCode!,
            statusText: responseStatusText,
            headers: responseHeaders,
            url: url.href,
            request: config
          };

          // Apply response interceptors
          this.applyResponseInterceptors(response)
            .then(finalResponse => resolve(finalResponse))
            .catch(error => reject(error));
        });
      });

      // Handle request errors
      req.on('error', (error) => {
        clearTimeout(timeoutTimer);
        const httpError = createHttpError(
          error.message,
          config,
          (error as any).code
        );
        reject(httpError);
      });

      // Write request body for methods that support it
      if (['POST', 'PUT', 'PATCH'].includes(config.method.toUpperCase()) && config.data) {
        if (typeof config.data === 'string') {
          req.write(config.data);
        } else if (typeof config.data === 'object') {
          req.write(JSON.stringify(config.data));
        }
      }

      req.end();
    });
  }

  /**
   * Apply authentication headers
   */
  private applyAuth(headers: Record<string, string>, auth: any): void {
    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.token}`;
        break;
      case 'basic':
        const encoded = Buffer.from(`${auth.token}:`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
        break;
      case 'api-key':
        const keyName = auth.keyName || 'X-API-Key';
        const prefix = auth.prefix || '';
        headers[keyName] = `${prefix}${auth.token}`;
        break;
      case 'custom':
        if (auth.keyName) {
          headers[auth.keyName] = auth.token;
        }
        break;
    }
  }

  /**
   * Apply response interceptors
   */
  private async applyResponseInterceptors(response: HttpResponse): Promise<HttpResponse> {
    let finalResponse = response;
    
    for (const interceptor of this.interceptors) {
      if (interceptor.response) {
        try {
          finalResponse = await interceptor.response(finalResponse);
        } catch (error) {
          throw error;
        }
      }
    }
    
    return finalResponse;
  }
}

/**
 * Create HTTP error
 */
function createHttpError(message: string, request: HttpRequestConfig, code?: string): HttpError {
  const error = new Error(message) as HttpError;
  error.request = request;
  if (code) {
    error.code = code;
  }
  return error;
}

/**
 * Check if request should be retried
 */
function shouldRetry(error: HttpError, attempt: number, retryConfig?: any): boolean {
  if (!retryConfig || attempt > (retryConfig.attempts || 3)) {
    return false;
  }

  if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  if (error.response) {
    const status = error.response.status;
    return status >= 500 || status === 429;
  }

  return false;
}

/**
 * Calculate delay for retry
 */
function calculateDelay(attempt: number, retryConfig?: any): number {
  const baseDelay = retryConfig?.delay || 1000;
  const maxDelay = retryConfig?.maxDelay || 30000;
  const backoffFactor = retryConfig?.backoffFactor || 2;
  
  const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
  
  // Add jitter to avoid thundering herd
  return delay * (0.5 + Math.random() * 0.5);
}