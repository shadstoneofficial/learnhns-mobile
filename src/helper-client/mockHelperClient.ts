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

const mockNames: NameDetail[] = [
  {
    name: 'learnhns/',
    status: 'Mock owned',
    renewal: 'No live renewal data yet',
    records: ['NS ns1.learnhns.com.', 'TXT "mobile dashboard mock"'],
  },
  {
    name: 'mobiletest/',
    status: 'Mock owned',
    renewal: 'No live renewal data yet',
    records: ['A 127.0.0.1', 'TXT "test wallet only"'],
  },
];

export const mockHelperClient: HelperClient = {
  async getStatus(): Promise<HelperStatus> {
    return buildMockStatus();
  },

  async getWalletSummary(_request: WalletSummaryRequest): Promise<WalletSummary> {
    return {
      helperStatus: buildMockStatus(),
      balance: '0.000000 HNS',
      names: mockNames.map(({ name, status, renewal }) => ({ name, status, renewal })),
    };
  },

  async getNameDetail(request: NameDetailRequest): Promise<NameDetail> {
    const name = mockNames.find((item) => item.name === request.name);

    if (!name) {
      throw new Error(`Mock helper has no name detail for ${request.name}.`);
    }

    return name;
  },

  async relayTransaction(_request: TransactionRelayRequest): Promise<TransactionRelayResult> {
    throw new Error('Mock helper does not relay transactions.');
  },
};

export function getMockWalletSummary(): WalletSummary {
  return {
    helperStatus: buildMockStatus(),
    balance: '0.000000 HNS',
    names: mockNames.map(({ name, status, renewal }) => ({ name, status, renewal })),
  };
}

export function getMockNameDetail(name: string): NameDetail | null {
  return mockNames.find((item) => item.name === name) ?? null;
}

function buildMockStatus(): HelperStatus {
  return {
    label: 'Mock helper online',
    mode: 'mock',
    network: 'main',
    chainHeight: null,
    updatedAt: new Date().toISOString(),
  };
}
