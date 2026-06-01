import { Environment } from '../shared/constants/environment.constants';

/**
 * Builds the CORS origin matcher based on the app domain and current environment.
 *
 * - Production  → HTTPS only, domain + subdomains
 * - Staging     → HTTP/HTTPS domain + subdomains, plus localhost
 * - Development → localhost only
 */
export function buildCorsOrigin(
  domain: string,
  env: string
): RegExp | (RegExp | string)[] {
  // Strip protocol, path, port, query — keep only the hostname, then regex-escape dots
  const hostname = domain
    .replace(/^(?:https?:\/\/)?([^/?#]+).*/, '$1')
    .replace(/\./g, '\\.');

  const secureDomainRegex = new RegExp(
    `^https://([a-zA-Z0-9-]+\\.)*${hostname}(:[0-9]+)?$`
  );
  const domainRegex = new RegExp(
    `^https?://([a-zA-Z0-9-]+\\.)*${hostname}(:[0-9]+)?$`
  );
  const localhostRegex = /^https?:\/\/localhost:[0-9]+$/;

  switch (env) {
    case Environment.PRODUCTION:
      return secureDomainRegex;
    case Environment.STAGING:
      return [localhostRegex, domainRegex];
    default:
      return [localhostRegex];
  }
}
