import { prisma } from './prisma'

const QB_BASE_URL =
  process.env.QB_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'

const QB_AUTH_URL = 'https://oauth.platform.intuit.com/op/v1/token'

export async function getValidQBToken(realmId: string) {
  const token = await prisma.qBToken.findUnique({ where: { realmId } })
  if (!token) throw new Error('QuickBooks not connected. Please authenticate first.')

  if (token.expiresAt < new Date()) {
    // Refresh access token
    const response = await fetch(QB_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })

    if (!response.ok) throw new Error('Failed to refresh QuickBooks token')

    const data = await response.json()
    const updated = await prisma.qBToken.update({
      where: { realmId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || token.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        refreshExpiresAt: data.x_refresh_token_expires_in
          ? new Date(Date.now() + data.x_refresh_token_expires_in * 1000)
          : token.refreshExpiresAt,
      },
    })
    return updated
  }

  return token
}

export async function getFirstQBToken() {
  return prisma.qBToken.findFirst()
}

export async function qbApiRequest(
  realmId: string,
  path: string,
  method: string = 'GET',
  body?: unknown
) {
  const token = await getValidQBToken(realmId)
  const url = `${QB_BASE_URL}/v3/company/${realmId}${path}`

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`QuickBooks API error: ${response.status} ${err}`)
  }

  return response.json()
}

export function getQBAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.QB_CLIENT_ID!,
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: process.env.QB_REDIRECT_URI!,
    response_type: 'code',
    access_type: 'offline',
    state: 'construction-rehab',
  })
  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`
}
