import type { MoodType } from '../types/mood.ts'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM_PROMPT = `🔧 System Instruction (Top section in AI Studio)

You are BreakBuddy, a witty, sarcastic, but kind productivity companion for developers.
You help users take small breaks when they’ve been coding or focusing for too long.
Keep your personality casual, caffeinated, and human — like a supportive teammate who roasts you just enough to care.

Your behavior rules:
\t•\tResponses must be under 25 words.
\t•\tKeep the tone funny, dry, or mildly sarcastic — never mean or depressing.
\t•\tEncourage positive action: hydrate, stretch, move, breathe, or laugh.
\t•\tNever repeat the same suggestion twice in a row.
\t•\tAvoid corporate or generic wellness phrases.
\t•\tYou may reference coding humor, caffeine, or burnout in lighthearted ways.

Example tone:
\t•\t“Blink. Again. Your retinas deserve hazard pay.”
\t•\t“Hydration checkpoint. Coffee doesn’t count.”

Your mission: help devs chill out without sounding like an HR pamphlet.`

type BreakSuggestionRequest = {
  focusMinutes: number
  mood: MoodType | null
  previousSuggestion?: string
  sessionCount?: number
}

type GeminiPart = {
  text?: string
}

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[]
  }
  finishReason?: string
}

type GeminiResponse = {
  candidates?: GeminiCandidate[]
  promptFeedback?: unknown
}

const buildUserPrompt = ({
  focusMinutes,
  mood,
  previousSuggestion,
  sessionCount,
}: BreakSuggestionRequest) => {
  const readableFocus = focusMinutes <= 0 ? 1 : focusMinutes
  const moodValue = mood ?? 'none provided'
  const repeatLine = previousSuggestion
    ? `Last suggestion: "${previousSuggestion}". Do not repeat it.`
    : 'No previous suggestion this session.'
  const sessionLine = sessionCount
    ? `Session count today: ${sessionCount}.`
    : 'Session count today: not provided.'

  return `User’s focus duration: ${readableFocus} minutes
User’s current mood: ${moodValue}
${sessionLine}
Generate one short break suggestion following your personality rules.
Include light sarcasm or humor relevant to the situation.
Avoid generic text or motivational clichés.
${repeatLine}`
}

export const fetchBreakSuggestion = async (
  request: BreakSuggestionRequest
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'Gemini API key missing. Set VITE_GEMINI_API_KEY and reload.'
    )
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildUserPrompt(request) }],
        },
      ],
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0.8,
        topP: 0.8,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Gemini request failed (${response.status}): ${
        errorText || 'Unknown error'
      }`
    )
  }

  const data = (await response.json()) as GeminiResponse
  const candidate = data.candidates?.[0]
  const rawText = candidate?.content?.parts?.find((part) => !!part.text)?.text

  if (!rawText) {
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error(
        'Gemini hit the token cap before finishing the suggestion. Try again or shorten the prompt.'
      )
    }
    throw new Error('Gemini returned an empty suggestion.')
  }

  const cleaned = rawText.trim()

  if (cleaned.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleaned) as {
        break_suggestion?: string
        suggestion?: string
      }
      if (parsed.break_suggestion || parsed.suggestion) {
        return (parsed.break_suggestion ?? parsed.suggestion).trim()
      }
    } catch {
      // ignore parse errors and fall back to the raw string
    }
  }

  return cleaned
}
