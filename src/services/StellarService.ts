import { Horizon, Keypair, TransactionBuilder, BASE_FEE, Networks, Operation, Asset, Memo } from "@stellar/stellar-sdk"

export class StellarService {
  private horizon: Horizon.Server
  private networkPassphrase: string

  constructor() {
    // Use testnet for development, mainnet for production
    this.horizon = new Horizon.Server(process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org")
    this.networkPassphrase = process.env.STELLAR_NETWORK || Networks.TESTNET
  }

  async getAccountBalances(publicKey: string) {
    try {
      const account = await this.horizon.loadAccount(publicKey)
      return account.balances.map((balance: any) => ({
        assetCode: balance.asset_type === "native" ? "XLM" : balance.asset_code || "Unknown",
        assetIssuer: balance.asset_type === "native" ? null : balance.asset_issuer || null,
        balance: balance.balance,
        assetType: balance.asset_type,
        isAuthorized: balance.is_authorized,
        isAuthorizedToMaintainLiabilities: balance.is_authorized_to_maintain_liabilities,
        isClawbackEnabled: balance.is_clawback_enabled,
        lastModifiedLedger: balance.last_modified_ledger,
        limit: balance.limit,
        sponsor: balance.sponsor,
      }))
    } catch (error: any) {
      throw new Error(`Failed to fetch account balances: ${error?.message || "Unknown error"}`)
    }
  }

  async getAccountTransactions(publicKey: string, cursor?: string, limit = 20) {
    try {
      const transactionsCall = this.horizon.transactions().forAccount(publicKey).order("desc").limit(limit)

      if (cursor) {
        transactionsCall.cursor(cursor)
      }

      const response = await transactionsCall.call()
      return response.records
    } catch (error: any) {
      throw new Error(`Failed to fetch transactions: ${error?.message || "Unknown error"}`)
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
      const sourceKeypair = Keypair.fromSecret(sourceSecretKey)
      const sourceAccount = await this.horizon.loadAccount(sourceKeypair.publicKey())

      const asset = assetCode === "XLM" ? Asset.native() : new Asset(assetCode, assetIssuer!)

      const transactionBuilder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })

      transactionBuilder.addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset: asset,
          amount: amount,
        }),
      )

      if (memo) {
        transactionBuilder.addMemo(Memo.text(memo))
      }

      transactionBuilder.setTimeout(30)

      const transaction = transactionBuilder.build()
      transaction.sign(sourceKeypair)

      const result = await this.horizon.submitTransaction(transaction)
      return result
    } catch (error: any) {
      throw new Error(`Payment failed: ${error?.message || "Unknown error"}`)
    }
  }

  async getTransactionDetails(hash: string) {
    try {
      const transaction = await this.horizon.transactions().transaction(hash).call()
      return transaction
    } catch (error: any) {
      throw new Error(`Failed to fetch transaction details: ${error?.message || "Unknown error"}`)
    }
  }

  async checkAccountExists(publicKey: string): Promise<boolean> {
    try {
      await this.horizon.loadAccount(publicKey)
      return true
    } catch (error: any) {
      if (error?.response && error.response.status === 404) {
        return false
      }
      throw error
    }
  }

  async getAccountInfo(publicKey: string) {
    try {
      const account = await this.horizon.loadAccount(publicKey)
      return {
        accountId: account.accountId(),
        sequence: account.sequenceNumber(),
        balances: account.balances,
        signers: account.signers,
        thresholds: account.thresholds,
        flags: account.flags,
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch account info: ${error?.message || "Unknown error"}`)
    }
  }

  async estimateFee(operationCount = 1): Promise<string> {
    try {
      const feeStats = await this.horizon.feeStats()
      const baseFee = feeStats.fee_charged?.mode || BASE_FEE
      return (Number.parseInt(baseFee) * operationCount).toString()
    } catch (error: any) {
      console.warn(`Fee estimation failed: ${error?.message || "Unknown error"}, using base fee`)
      return (Number.parseInt(BASE_FEE) * operationCount).toString()
    }
  }

  generateKeypair() {
    return Keypair.random()
  }

  isValidPublicKey(publicKey: string): boolean {
    try {
      Keypair.fromPublicKey(publicKey)
      return true
    } catch {
      return false
    }
  }

  isValidSecretKey(secretKey: string): boolean {
    try {
      Keypair.fromSecret(secretKey)
      return true
    } catch {
      return false
    }
  }

  async streamTransactions(publicKey: string, onTransaction: (transaction: any) => void) {
    try {
      const transactionStream = this.horizon
        .transactions()
        .forAccount(publicKey)
        .cursor("now")
        .stream({
          onmessage: onTransaction,
          onerror: (error: any) => {
            console.error("Transaction stream error:", error?.message || "Unknown error")
          },
        })

      return transactionStream
    } catch (error: any) {
      throw new Error(`Failed to start transaction stream: ${error?.message || "Unknown error"}`)
    }
  }

  async streamPayments(publicKey: string, onPayment: (payment: any) => void) {
    try {
      const paymentStream = this.horizon
        .payments()
        .forAccount(publicKey)
        .cursor("now")
        .stream({
          onmessage: onPayment,
          onerror: (error: any) => {
            console.error("Payment stream error:", error?.message || "Unknown error")
          },
        })

      return paymentStream
    } catch (error: any) {
      throw new Error(`Failed to start payment stream: ${error?.message || "Unknown error"}`)
    }
  }

  closeStream(stream: any) {
    if (stream && typeof stream === "function") {
      stream()
    }
  }
}
