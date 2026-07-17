/**
 * Environment Variables Configuration
 * Centralized management of all environment variables used throughout the application
 */

/**
 * Get environment variable with fallback
 * @param key - Environment variable key
 * @param fallback - Fallback value if not found
 * @returns Environment variable value or fallback
 */
function getEnv(key: string, fallback?: string): string {
  const value = import.meta.env[key];
  if (!value) {
    // Only warn when no explicit fallback was provided — callers that pass ''
    // or any other string have opted out of the warning (truly optional vars).
    if (fallback === undefined) {
      console.warn(`Environment variable ${key} is not defined`);
    }
    return fallback ?? '';
  }
  return value;
}

/**
 * Get the application origin (domain)
 * Prefers window.location.origin in browser context, falls back to environment variable or default
 */
export function getAppOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side fallback
  const envOrigin = getEnv('VITE_APP_ORIGIN');
  if (envOrigin) {
    return envOrigin;
  }
  
  // Default fallback for development/preview
  return '';
}

/**
 * Supabase Configuration
 */
export const supabaseConfig = {
  url: getEnv('VITE_SUPABASE_URL'),
  anonKey: getEnv('VITE_SUPABASE_ANON_KEY'),
  projectId: getEnv('VITE_SUPABASE_PROJECT_ID'),
};

/**
 * Turnstile Captcha Configuration
 */
export const captchaConfig = {
  // Optional — app auto-verifies (no CAPTCHA) when key is not set
  siteKey: getEnv('VITE_TURNSTILE_SITE_KEY', ''),
};

/**
 * Sentry Configuration (optional)
 */
export const sentryConfig = {
  // Optional — Sentry is disabled when DSN is not set
  dsn: getEnv('VITE_SENTRY_DSN', ''),
  environment: getEnv('VITE_ENVIRONMENT', 'development'),
};

/**
 * Default fallback image URL
 */
export const defaultImageUrl = 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&q=80';

/**
 * Validate that all required environment variables are set
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!supabaseConfig.url) {
    errors.push('VITE_SUPABASE_URL is required');
  }

  if (!supabaseConfig.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
