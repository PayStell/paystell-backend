/// <reference lib="dom" />

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

class ReferralService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("accessToken")

    // Default headers
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`
    }

    // Merge headers safely
    const headers = {
      ...defaultHeaders,
      ...(options.headers || {}),
    }

    // Construct fetch options with merged headers and other options
    const fetchOptions: RequestInit = {
      ...options,
      headers,
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions)

    if (!response.ok) {
      // Try to parse error message, fallback on network error
      const error = await response.json().catch(() => ({ message: "Network error" }))
      throw new Error(error.message || "Request failed")
    }

    const result: ApiResponse<T> = await response.json()

    if (!result.success) {
      throw new Error(result.message || "Request failed")
    }

    return result.data
  }

  async createReferral(expiresAt?: string) {
    return this.request("/referrals", {
      method: "POST",
      body: JSON.stringify({ expiresAt }),
    })
  }

  async processReferralSignup(referralCode: string) {
    return this.request("/referrals/signup", {
      method: "POST",
      body: JSON.stringify({ referralCode }),
    })
  }

  async getUserReferrals(page = 1, limit = 10) {
    return this.request(`/referrals?page=${page}&limit=${limit}`)
  }

  async getUserStats() {
    return this.request("/referrals/stats")
  }

  async getUserRewards(page = 1, limit = 10) {
    return this.request(`/referrals/rewards?page=${page}&limit=${limit}`)
  }

  async validateReferralCode(code: string) {
    const response = await fetch(`${API_BASE_URL}/referrals/validate/${code}`)
    if (!response.ok) {
      throw new Error("Failed to validate referral code")
    }
    const result = await response.json()
    return result.data
  }

  async processRewardPayment(rewardId: number, transactionHash?: string) {
    return this.request(`/referrals/rewards/${rewardId}/pay`, {
      method: "PUT",
      body: JSON.stringify({ transactionHash }),
    })
  }
}

export const referralService = new ReferralService()
