export interface IMerchantAuthService {
  getMerchantById(merchantId: string): Promise<any>;
}
