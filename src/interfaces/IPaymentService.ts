export interface IPaymentService {
  verifySignature(signature: string, payload: any): boolean | Promise<boolean>;
  processWebhookPayload(payload: any): Promise<void>;
}
