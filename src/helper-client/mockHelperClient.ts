import type { WalletSummary } from './types';

export function getMockWalletSummary(): WalletSummary {
  return {
    helperStatus: {
      label: 'Mock helper online',
      mode: 'mock',
    },
    balance: '0.000000 HNS',
    names: [
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
    ],
  };
}
