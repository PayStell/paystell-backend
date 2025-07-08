import {
  Horizon,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  Operation,
  Asset,
  Memo,
} from "@stellar/stellar-sdk";

// Helper function to safely extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
};

export class StellarService {
  private horizon: Horizon.Server;
  private networkPassphrase: string;

  constructor() {
    // Use testnet for development, mainnet for production
    this.horizon = new Horizon.Server(
      process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org",
    );
    this.networkPassphrase = process.env.STELLAR_NETWORK || Networks.TESTNET;
  }

  async getAccountBalances(publicKey: string) {
    try {
      const account = await this.horizon.loadAccount(publicKey);
      return account.balances.map((balance: unknown) => {
        const bal = balance as Record<string, unknown>;
        return {
          assetCode:
            bal.asset_type === "native" ? "XLM" : bal.asset_code || "Unknown",
          assetIssuer:
            bal.asset_type === "native" ? null : bal.asset_issuer || null,
          balance: bal.balance,
          assetType: bal.asset_type,
          isAuthorized: bal.is_authorized,
          isAuthorizedToMaintainLiabilities:
            bal.is_authorized_to_maintain_liabilities,
          isClawbackEnabled: bal.is_clawback_enabled,
          lastModifiedLedger: bal.last_modified_ledger,
          limit: bal.limit,
          sponsor: bal.sponsor,
        };
      });
    } catch (error: unknown) {
      throw new Error(
        `Failed to fetch account balances: ${getErrorMessage(error)}`,
      );
    }
  }

  async getAccountTransactions(
    publicKey: string,
    cursor?: string,
    limit = 20,
  ): Promise<unknown[]> {
    try {
      const transactionsCall = this.horizon
        .transactions()
        .forAccount(publicKey)
        .order("desc")
        .limit(limit);

      if (cursor) {
        transactionsCall.cursor(cursor);
      }

      const response = await transactionsCall.call();
      return response.records as unknown[];
    } catch (error: unknown) {
      throw new Error(
        `Failed to fetch transactions: ${getErrorMessage(error)}`,
      );
    }
  }

  async submitPayment(
    sourceSecretKey: string,
    destinationPublicKey: string,
    amount: string,
    assetCode = "XLM",
    assetIssuer?: string,
    memo?: string,
  ) {
    try {
      const sourceKeypair = Keypair.fromSecret(sourceSecretKey);
      const sourceAccount = await this.horizon.loadAccount(
        sourceKeypair.publicKey(),
      );

      const asset =
        assetCode === "XLM"
          ? Asset.native()
          : new Asset(assetCode, assetIssuer!);

      const transactionBuilder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });

      transactionBuilder.addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset: asset,
          amount: amount,
        }),
      );

      if (memo) {
        transactionBuilder.addMemo(Memo.text(memo));
      }

      transactionBuilder.setTimeout(30);

      const transaction = transactionBuilder.build();
      transaction.sign(sourceKeypair);

      const result = await this.horizon.submitTransaction(transaction);
      return result;
    } catch (error: unknown) {
      throw new Error(`Payment failed: ${getErrorMessage(error)}`);
    }
  }

  async getTransactionDetails(hash: string) {
    try {
      const transaction = await this.horizon
        .transactions()
        .transaction(hash)
        .call();
      return transaction;
    } catch (error: unknown) {
      throw new Error(
        `Failed to fetch transaction details: ${getErrorMessage(error)}`,
      );
    }
  }

  async checkAccountExists(publicKey: string): Promise<boolean> {
    try {
      await this.horizon.loadAccount(publicKey);
      return true;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "response" in error &&
        (error as { response: { status: number } }).response?.status === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  async getAccountInfo(publicKey: string) {
    try {
      const account = await this.horizon.loadAccount(publicKey);
      return {
        accountId: account.accountId(),
        sequence: account.sequenceNumber(),
        balances: account.balances,
        signers: account.signers,
        thresholds: account.thresholds,
        flags: account.flags,
      };
    } catch (error: unknown) {
      throw new Error(
        `Failed to fetch account info: ${getErrorMessage(error)}`,
      );
    }
  }

  async estimateFee(operationCount = 1): Promise<string> {
    try {
      const feeStats = await this.horizon.feeStats();
      const baseFee = feeStats.fee_charged?.mode || BASE_FEE;
      return (Number.parseInt(baseFee) * operationCount).toString();
    } catch (error: unknown) {
      console.warn(
        `Fee estimation failed: ${getErrorMessage(error)}, using base fee`,
      );
      return (Number.parseInt(BASE_FEE) * operationCount).toString();
    }
  }

  generateKeypair() {
    return Keypair.random();
  }

  isValidPublicKey(publicKey: string): boolean {
    try {
      Keypair.fromPublicKey(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  isValidSecretKey(secretKey: string): boolean {
    try {
      Keypair.fromSecret(secretKey);
      return true;
    } catch {
      return false;
    }
  }

  async streamTransactions(
    publicKey: string,
    onTransaction: (transaction: unknown) => void,
  ) {
    try {
      const transactionStream = this.horizon
        .transactions()
        .forAccount(publicKey)
        .cursor("now")
        .stream({
          onmessage: onTransaction,
          onerror: (error: unknown) => {
            console.error("Transaction stream error:", getErrorMessage(error));
          },
        });

      return transactionStream;
    } catch (error: unknown) {
      throw new Error(
        `Failed to start transaction stream: ${getErrorMessage(error)}`,
      );
    }
  }

  async streamPayments(
    publicKey: string,
    onPayment: (payment: unknown) => void,
  ) {
    try {
      const paymentStream = this.horizon
        .payments()
        .forAccount(publicKey)
        .cursor("now")
        .stream({
          onmessage: onPayment,
          onerror: (error: unknown) => {
            console.error("Payment stream error:", getErrorMessage(error));
          },
        });

      return paymentStream;
    } catch (error: unknown) {
      throw new Error(
        `Failed to start payment stream: ${getErrorMessage(error)}`,
      );
    }
  }

  closeStream(stream: (() => void) | undefined) {
    if (stream && typeof stream === "function") {
      stream();
    }
  }
}
