/**
 * next-standalone-env
 * 
 * Runtime environment variable resolution for Next.js standalone/Docker deployments.
 * Solves the problem of environment variables being baked in at build time.
 */

export interface RuntimeEnvConfig {
  /**
   * Mapping of environment names to their configurations
   */
  environments?: Record<string, EnvironmentConfig>;
  
  /**
   * List of environment variables to make runtime-configurable
   */
  variables?: string[];
  
  /**
   * The environment variable that determines which environment to use
   * Default: 'APP_ENV'
   */
  envSelector?: string;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
  
  /**
   * Custom validation function
   */
  validate?: (env: Record<string, string | undefined>) => void;
}

export interface EnvironmentConfig {
  /**
   * Environment variable overrides for this environment
   */
  vars: Record<string, string>;
  
  /**
   * Optional description
   */
  description?: string;
}

/**
 * Default environment configurations
 */
export const DEFAULT_ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  production: {
    vars: {},
    description: 'Production environment'
  },
  development: {
    vars: {},
    description: 'Development environment'
  },
  staging: {
    vars: {},
    description: 'Staging environment'
  },
  local: {
    vars: {},
    description: 'Local development'
  }
};

/**
 * Get the current environment name
 */
export function getCurrentEnvironment(envSelector = 'APP_ENV'): string {
  return process.env[envSelector] || process.env.NODE_ENV || 'production';
}

/**
 * Resolve runtime environment variables
 */
export function resolveRuntimeEnv(config: RuntimeEnvConfig = {}): Record<string, string | undefined> {
  const {
    environments = DEFAULT_ENVIRONMENTS,
    variables = [],
    envSelector = 'APP_ENV',
    debug = false,
    validate
  } = config;

  const currentEnv = getCurrentEnvironment(envSelector);
  
  if (debug) {
    console.log(`[next-standalone-env] Current environment: ${currentEnv}`);
    console.log(`[next-standalone-env] Environment selector: ${envSelector}=${process.env[envSelector]}`);
  }

  // Get environment-specific configuration
  const envConfig = environments[currentEnv];
  
  if (!envConfig) {
    if (debug) {
      console.warn(`[next-standalone-env] No configuration found for environment: ${currentEnv}`);
    }
    return process.env;
  }

  // Create a copy of process.env
  const runtimeEnv: Record<string, string | undefined> = { ...process.env };

  // Apply environment-specific overrides
  Object.entries(envConfig.vars).forEach(([key, value]) => {
    // Check for runtime override first (e.g., RUNTIME_NEXTAUTH_URL)
    const runtimeKey = `RUNTIME_${key}`;
    if (process.env[runtimeKey]) {
      runtimeEnv[key] = process.env[runtimeKey];
      if (debug) {
        console.log(`[next-standalone-env] Using runtime override: ${runtimeKey}=${process.env[runtimeKey]}`);
      }
    } else {
      // Apply environment-specific value
      runtimeEnv[key] = value;
      if (debug) {
        console.log(`[next-standalone-env] Setting ${key}=${value} for environment ${currentEnv}`);
      }
    }
  });

  // Handle additional variables that should be runtime-configurable
  variables.forEach(varName => {
    const runtimeKey = `RUNTIME_${varName}`;
    if (process.env[runtimeKey]) {
      runtimeEnv[varName] = process.env[runtimeKey];
      if (debug) {
        console.log(`[next-standalone-env] Using runtime override: ${runtimeKey}=${process.env[runtimeKey]}`);
      }
    }
  });

  // Run validation if provided
  if (validate) {
    try {
      validate(runtimeEnv);
    } catch (error) {
      console.error('[next-standalone-env] Validation failed:', error);
      throw error;
    }
  }

  return runtimeEnv;
}

/**
 * Patch process.env with runtime values
 */
export function patchProcessEnv(config: RuntimeEnvConfig = {}): void {
  const runtimeEnv = resolveRuntimeEnv(config);
  
  // Apply all resolved values to process.env
  Object.entries(runtimeEnv).forEach(([key, value]) => {
    if (value !== undefined) {
      process.env[key] = value;
    }
  });

  if (config.debug) {
    console.log('[next-standalone-env] Process environment patched successfully');
  }
}

/**
 * Express middleware for runtime environment resolution
 */
export function runtimeEnvMiddleware(config: RuntimeEnvConfig = {}) {
  return (req: any, res: any, next: any) => {
    patchProcessEnv(config);
    next();
  };
}

/**
 * Next.js configuration wrapper
 */
export function withRuntimeEnv(nextConfig: any, config: RuntimeEnvConfig = {}) {
  // Patch environment on module load (server-side only)
  if (typeof globalThis !== 'undefined' && !(globalThis as any).window) {
    patchProcessEnv(config);
  }

  return {
    ...nextConfig,
    // Ensure environment variables are available at runtime
    env: {
      ...nextConfig.env,
      ...resolveRuntimeEnv(config)
    }
  };
}

// Export everything for maximum flexibility
export default {
  getCurrentEnvironment,
  resolveRuntimeEnv,
  patchProcessEnv,
  runtimeEnvMiddleware,
  withRuntimeEnv,
  DEFAULT_ENVIRONMENTS
};