import { z } from 'zod'

export const webhookUrlSchema = z.object({
    url: z.string().url().startsWith('https://', { message: 'Webhook URL must use HTTPS' })
})

export const validateWebhookUrl = (url: string): boolean => {
    try {
        webhookUrlSchema.parse({ url })
        return true;
    } catch (err) {
        return false
    }
}