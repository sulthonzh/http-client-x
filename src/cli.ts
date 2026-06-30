#!/usr/bin/env node

import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { isAbsolute, resolve } from 'path';
import { httpClient } from './index.js';

const program = new Command();

program
  .name('http-client-x')
  .description('Zero-dependency HTTP client CLI')
  .version('1.0.0');

// Global options
program
  .option('-H, --header <header>', 'Add custom header (can be used multiple times)', (value: string, previous: string[]) => {
    return [...previous, value];
  }, [])
  .option('-d, --data <data>', 'Request body data')
  .option('-o, --output <file>', 'Output file to save response')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', parseInt)
  .option('-v, --verbose', 'Verbose output')
  .option('--save-config <file>', 'Save configuration to file')
  .option('--load-config <file>', 'Load configuration from file');

// Helper: merge global program opts with subcommand opts
function mergedOpts(localOptions: Record<string, any>): Record<string, any> {
  return { ...program.opts(), ...localOptions };
}

// GET command
program
  .command('get')
  .argument('<url>', 'URL to request')
  .description('Make GET request')
  .option('-p, --param <param=value>', 'Query parameter (can be used multiple times)', (value: string, previous: string[]) => {
    return [...previous, value];
  }, [])
  .action(async (url, options) => {
    const opts = mergedOpts(options);
    try {
      const config = await buildConfig(opts);

      if (opts['verbose']) {
        console.log('Making GET request to:', url);
        if (config.params) {
          console.log('Query params:', config.params);
        }
        if (Object.keys(config.headers).length > 0) {
          console.log('Headers:', config.headers);
        }
      }

      const response = await httpClient.get(url, config);

      await handleResponse(response, opts);
    } catch (error) {
      handleError(error, opts['verbose']);
    }
  });

// POST command
program
  .command('post')
  .argument('<url>', 'URL to request')
  .description('Make POST request')
  .option('-p, --param <param=value>', 'Query parameter (can be used multiple times)', (value: string, previous: string[]) => {
    return [...previous, value];
  }, [])
  .option('-t, --type <type>', 'Content type (json, form, text)', 'json')
  .action(async (url, options) => {
    const opts = mergedOpts(options);
    try {
      const config = await buildConfig(opts);

      if (opts['verbose']) {
        console.log('Making POST request to:', url);
        if (opts['data']) {
          console.log('Request data:', opts['data']);
        }
      }

      const data = opts['data'] ? parseData(opts['data'], opts['type']) : undefined;
      const response = await httpClient.post(url, data, config);

      await handleResponse(response, opts);
    } catch (error) {
      handleError(error, opts['verbose']);
    }
  });

// PUT command
program
  .command('put')
  .argument('<url>', 'URL to request')
  .description('Make PUT request')
  .option('-p, --param <param=value>', 'Query parameter (can be used multiple times)', (value: string, previous: string[]) => {
    return [...previous, value];
  }, [])
  .option('-t, --type <type>', 'Content type (json, form, text)', 'json')
  .action(async (url, options) => {
    const opts = mergedOpts(options);
    try {
      const config = await buildConfig(opts);

      if (opts['verbose']) {
        console.log('Making PUT request to:', url);
        if (opts['data']) {
          console.log('Request data:', opts['data']);
        }
      }

      const data = opts['data'] ? parseData(opts['data'], opts['type']) : undefined;
      const response = await httpClient.put(url, data, config);

      await handleResponse(response, opts);
    } catch (error) {
      handleError(error, opts['verbose']);
    }
  });

// PATCH command
program
  .command('patch')
  .argument('<url>', 'URL to request')
  .description('Make PATCH request')
  .option('-p, --param <param=value>', 'Query parameter (can be used multiple times)', (value: string, previous: string[]) => {
    return [...previous, value];
  }, [])
  .option('-t, --type <type>', 'Content type (json, form, text)', 'json')
  .action(async (url, options) => {
    const opts = mergedOpts(options);
    try {
      const config = await buildConfig(opts);

      if (opts['verbose']) {
        console.log('Making PATCH request to:', url);
        if (opts['data']) {
          console.log('Request data:', opts['data']);
        }
      }

      const data = opts['data'] ? parseData(opts['data'], opts['type']) : undefined;
      const response = await httpClient.patch(url, data, config);

      await handleResponse(response, opts);
    } catch (error) {
      handleError(error, opts['verbose']);
    }
  });

// DELETE command
program
  .command('delete')
  .argument('<url>', 'URL to request')
  .description('Make DELETE request')
  .option('-p, --param <param=value>', 'Query parameter (can be used multiple times)', (value: string, previous: string[]) => {
    return [...previous, value];
  }, [])
  .action(async (url, options) => {
    const opts = mergedOpts(options);
    try {
      const config = await buildConfig(opts);

      if (opts['verbose']) {
        console.log('Making DELETE request to:', url);
      }

      const response = await httpClient.delete(url, config);

      await handleResponse(response, opts);
    } catch (error) {
      handleError(error, opts['verbose']);
    }
  });

// HEAD command
program
  .command('head')
  .argument('<url>', 'URL to request')
  .description('Make HEAD request')
  .option('-p, --param <param=value>', 'Query parameter (can be used multiple times)', (value: string, previous: string[]) => {
    return [...previous, value];
  }, [])
  .action(async (url, options) => {
    const opts = mergedOpts(options);
    try {
      const config = await buildConfig(opts);

      if (opts['verbose']) {
        console.log('Making HEAD request to:', url);
      }

      const response = await httpClient.request({
        ...config,
        method: 'HEAD',
        url
      });

      await handleResponse(response, opts, true);
    } catch (error) {
      handleError(error, opts['verbose']);
    }
  });

