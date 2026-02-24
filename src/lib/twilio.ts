import twilio from 'twilio'
import { twiml } from 'twilio'

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!
export const BASE_URL = process.env.BASE_URL!

export function buildVoiceResponse(
  spokenText: string,
  gatherAction: string,
  callSid?: string
): string {
  const response = new twiml.VoiceResponse()
  const gather = response.gather({
    input: ['speech'],
    action: `${gatherAction}${callSid ? `?callSid=${callSid}` : ''}`,
    speechTimeout: 'auto',
    language: 'en-US',
    enhanced: true,
  })
  gather.say({ voice: 'Polly.Joanna', language: 'en-US' }, spokenText)
  // If no input, re-prompt
  response.say({ voice: 'Polly.Joanna' }, 'I did not catch that. Goodbye.')
  response.hangup()
  return response.toString()
}

export function buildHangupResponse(message?: string): string {
  const response = new twiml.VoiceResponse()
  if (message) {
    response.say({ voice: 'Polly.Joanna' }, message)
  }
  response.hangup()
  return response.toString()
}

export async function initiateOutboundCall(
  toNumber: string,
  scriptParam: string,
  projectId?: string
): Promise<string> {
  const params = new URLSearchParams({ script: scriptParam })
  if (projectId) params.set('projectId', projectId)

  const call = await twilioClient.calls.create({
    to: toNumber,
    from: TWILIO_PHONE_NUMBER,
    url: `${BASE_URL}/api/calls/voice-response?${params.toString()}`,
    statusCallback: `${BASE_URL}/api/calls/recording`,
    statusCallbackMethod: 'POST',
    record: true,
    recordingStatusCallback: `${BASE_URL}/api/calls/recording`,
    recordingStatusCallbackMethod: 'POST',
  })

  return call.sid
}

export async function sendSms(to: string, body: string): Promise<string> {
  const message = await twilioClient.messages.create({
    to,
    from: TWILIO_PHONE_NUMBER,
    body,
  })
  return message.sid
}
