import type { NextApiRequest, NextApiResponse } from 'next'
import { getQBAuthorizationUrl } from '@/lib/quickbooks'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const url = getQBAuthorizationUrl()
  res.redirect(url)
}
