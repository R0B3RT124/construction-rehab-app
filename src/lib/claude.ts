import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export type ToolHandler = (name: string, input: unknown) => Promise<unknown>

export interface AgentLoopResult {
  finalResponse: string
  totalInputTokens: number
  totalOutputTokens: number
  iterations: number
}

/**
 * Runs a multi-turn Claude tool-use agentic loop.
 * Continues until Claude stops calling tools or maxIterations is reached.
 */
export async function runAgentLoop(
  systemPrompt: string,
  userMessage: string,
  tools: Anthropic.Tool[],
  toolHandler: ToolHandler,
  model: string = 'claude-sonnet-4-5',
  maxIterations: number = 15
): Promise<AgentLoopResult> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let iterations = 0
  let finalResponse = ''

  for (let i = 0; i < maxIterations; i++) {
    iterations++

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    })

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )

    if (textBlocks.length > 0) {
      finalResponse = textBlocks.map((b) => b.text).join('\n')
    }

    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      break
    }

    // Execute all tool calls in this response
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of toolUseBlocks) {
      try {
        const result = await toolHandler(block.name, block.input)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        })
      } catch (err) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
          is_error: true,
        })
      }
    }

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })
  }

  return { finalResponse, totalInputTokens, totalOutputTokens, iterations }
}
