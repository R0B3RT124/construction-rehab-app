import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/claude'

export const config = { api: { bodyParser: false } }

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
  const callStatus = body.CallStatus
  const recordingUrl = body.RecordingUrl
  const callDuration = body.CallDuration ? parseInt(body.CallDuration) : undefined

  if (!callSid) return res.status(400).end()

  // Update call log status
  const callLog = await prisma.callLog.findUnique({ where: { twilioCallSid: callSid } })
  if (!callLog) return res.status(200).end()

  const statusMap: Record<string, 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY'> = {
    completed: 'COMPLETED',
    failed: 'FAILED',
    'no-answer': 'NO_ANSWER',
    busy: 'BUSY',
  }

  await prisma.callLog.update({
    where: { twilioCallSid: callSid },
    data: {
      status: statusMap[callStatus] || 'COMPLETED',
      duration: callDuration,
      recordingUrl: recordingUrl || undefined,
      endedAt: new Date(),
    },
  })

  // Generate AI summary of the transcript
  if (callLog.transcript) {
    try {
      const summaryResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Summarize this phone call transcript in 2-3 sentences. Focus on: what the caller needed, any action items, and the outcome.\n\nTranscript:\n${callLog.transcript}`,
          },
        ],
      })

      const summary = summaryResponse.content.find((b) => b.type === 'text')?.text || ''

      await prisma.callLog.update({
        where: { twilioCallSid: callSid },
        data: { summary, routedToAgent: 'LIAISON' },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          agentType: 'LIAISON',
          actorType: 'system',
          action: `Inbound call completed (${callDuration || 0}s): ${summary.slice(0, 100)}`,
          entityType: 'CallLog',
          entityId: callLog.id,
          projectId: callLog.projectId || undefined,
        },
      })
    } catch (err) {
      console.error('Failed to summarize call:', err)
    }
  }

  res.status(200).end()
}
