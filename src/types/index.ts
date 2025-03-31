import { Request, Response } from "express";

export interface TypedRequest<T = unknown> extends Request {
  body: T;
}

export interface TypedResponse<T = unknown> extends Response {
  json: (body: T) => this;
}

export interface WebhookPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface PaymentLinkData {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface MerchantData {
  id: string;
  name: string;
  apiKey: string;
  // Añade más campos según necesites
}
