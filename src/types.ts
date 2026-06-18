export interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  auth?: AuthConfig;
  retry?: RetryConfig;
}

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'api-key' | 'custom';
  token: string;
  keyName?: string;
  prefix?: string;
}

export interface RetryConfig {
  attempts?: number;
  delay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any, response?: HttpResponse) => boolean;
}

export interface HttpRequestConfig {
  method: string;
  url: string;
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: any;
  timeout?: number;
  auth?: AuthConfig;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string | undefined>;
  url: string;
  request: HttpRequestConfig;
}

export interface HttpError extends Error {
  response?: HttpResponse;
  request?: HttpRequestConfig;
  code?: string;
}

export interface Interceptor {
  request?: (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>;
  response?: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>;
  error?: (error: HttpError) => any | Promise<any>;
}

export interface RequestOptions {
  signal?: AbortSignal;
  retry?: RetryConfig;
  timeout?: number;
}

export interface CLIOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  params?: Record<string, string>;
  output?: string;
  timeout?: number;
  verbose?: boolean;
}