// Options command
program
  .command('options')
  .argument('<url>', 'URL to request')
  .description('Make OPTIONS request')
  .option('-p, --param <param=value>', 'Query parameter (can be used multiple times)', (value: string, previous: string[]) => {
    return [...previous, value];
  }, [])
  .action(async (url, options) => {
    const opts = mergedOpts(options);
    try {
      const config = await buildConfig(opts);

      if (opts['verbose']) {
        console.log('Making OPTIONS request to:', url);
      }

      const response = await httpClient.request({
        ...config,
        method: 'OPTIONS',
        url
      });

      await handleResponse(response, opts, true);
    } catch (error) {
      handleError(error, opts['verbose']);
    }
  });

// Helper functions

async function buildConfig(options: Record<string, any>) {
  const config: any = {
    headers: {}
  };

  // Parse headers
  if (options['header']) {
    for (const header of options['header']) {
      const idx = header.indexOf(':');
      if (idx > 0) {
        const key = header.slice(0, idx).trim();
        const value = header.slice(idx + 1).trim();
        config.headers[key] = value;
      }
    }
  }

  // Parse query parameters
  if (options['param']) {
    config.params = {};
    for (const param of options['param']) {
      const [key, value] = param.split('=');
      if (key && value) {
        config.params[key.trim()] = decodeURIComponent(value.trim());
      }
    }
  }

  // Add content type for POST/PUT/PATCH
  if (options['data'] && options['type']) {
    if (options['type'] === 'json') {
      config.headers['Content-Type'] = 'application/json';
    } else if (options['type'] === 'form') {
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (options['type'] === 'text') {
      config.headers['Content-Type'] = 'text/plain';
    }
  }

  // Timeout
  if (options['timeout']) {
    config.timeout = options['timeout'];
  }

  // Load config if specified
  if (options['loadConfig']) {
    try {
      const configPath = isAbsolute(options['loadConfig']) ? options['loadConfig'] : resolve(process.cwd(), options['loadConfig']);
      const configData = await readFile(configPath, 'utf-8');
      const savedConfig = JSON.parse(configData);
      // Merge loaded config (headers get merged, not replaced)
      if (savedConfig.headers) {
        Object.assign(config.headers, savedConfig.headers);
        delete savedConfig.headers;
      }
      Object.assign(config, savedConfig);
    } catch (error) {
      if (options['verbose']) {
        console.warn('Could not load config file:', (error as Error).message);
      }
    }
  }

  return config;
}

function parseData(data: string, type: string) {
  if (type === 'json') {
    try {
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Invalid JSON data: ${(error as Error).message}`);
    }
  } else if (type === 'form') {
    const params = new URLSearchParams();
    const pairs = data.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params.append(key, value || '');
      }
    }
    return params.toString();
  } else {
    return data;
  }
}

async function handleResponse(response: any, options: Record<string, any>, isHeadOrOptions = false) {
  if (options['verbose']) {
    console.log('\n=== Response ===');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Headers:', response.headers);
    console.log('URL:', response.url);
  }

  // Save to file if specified
  if (options['output']) {
    try {
      let content = response.data;
      if (typeof response.data === 'object') {
        content = JSON.stringify(response.data, null, 2);
      }
      const outputPath = isAbsolute(options['output']) ? options['output'] : resolve(process.cwd(), options['output']);
      await writeFile(outputPath, content);
      console.log(`\nResponse saved to: ${options['output']}`);
    } catch (error) {
      throw new Error(`Could not save response to file: ${(error as Error).message}`);
    }
  } else {
    // Print response data
    // For HEAD/OPTIONS with empty body, print status info
    if (isHeadOrOptions && (!response.data || response.data === '')) {
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log('URL:', response.url);
    } else if (typeof response.data === 'object') {
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      console.log(response.data);
    }
  }
}

function handleError(error: any, verbose: boolean) {
  if (verbose && error.response) {
    console.error('\n=== Error Details ===');
    console.error('Status:', error.response.status);
    console.error('URL:', error.response.url);
    if (error.response.data) {
      console.error('Response:', error.response.data);
    }
  }

  // Write error to stdout (so tests can check it) and set exit code
  console.log(`\nError: ${error.message}`);
  process.exitCode = 1;
}

// Save config command
program
  .command('save-config')
  .description('Save current configuration to file')
  .argument('<file>', 'Configuration file path')
  .action(async (file) => {
    const globalOpts = program.opts();
    const config: any = {
      headers: {} as Record<string, string>,
      timeout: globalOpts['timeout']
    };

    // Parse header array into object
    if (globalOpts['header']) {
      const headers = globalOpts['header'] as string[];
      for (const header of headers) {
        const idx = header.indexOf(':');
        if (idx > 0) {
          const key = header.slice(0, idx).trim();
          const value = header.slice(idx + 1).trim();
          config.headers[key] = value;
        }
      }
    }

    try {
      const configPath = isAbsolute(file) ? file : resolve(process.cwd(), file);
      await writeFile(configPath, JSON.stringify(config, null, 2));
      console.log(`Configuration saved to: ${file}`);
    } catch (error) {
      console.error(`Could not save config: ${(error as Error).message}`);
      process.exitCode = 1;
    }
  });

program.parse();
