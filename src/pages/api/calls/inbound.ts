import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { buildVoiceResponse, BASE_URL } from '@/lib/twilio'

export const config = { api: { bodyParser: false } }

// Parse URL-encoded Twilio webhook body
async function parseBody(req: NextApiRequest): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      const params: Record<string, string> = {}
      for (const [k, v] of new URLSearchParams(body)) params[k] = v
      resolve(params)
    })
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const body = await parseBody(req)
  const callSid = body.CallSid
  const fromNumber = body.From
  const toNumber = body.To

  // Store call log
  if (callSid) {
    await prisma.callLog.upsert({
      where: { twilioCallSid: callSid },
      update: {},
      create: {
        twilioCallSid: callSid,
        direction: 'INBOUND',
        fromNumber,
        toNumber,
        status: 'IN_PROGRESS',
      },
    })
  }

  const greeting =
    'Thank you for calling. This is the automated assistant for your construction project. ' +
    'You can ask about your project status, schedule updates, or leave a message. How can I help you today?'

  const twiml = buildVoiceResponse(greeting, `${BASE_URL}/api/calls/voice-response`, callSid)

  res.setHeader('Content-Type', 'text/xml')
  res.send(twiml)
}
