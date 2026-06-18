import { HttpClient } from './HttpClient.js';
import type {
  HttpClientConfig,
  AuthConfig,
  RetryConfig,
  HttpRequestConfig,
  HttpResponse,
  HttpError,
  Interceptor,
  RequestOptions,
  CLIOptions
} from './types.js';

export { HttpClient };

// Create default instance
export const createHttpClient = (config?: HttpClientConfig) => {
  return new HttpClient(config);
};

// Default instance
export const httpClient = new HttpClient();

// Convenience methods
export const get = <T = any>(url: string, config?: any) => httpClient.get<T>(url, config);
export const post = <T = any>(url: string, data?: any, config?: any) => httpClient.post<T>(url, data, config);
export const put = <T = any>(url: string, data?: any, config?: any) => httpClient.put<T>(url, data, config);
export const patch = <T = any>(url: string, data?: any, config?: any) => httpClient.patch<T>(url, data, config);
export const del = <T = any>(url: string, config?: any) => httpClient.delete<T>(url, config);
export const delete_ = <T = any>(url: string, config?: any) => httpClient.delete<T>(url, config); // delete is a reserved word