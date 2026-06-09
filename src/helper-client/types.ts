export type HelperStatus = {
  label: string;
  mode: 'mock' | 'live';
  network: 'main' | 'testnet' | 'regtest';
  chainHeight: number | null;
  updatedAt: string;
};

export type OwnedNameSummary = {
  name: string;
  status: string;
  renewal: string;
};

export type NameDetail = OwnedNameSummary & {
  records: string[];
};

export type WalletSummary = {
  helperStatus: HelperStatus;
  balance: string;
  names: OwnedNameSummary[];
};

export type WalletSummaryRequest = {
  network: HelperStatus['network'];
  receiveAddress: string;
};

export type NameDetailRequest = {
  network: HelperStatus['network'];
  name: string;
};

export type TransactionRelayRequest = {
  network: HelperStatus['network'];
  rawTransactionHex: string;
};

export type TransactionRelayResult = {
  txid: string;
};

export type HelperClient = {
  getStatus(): Promise<HelperStatus>;
  getWalletSummary(request: WalletSummaryRequest): Promise<WalletSummary>;
  getNameDetail(request: NameDetailRequest): Promise<NameDetail>;
  relayTransaction(request: TransactionRelayRequest): Promise<TransactionRelayResult>;
};
