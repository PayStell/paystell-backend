import { WebhookEventType } from "../enums/WebhookEventTypes";

export type WebhookPayload = {
  transactionId: string;
  transactionType: string | undefined;
  status: string;
  amount: string | undefined;
  asset: string | undefined; // This should be the coin, whether USDC or XLM etc
  merchantId: string;
  timestamp: string;
  nonce?: string;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
  eventType: WebhookEventType; // Updated from string to WebhookEventType enum
  reqMethod: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
};

export type MerchantWebhook = {
  id: string;
  merchantId: string;
  url: string;
  isActive: boolean;
  secretKey?: string;
  eventTypes?: WebhookEventType[];
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type WebhookSubscriptionRequest = {
  url: string;
  secretKey?: string;
  eventTypes?: WebhookEventType[];
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
};

export type WebhookEventResponse = {
  id: string;
  status: string;
  eventType: string;
  createdAt: Date;
  attemptsMade: number;
  maxAttempts: number;
  nextRetry?: Date;
  completedAt?: Date;
};

export type WebhookDeliveryResponse = {
  id: string;
  webhookId: string;
  status: string;
  attemptsMade: number;
  maxAttempts: number;
  createdAt: Date;
  completedAt?: Date;
  responseStatusCode?: number;
  error?: string;
};

export type Merchant = {
  id: string;
  apiKey: string;
  secret: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  business_name?: string;
  business_description?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  business_logo_url?: string;
  updatedAt: Date;
};

const _transactionStatusValues = [
  "incomplete",
  "completed",
  "refunded",
  "expired",
  "error",
  "pending_stellar",
  "pending_external",
  "pending_user_transfer_start",
  "pending_user_transfer_complete",
  "pending_anchor",
  "pending_trust",
  "pending_user",
  "no_market",
  "too_small",
  "too_large",
] as const;
export type TransactionStatus = (typeof _transactionStatusValues)[number];

export interface StellarWebhookPayload {
  id: string;
  type: "transaction_created";
  timestamp: "2024-10-29T17:23:12.164Z";
  payload: {
    transaction: {
      id: string;
      sep: "24";
      kind: "deposit" | "withdrawal";
      status: TransactionStatus;
      type?: string;
      amount_expected: {
        amount: string;
        asset: string;
      };
      amount_in?: {
        amount: string;
        asset: string;
      };
      amount_out?: {
        amount: string;
        asset: string;
      };
      fee_details?: {
        total: string;
        asset: string;
        details?: [
          {
            name: string;
            amount: string;
            description?: string;
          },
        ];
      };
      quote_id?: string;
      started_at: Date;
      updated_at?: Date;
      completed_at?: Date;
      transfer_received_at?: Date;
      user_action_required_by?: Date;
      message?: string;
      refunds?: {
        amount_refunded?: {
          amount: string;
          asset: string;
        };
        amount_fee?: {
          amount: string;
          asset: string;
        };
        payments?: [
          {
            id?: string;
            id_type?: "stellar" | "external";
            amount?: {
              amount: string;
              asset: string;
            };
            fee?: {
              amount: string;
              asset: string;
            };
            requested_at?: Date;
            refunded_at?: Date;
          },
        ];
      };
      stellar_transactions?: [
        {
          id: string;
          memo?: string;
          memo_type?: "text" | "hash" | "id";
          created_at: Date;
          envelope: string;
          payments: [
            {
              id: string;
              payment_type: "payment" | "path_payment";
              source_account: string;
              destination_account: string;
              amount: {
                amount: string;
                asset: string;
              };
            },
          ];
        },
      ];
      source_account?: string;
      destination_account: string;
      external_transaction_id?: string;
      memo: string;
      memo_type?: "text id hash";
      refund_memo?: string;
      refund_memo_type?: "text id hash";
      client_domain?: string;
      client_name?: string;
      customers?: {
        sender?: {
          id?: string;
          account?: string;
          memo?: string;
        };
        receiver?: {
          id?: string;
          account?: string;
          memo?: string;
        };
      };
      creator?: {
        id?: string;
        account?: string;
        memo?: string;
      };
    };
    quote?: {
      id?: string;
      sell_amount?: string;
      sell_asset?: string;
      buy_amount?: string;
      buy_asset?: string;
      expires_at?: Date;
      price?: string;
      total_price?: string;
      creator?: {
        id?: string;
        account?: string;
        memo?: string;
      };
      transaction_id?: string;
      created_at: Date;
    };
    customer: {
      id: string;
    };
  };
}
