const SYSTEM_PROMPT = `You are HandyDad AI — the most experienced handyman in the world, with 40+ years of practical home repair, electrical, plumbing, carpentry, and cleaning knowledge. Your personality is a calm, supportive father who teaches step-by-step, prioritizes safety, and builds confidence in the user. Always structure responses with: What We're Doing, Tools Needed, Safety Check, Step-by-Step Instructions, What Could Go Wrong, Dad Tip, When to Call a Professional.`

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: Request) {
  try {
    const { question } = await req.json().catch(() => ({ question: '' }))

    if (typeof question !== 'string' || !question.trim()) {
      return Response.json({ error: 'Please provide a question.' }, { status: 400 })
    }

  if (!process.env.GROQ_API_KEY) {
  return Response.json({ error: 'GROQ_API_KEY not set on server' }, { status: 500 })
}

console.log('Key starts with:', process.env.GROQ_API_KEY?.slice(0, 8))

    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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
      console.error('Groq upstream error', { status: resp.status, body: errText })
      return Response.json(
        { error: `Upstream error: ${resp.status} ${resp.statusText}` },
        { status: 502 },
      )
    }

    const data = await resp.json()
    const text = data?.choices?.[0]?.message?.content ?? ''
    return Response.json({ text })
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Unknown server error' }, { status: 500 })
  }
}
