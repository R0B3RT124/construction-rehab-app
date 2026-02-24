import type { NextApiRequest, NextApiResponse } from 'next'
import { anthropic } from '@/lib/claude'
import { prisma } from '@/lib/prisma'
import { buildVoiceResponse, buildHangupResponse, BASE_URL } from '@/lib/twilio'

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

const CALL_SYSTEM_PROMPT = `You are a helpful assistant for a construction rehabilitation company.
You are answering a phone call. Be concise and conversational — your responses will be spoken via text-to-speech.
Keep responses under 3 sentences for phone conversations.
You can help with: project status inquiries, scheduling questions, general information.
For specific project details you don't have access to, politely ask the caller to call back during business hours or offer to take a message.
If the caller wants to end the call, say a brief goodbye and end with: "CALL_COMPLETE"`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const body = await parseBody(req)
  const speechResult = body.SpeechResult || body.script || ''
  const callSid = body.callSid || body.CallSid || req.query.callSid as string
  const projectId = req.query.projectId as string | undefined

  if (!speechResult) {
    const twiml = buildHangupResponse('I did not receive any input. Goodbye.')
    res.setHeader('Content-Type', 'text/xml')
    return res.send(twiml)
  }

  // Fetch project context if available
  let projectContext = ''
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { milestones: true, scheduleItems: { take: 5, orderBy: { startDate: 'asc' } } },
    })
    if (project) {
      projectContext = `Project: ${project.name} at ${project.address}. Status: ${project.status}. Completion: ${project.completionPct}%.`
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: `${CALL_SYSTEM_PROMPT}${projectContext ? '\n\nProject context: ' + projectContext : ''}`,
      messages: [{ role: 'user', content: speechResult }],
    })

    const aiText = response.content.find((b) => b.type === 'text')?.text || 'I apologize, I could not process your request.'

    // Update transcript
    if (callSid) {
      const existing = await prisma.callLog.findUnique({ where: { twilioCallSid: callSid } })
      if (existing) {
        await prisma.callLog.update({
          where: { twilioCallSid: callSid },
          data: {
            transcript: (existing.transcript || '') + `\nCaller: ${speechResult}\nAgent: ${aiText}`,
          },
        })
      }
    }

    if (aiText.includes('CALL_COMPLETE')) {
      const goodbyeText = aiText.replace('CALL_COMPLETE', '').trim()
      const twiml = buildHangupResponse(goodbyeText || 'Thank you for calling. Goodbye!')
      res.setHeader('Content-Type', 'text/xml')
      return res.send(twiml)
    }

    const twiml = buildVoiceResponse(aiText, `${BASE_URL}/api/calls/voice-response`, callSid)
    res.setHeader('Content-Type', 'text/xml')
    return res.send(twiml)
  } catch (err) {
    console.error('Voice response error:', err)
    const twiml = buildHangupResponse('I am experiencing technical difficulties. Please call back later. Goodbye.')
    res.setHeader('Content-Type', 'text/xml')
    return res.send(twiml)
  }
}
