import crypto from 'crypto'
import { WebhookPayload } from '../interfaces/webhook.interfaces';

export class CryptoGeneratorService {

    async generateSignatureForWebhookPayload(payload: WebhookPayload, secret: string): Promise<string> {
        const nonce = await this.generateNonce()
        const { timestamp } = payload
        const timestampMs = Date.parse(timestamp);
        const now = Date.now()

        if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
            throw new Error('Timestamp validation failed. Request too old or future dated')
        }

        const hmac = crypto.createHmac('sha256', secret);
        payload.nonce = nonce

        const dataToSign = {
            ...payload, nonce, timestamp
        }

        hmac.update(JSON.stringify(dataToSign))
        const signature = hmac.digest('hex')

        if (payload.reqMethod === 'GET' || payload.reqMethod.startsWith('GET_')) {
            const url = new URL(payload.metadata?.url);
            url.searchParams.append('signature', signature)
            return url.toString()
        }

        return signature
    }

    private async generateNonce (): Promise<string> {
        return crypto.randomBytes(16).toString('hex');
    }
}