const vercelEnvs = [
  /**
   * Client and server environment variables
   *
   * https://vercel.com/docs/environment-variables/framework-environment-variables
   */
  "VERCEL_ENV",
  "VERCEL_TARGET_ENV",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_GIT_PROVIDER",
  "VERCEL_GIT_REPO_SLUG",
  "VERCEL_GIT_REPO_OWNER",
  "VERCEL_GIT_REPO_ID",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_MESSAGE",
  "VERCEL_GIT_COMMIT_AUTHOR_LOGIN",
  "VERCEL_GIT_COMMIT_AUTHOR_NAME",
  "VERCEL_GIT_PULL_REQUEST_ID",

  /**
   * Server environment variables
   *
   * https://vercel.com/docs/environment-variables/system-environment-variables
   */
  "VERCEL",
  "CI",
  "VERCEL_REGION",
  "VERCEL_DEPLOYMENT_ID",
  "VERCEL_PROJECT_ID",
  "VERCEL_SKEW_PROTECTION_ENABLED",
  "VERCEL_AUTOMATION_BYPASS_SECRET",
  "VERCEL_OIDC_TOKEN",
  "VERCEL_GIT_PREVIOUS_SHA",
] as const;

function isVercelEnv(name: string): name is VercelEnv {
  return (vercelEnvs as readonly string[]).includes(name);
}

/**
 * Helper to safely get import.meta.env values
 *
 * import.meta is not available in CommonJS context. Wrapping in a try/catch
 * allows us to safely get the value of the environment variable.
 */
function getImportMetaEnv(name: string): unknown {
  try {
    return import.meta.env[name];
  } catch {
    // Ignore if import.meta is not available (CommonJS context)
    return undefined;
  }
}

type VercelEnv = (typeof vercelEnvs)[number];

/**
 * Factory function to create a typesafe function that ensures an environment
 * variable is defined.
 *
 * Environment variables are handled different depending of if they are called:
 *
 * - Client
 * - SSR
 * - Server functions
 * - Server routes
 *
 * This function normalizes the environment variables to be the same across all
 * of these contexts.
 */
function createEnsureEnv<const T extends readonly string[]>(appEnvs: T) {
  type AppEnv = T[number];
  type AnyEnv = VercelEnv | AppEnv;

  const allowed = new Set([...vercelEnvs, ...appEnvs]);

  return (name: AnyEnv): string => {
    if (!allowed.has(name)) {
      throw new Error(`"${name}" isn’t in the declared env list`);
    }

    const candidates: unknown[] = [process.env[name], getImportMetaEnv(name)];

    // Add VITE_ fallback for Vercel vars
    if (isVercelEnv(name)) {
      candidates.push(process.env[`VITE_${name}`]);
      candidates.push(getImportMetaEnv(`VITE_${name}`));
    }

    const env = candidates.find((e) => typeof e === "string");

    if (!env) {
      throw new Error(`Environment variable "${name}" is not defined`);
    }

    return env;
  };
}

export const ensureEnv = createEnsureEnv(["DATABASE_URL"]);
