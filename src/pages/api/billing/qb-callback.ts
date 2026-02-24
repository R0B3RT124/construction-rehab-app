import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, realmId } = req.query

  if (!code || !realmId) {
    return res.status(400).send('Missing code or realmId')
  }

  const tokenResponse = await fetch('https://oauth.platform.intuit.com/op/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: process.env.QB_REDIRECT_URI!,
    }),
  })

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text()
    return res.status(500).send(`QB token exchange failed: ${err}`)
  }

  const tokens = await tokenResponse.json()

  await prisma.qBToken.upsert({
    where: { realmId: realmId as string },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      refreshExpiresAt: new Date(Date.now() + (tokens.x_refresh_token_expires_in || 8726400) * 1000),
    },
    create: {
      realmId: realmId as string,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      refreshExpiresAt: new Date(Date.now() + (tokens.x_refresh_token_expires_in || 8726400) * 1000),
    },
  })

  res.redirect('/dashboard?qb=connected')
}
