const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ChatRequest {
  message: string
  context?: {
    campaigns?: any[]
    segments?: any[]
    analytics?: any[]
  }
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `You are Leia, an expert AI Marketing Strategist for a DTC (Direct-to-Consumer) marketing platform. You help users optimize their marketing campaigns, analyze customer segments, and improve their overall marketing strategy.

Your capabilities include:
- Analyzing email marketing campaigns and their performance metrics
- Creating and optimizing customer segments based on behavioral and demographic data
- Providing strategic recommendations for improving open rates, click rates, and revenue
- Suggesting A/B testing strategies and campaign optimizations
- Helping with customer lifecycle marketing and retention strategies

Guidelines:
- Be conversational, helpful, and actionable in your responses
- Provide specific, data-driven recommendations when possible
- Ask clarifying questions when you need more context
- Keep responses concise but comprehensive
- Focus on practical marketing strategies that drive results
- When suggesting actions, provide clear next steps

Always respond as a knowledgeable marketing expert who understands the challenges of DTC brands and can provide valuable insights to improve their marketing performance.`

async function callOpenAI(messages: OpenAIMessage[]): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || 'I apologize, but I encountered an issue generating a response.'
}

function generateSuggestions(userMessage: string, aiResponse: string): string[] {
  const suggestions = [
    "Analyze my campaign performance",
    "Create a new customer segment",
    "Optimize email open rates",
    "Show me revenue trends",
    "Suggest A/B testing ideas",
    "Help with customer retention",
    "Review segment performance",
    "Improve click-through rates"
  ]

  // Return 3-4 relevant suggestions based on context
  return suggestions.slice(0, Math.floor(Math.random() * 2) + 3)
}

function buildContextualPrompt(message: string, context?: any): string {
  let contextInfo = ''
  
  if (context?.campaigns?.length > 0) {
    const campaignSummary = context.campaigns.slice(0, 3).map((c: any) => 
      `- ${c.name}: ${c.status}, Open Rate: ${c.open_rate || 0}%, Revenue: $${c.revenue || 0}`
    ).join('\n')
    contextInfo += `\nRecent Campaigns:\n${campaignSummary}\n`
  }

  if (context?.segments?.length > 0) {
    const segmentSummary = context.segments.slice(0, 3).map((s: any) => 
      `- ${s.name}: ${s.customer_count} customers, Type: ${s.type}`
    ).join('\n')
    contextInfo += `\nCustomer Segments:\n${segmentSummary}\n`
  }

  if (context?.analytics?.length > 0) {
    const analyticsSummary = context.analytics.slice(0, 3).map((a: any) => 
      `- ${a.metric_name}: ${a.metric_value}`
    ).join('\n')
    contextInfo += `\nKey Metrics:\n${analyticsSummary}\n`
  }

  return contextInfo ? `${contextInfo}\nUser Question: ${message}` : message
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        },
      )
    }

    const { message, context }: ChatRequest = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Build contextual prompt with user's data
    const contextualMessage = buildContextualPrompt(message, context)

    // Prepare messages for OpenAI
    const messages: OpenAIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: contextualMessage }
    ]

    try {
      // Call OpenAI API
      const aiResponse = await callOpenAI(messages)
      
      // Generate relevant suggestions
      const suggestions = generateSuggestions(message, aiResponse)

      return new Response(
        JSON.stringify({
          response: aiResponse,
          suggestions
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } catch (openaiError) {
      console.error('OpenAI error:', openaiError)
      
      // Fallback to mock response if OpenAI fails
      const fallbackResponses = [
        "I'm having trouble connecting to my AI services right now. However, I can still help you with your marketing strategy. What specific aspect would you like to focus on?",
        "I'm experiencing some technical difficulties, but I'm here to help with your campaigns. Could you tell me more about what you're trying to achieve?",
        "My AI capabilities are temporarily limited, but I can still provide marketing guidance. What's your main challenge right now?"
      ]
      
      const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      
      return new Response(
        JSON.stringify({
          response: fallbackResponse,
          suggestions: [
            "Show me campaign analytics",
            "Help with segmentation",
            "Optimize email performance",
            "Review marketing strategy"
          ]
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }
  } catch (error) {
    console.error('AI Chat function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})