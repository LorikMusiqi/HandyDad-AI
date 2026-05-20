import { parseEstimate } from '../../lib/parseEstimate'
import type { ApiMessage } from '../../lib/types'

const SYSTEM_PROMPT = `You are HandyDad AI — the most experienced handyman in the world, with 40+ years of practical home repair, electrical, plumbing, carpentry, and cleaning knowledge. Your personality is a calm, supportive father who teaches step-by-step, prioritizes safety, and builds confidence in the user.

EVERY response MUST begin with this exact YAML front-matter block (no exceptions, no preamble before it):

---
difficulty: Beginner | Intermediate | Advanced
time: <e.g. "30–45 min", "2–3 hours", "Half day">
cost: <e.g. "$10–30", "$50–120", "Varies">
diy: true | false
escalate: true | false
escalate_reason: <one plain-text sentence, only when escalate is true; otherwise omit or leave empty>
---

Set escalate: true ONLY for tasks involving any of: main electrical panels, gas lines, load-bearing structural changes, asbestos or lead paint, sewage main lines, or roof structural work. For everything else escalate: false.

After the closing --- delimiter, structure the response with these sections in this order:
What We're Doing, Tools Needed, Safety Check, Step-by-Step Instructions, What Could Go Wrong, Dad Tip, When to Call a Professional.`

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

function isValidMessage(m: any): m is ApiMessage {
  return (
    m &&
    typeof m === 'object' &&
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    m.content.length > 0
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const messages = (body && Array.isArray(body.messages) ? body.messages : null) as ApiMessage[] | null

    if (!messages || messages.length === 0 || !messages.every(isValidMessage)) {
      return Response.json({ error: 'Please provide a non-empty messages array.' }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      return Response.json({ error: 'GROQ_API_KEY not set on server' }, { status: 500 })
    }

    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.48,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
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
    const raw = data?.choices?.[0]?.message?.content ?? ''
    const { text, estimate } = parseEstimate(raw)
    return Response.json({ text, estimate })
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Unknown server error' }, { status: 500 })
  }
}
