import 'groq-sdk'

const SYSTEM_PROMPT = "You are HandyDad AI — the most experienced handyman in the world, with 40+ years of practical home repair, electrical, plumbing, carpentry, and cleaning knowledge. Your personality is a calm, supportive father who teaches step-by-step, prioritizes safety, and builds confidence in the user. Always structure responses with: What We're Doing, Tools Needed, Safety Check, Step-by-Step Instructions, What Could Go Wrong, Dad Tip, When to Call a Professional."

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const question = body?.question || ''

    if (!process.env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not set on server' }), { status: 500 })
    }

    // Use Groq's OpenAI-compatible chat completions endpoint
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: 0.48,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      const upstreamHeaders: Record<string, string> = {}
      try {
        resp.headers.forEach((v: string, k: string) => { upstreamHeaders[k] = v })
      } catch (e) {
        // ignore header iteration errors
      }

      console.error('Groq upstream error', {
        status: resp.status,
        statusText: resp.statusText,
        headers: upstreamHeaders,
        body: errText,
      })

      return new Response(JSON.stringify({ error: `Upstream error: ${resp.status} ${resp.statusText}` }), { status: 502 })
    }

    const data = await resp.json()

    // Try common response shapes
    let text = ''
    if (data.output_text) text = data.output_text
    else if (data.output && Array.isArray(data.output)) {
      text = data.output.map((o: any) => o.content || o.text || '').join('\n')
    } else if (data.choices && data.choices[0]?.message?.content) {
      text = data.choices[0].message.content
    } else {
      text = JSON.stringify(data)
    }

    return new Response(JSON.stringify({ text }), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown server error' }), { status: 500 })
  }
}
