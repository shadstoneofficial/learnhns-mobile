import type {
  HelperClient,
  HelperStatus,
  NameDetail,
  NameDetailRequest,
  TransactionRelayRequest,
  TransactionRelayResult,
  WalletSummary,
  WalletSummaryRequest,
} from './types';

export function createHttpHelperClient(baseUrl: string): HelperClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  return {
    getStatus() {
      return requestJson<HelperStatus>(`${normalizedBaseUrl}/status`);
    },

    getWalletSummary(request) {
      return requestJson<WalletSummary>(`${normalizedBaseUrl}/wallet/summary`, {
        body: request,
        method: 'POST',
      });
    },

    getNameDetail(request) {
      return requestJson<NameDetail>(
        `${normalizedBaseUrl}/name/${encodeURIComponent(request.name)}`,
        {
          body: request,
          method: 'GET',
        }
      );
    },

    relayTransaction(request) {
      return requestJson<TransactionRelayResult>(`${normalizedBaseUrl}/tx/relay`, {
        body: request,
        method: 'POST',
      });
    },
  };
}

async function requestJson<T>(
  url: string,
  options: { body?: WalletSummaryRequest | NameDetailRequest | TransactionRelayRequest; method?: 'GET' | 'POST' } = {}
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'content-type': 'application/json',
    },
    method: options.method ?? 'GET',
    ...(options.body && options.method !== 'GET'
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  if (!response.ok) {
    throw new Error(`Helper request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
