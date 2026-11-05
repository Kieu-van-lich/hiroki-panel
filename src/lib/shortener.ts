import 'server-only';

export interface ShortenerResult {
  success: boolean;
  shortenedUrl?: string;
  providerName: string;
  isDirectBypass?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface ShortenerProviderConfig {
  name: string;
  apiUrl: string;
  apiToken: string;
}

/**
 * Link Shortener Adapter with Fail-Closed default and Multi-Provider failover.
 *
 * Security Rule (Plan v2):
 * - NEVER redirect directly to `/claim?token=...` in production if the shortener API fails
 *   or is unconfigured, UNLESS `ALLOW_DIRECT_CLAIM === 'true'` is explicitly set for local testing.
 */
export async function createShortenedClaimLink(
  destinationClaimUrl: string,
  customProvider?: Partial<ShortenerProviderConfig>
): Promise<ShortenerResult> {
  const allowDirect = process.env.ALLOW_DIRECT_CLAIM === 'true';

  const providers: ShortenerProviderConfig[] = [];

  if (customProvider?.apiUrl && customProvider?.apiToken) {
    providers.push({
      name: customProvider.name || 'custom',
      apiUrl: customProvider.apiUrl,
      apiToken: customProvider.apiToken,
    });
  }

  if (process.env.SHORTENER_API_URL && process.env.SHORTENER_API_TOKEN) {
    providers.push({
      name: process.env.SHORTENER_PROVIDER_NAME || 'primary',
      apiUrl: process.env.SHORTENER_API_URL,
      apiToken: process.env.SHORTENER_API_TOKEN,
    });
  }

  if (process.env.SHORTENER_BACKUP_API_URL && process.env.SHORTENER_BACKUP_API_TOKEN) {
    providers.push({
      name: process.env.SHORTENER_BACKUP_PROVIDER_NAME || 'backup',
      apiUrl: process.env.SHORTENER_BACKUP_API_URL,
      apiToken: process.env.SHORTENER_BACKUP_API_TOKEN,
    });
  }

  // If no shortener providers are configured:
  if (providers.length === 0) {
    if (allowDirect) {
      return {
        success: true,
        shortenedUrl: destinationClaimUrl,
        providerName: 'direct_dev',
        isDirectBypass: true,
      };
    }

    return {
      success: false,
      providerName: 'none',
      errorCode: 'SHORTENER_UNAVAILABLE',
      errorMessage:
        'Dịch vụ rút gọn link đang bảo trì hoặc chưa được cấu hình. Vui lòng thử lại sau ít phút!',
    };
  }

  // Try each configured provider in order (Primary -> Backup)
  for (const provider of providers) {
    try {
      const urlObj = new URL(provider.apiUrl);
      urlObj.searchParams.set('api', provider.apiToken);
      urlObj.searchParams.set('url', destinationClaimUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(urlObj.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(
          `[Shortener] Provider ${provider.name} returned HTTP ${response.status}`
        );
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = (await response.json()) as {
          status?: string;
          shortenedUrl?: string;
          short_url?: string;
          url?: string;
          message?: string;
        };
        const shortUrl = data.shortenedUrl || data.short_url || data.url;
        if (shortUrl && /^https?:\/\//i.test(shortUrl)) {
          return {
            success: true,
            shortenedUrl: shortUrl,
            providerName: provider.name,
          };
        }
      } else {
        const text = (await response.text()).trim();
        if (/^https?:\/\//i.test(text)) {
          return {
            success: true,
            shortenedUrl: text,
            providerName: provider.name,
          };
        }
      }
    } catch (err) {
      console.error(`[Shortener] Provider ${provider.name} failed:`, err);
    }
  }

  // All providers failed — Fail Closed!
  return {
    success: false,
    providerName: providers[0].name,
    errorCode: 'SHORTENER_UNAVAILABLE',
    errorMessage:
      'Không thể kết nối tới máy chủ rút gọn link lúc này. Vui lòng thử lại sau giây lát!',
  };
}

