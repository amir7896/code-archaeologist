/** Keep in sync with `@code-archaeologist/shared` `API_PREFIX` / `APP_VERSION`. */
export const SDK_API_PREFIX = 'api/v1';

/** SDK release. Bump with `@code-archaeologist/sdk` in package.json. */
export const SDK_VERSION = '1.0.0';

/** HTTP API this SDK is compiled against. */
export const SDK_API_VERSION = 'v1';

export const SDK_USER_AGENT = `code-archaeologist-sdk/${SDK_VERSION}`;

/**
 * Compatibility policy (0.x):
 * - This client speaks `/${SDK_API_PREFIX}` only.
 * - Additive API fields are ignored.
 * - Breaking route or auth changes require a new major SDK (1.0+).
 * - Server product version may move independently of the SDK.
 */
export const SDK_COMPATIBILITY = {
  apiPrefix: SDK_API_PREFIX,
  apiVersion: SDK_API_VERSION,
  serverVersion: SDK_VERSION,
  sdkVersion: SDK_VERSION,
} as const;
