export type HelperStatus = {
  label: string;
  mode: 'mock' | 'live';
};

export type OwnedNameSummary = {
  name: string;
  status: string;
  renewal: string;
  records: string[];
};

export type WalletSummary = {
  helperStatus: HelperStatus;
  balance: string;
  names: OwnedNameSummary[];
};
