/**
 * AI calls try free providers first and keep OpenRouter as the last resort.
 * A missing key skips that provider. Keys are never returned to the client.
 */

export type AiKind = "vision" | "text" | "letter"

export type AiProviderName = "gemini" | "groq" | "openrouter"

export type AiEnv = {
  GEMINI_API_KEY?: string
  GEMINI_MODELS?: string
  GROQ_API_KEY?: string
  GROQ_MODEL?: string
  OPENROUTER_API_KEY?: string
}

type EnvSource = AiEnv | NodeJS.ProcessEnv

function asAiEnv(env: EnvSource = process.env): AiEnv {
  return env as AiEnv
}

export type CompletionTarget = {
  provider: AiProviderName
  model: string
}

export type ChatPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string | ChatPart[]
}

export type CompletionOptions = {
  json: boolean
  timeoutMs: number
  maxTokens: number
}

/** Flash-Lite first. Flash models on this key are capped at 20 requests a day. */
const DEFAULT_GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-2.5-flash-lite",
]

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"

/** Room for Groq reasoning tokens plus the letter or JSON. */
export const GROQ_MAX_TOKENS = 16384

/** Existing OpenRouter vision chain. */
export const OPENROUTER_VISION_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-4-scout",
]

/** Existing OpenRouter text-extraction chain. */
export const OPENROUTER_TEXT_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "meta-llama/llama-3.3-70b-instruct",
]

/** Existing OpenRouter letter chain. */
export const OPENROUTER_LETTER_MODELS = [
  "openrouter/free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
]

const OPENROUTER_JSON_MODELS = new Set([
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
])

export const AI_NOT_CONFIGURED = "AI is not set up yet. Please try again later."
export const AI_BUSY = "AI generation network is currently at capacity. Please try again in a few seconds."
export const AI_LETTER_FAILED = "Couldn't draft the letter. Please try again in a moment."
export const AI_EXTRACT_FAILED = "Couldn't read that file. Please try again."

export class ProviderRequestError extends Error {
  readonly status: number | null
  readonly provider: AiProviderName
  readonly model: string

  constructor(provider: AiProviderName, model: string, status: number | null, message: string) {
    super(message)
    this.name = "ProviderRequestError"
    this.status = status
    this.provider = provider
    this.model = model
  }
}

export function parseModelList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback
  const models = raw.split(",").map((item) => item.trim()).filter(Boolean)
  return models.length > 0 ? models : fallback
}

/** Gemini moves on for these statuses. Other codes are a normal failed attempt. */
export function shouldSkipStatus(status: number): boolean {
  if (status === 429 || status === 403 || status === 404) return true
  return status >= 500 && status <= 599
}

export function stripOuterFence(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json|text|markdown)?\s*([\s\S]*?)\s*```$/i)
  return fenced?.[1]?.trim() || trimmed
}

function key(value: string | undefined): string {
  return value?.trim() ?? ""
}

export function geminiModels(env: AiEnv): string[] {
  return parseModelList(env.GEMINI_MODELS, DEFAULT_GEMINI_MODELS)
}

export function groqModel(env: AiEnv): string {
  return env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL
}

function openRouterModels(kind: AiKind): string[] {
  if (kind === "vision") return OPENROUTER_VISION_MODELS
  if (kind === "text") return OPENROUTER_TEXT_MODELS
  return OPENROUTER_LETTER_MODELS
}

export function targetsFor(kind: AiKind, env: EnvSource = process.env): CompletionTarget[] {
  const source = asAiEnv(env)
  const targets: CompletionTarget[] = []
  if (key(source.GEMINI_API_KEY)) {
    for (const model of geminiModels(source)) targets.push({ provider: "gemini", model })
  }
  if (kind !== "vision" && key(source.GROQ_API_KEY)) {
    targets.push({ provider: "groq", model: groqModel(source) })
  }
  if (key(source.OPENROUTER_API_KEY)) {
    for (const model of openRouterModels(kind)) targets.push({ provider: "openrouter", model })
  }
  return targets
}

export function configuredProviders(env: EnvSource = process.env): Array<{
  provider: AiProviderName
  configured: boolean
  models: string[]
}> {
  const source = asAiEnv(env)
  return [
    { provider: "gemini", configured: Boolean(key(source.GEMINI_API_KEY)), models: geminiModels(source) },
    { provider: "groq", configured: Boolean(key(source.GROQ_API_KEY)), models: [groqModel(source)] },
    {
      provider: "openrouter",
      configured: Boolean(key(source.OPENROUTER_API_KEY)),
      models: unique([
        ...OPENROUTER_VISION_MODELS,
        ...OPENROUTER_TEXT_MODELS,
        ...OPENROUTER_LETTER_MODELS,
      ]),
    },
  ]
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function imageData(url: string): { mimeType: string; data: string } | null {
  const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/)
  if (!match?.[1] || !match[2]) return null
  return { mimeType: match[1], data: match[2].replace(/\s/g, "") }
}

async function readErrorStatus(response: Response): Promise<number> {
  const status = response.status
  const length = Number(response.headers.get("content-length") ?? 0)
  await response.text().catch(() => "")
  console.warn(`[AI] HTTP ${status} (${length} byte body discarded)`)
  return status
}

export async function completeChat(
  target: CompletionTarget,
  messages: ChatMessage[],
  options: CompletionOptions,
  env: EnvSource = process.env,
): Promise<string> {
  const source = asAiEnv(env)
  if (target.provider === "gemini") return completeGemini(target.model, messages, options, key(source.GEMINI_API_KEY))
  if (target.provider === "groq") return completeOpenAI("groq", target.model, messages, options, key(source.GROQ_API_KEY), true)
  return completeOpenAI("openrouter", target.model, messages, options, key(source.OPENROUTER_API_KEY), false)
}

async function completeGemini(
  model: string,
  messages: ChatMessage[],
  options: CompletionOptions,
  apiKey: string,
): Promise<string> {
  if (!apiKey) throw new ProviderRequestError("gemini", model, null, `${model}: not configured`)

  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => (typeof message.content === "string" ? message.content : ""))
    .filter(Boolean)
    .join("\n\n")

  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: geminiParts(message.content),
    }))

  const generationConfig: Record<string, unknown> = {
    temperature: 0.1,
    maxOutputTokens: options.maxTokens,
  }
  if (options.json) generationConfig.responseMimeType = "application/json"

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents,
          generationConfig,
        }),
      },
    )
    if (!response.ok) {
      const status = await readErrorStatus(response)
      throw new ProviderRequestError("gemini", model, status, `${model}: HTTP ${status}`)
    }
    const payload: unknown = await response.json()
    const text = geminiText(payload)
    if (!text) throw new ProviderRequestError("gemini", model, 200, `${model}: empty response`)
    return text
  } catch (error: unknown) {
    if (error instanceof ProviderRequestError) throw error
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderRequestError("gemini", model, null, `${model}: timed out`)
    }
    throw new ProviderRequestError("gemini", model, null, `${model}: unreachable`)
  } finally {
    clearTimeout(timeoutId)
  }
}

function geminiParts(content: ChatMessage["content"]): Array<Record<string, unknown>> {
  if (typeof content === "string") return [{ text: content }]
  const parts: Array<Record<string, unknown>> = []
  for (const part of content) {
    if (part.type === "text") {
      parts.push({ text: part.text })
      continue
    }
    const image = imageData(part.image_url.url)
    parts.push(image ? { inlineData: { mimeType: image.mimeType, data: image.data } } : { text: "" })
  }
  return parts
}

function geminiText(payload: unknown): string {
  const candidates = asRecord(payload).candidates
  const first = asRecord(Array.isArray(candidates) ? candidates[0] : null)
  const parts = asRecord(first.content).parts
  if (!Array.isArray(parts)) return ""
  return parts
    .map((part) => {
      const text = asRecord(part).text
      return typeof text === "string" ? text : ""
    })
    .join("")
    .trim()
}

async function completeOpenAI(
  provider: "groq" | "openrouter",
  model: string,
  messages: ChatMessage[],
  options: CompletionOptions,
  apiKey: string,
  groq: boolean,
): Promise<string> {
  if (!apiKey) throw new ProviderRequestError(provider, model, null, `${model}: not configured`)

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.1,
    max_tokens: groq ? Math.max(options.maxTokens, GROQ_MAX_TOKENS) : options.maxTokens,
  }
  const wantsJson = options.json && (groq || OPENROUTER_JSON_MODELS.has(model))
  if (wantsJson) body.response_format = { type: "json_object" }

  const url = groq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions"

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs)
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const status = await readErrorStatus(response)
      throw new ProviderRequestError(provider, model, status, `${model}: HTTP ${status}`)
    }
    const payload: unknown = await response.json()
    const record = asRecord(payload)
    if (record.error) {
      throw new ProviderRequestError(provider, model, response.status, `${model}: HTTP ${response.status}`)
    }
    const choices = record.choices
    const message = asRecord(asRecord(Array.isArray(choices) ? choices[0] : null).message)
    const content = typeof message.content === "string" ? message.content.trim() : ""
    if (!content) throw new ProviderRequestError(provider, model, 200, `${model}: empty response`)
    return content
  } catch (error: unknown) {
    if (error instanceof ProviderRequestError) throw error
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderRequestError(provider, model, null, `${model}: timed out`)
    }
    throw new ProviderRequestError(provider, model, null, `${model}: unreachable`)
  } finally {
    clearTimeout(timeoutId)
  }
}

export type ModelHealth = {
  model: string
  ok: boolean | null
  httpStatus: number | null
}

export type ProviderHealth = {
  provider: AiProviderName
  configured: boolean
  models: ModelHealth[]
}

/** Default health checks ping the first model only so a status page does not spend the daily quota. */
export function modelsToPing(models: string[], all: boolean): number {
  if (models.length === 0) return 0
  return all ? models.length : 1
}

export async function checkAiHealth(
  env: EnvSource = process.env,
  options: { all?: boolean } = {},
): Promise<ProviderHealth[]> {
  const providers = configuredProviders(env)
  const all = options.all === true
  return Promise.all(providers.map(async (provider) => {
    const idle = provider.models.map((model) => ({ model, ok: null, httpStatus: null }))
    if (!provider.configured) {
      return { provider: provider.provider, configured: false, models: idle }
    }
    const limit = modelsToPing(provider.models, all)
    const models = await Promise.all(provider.models.map(async (model, index) => {
      if (index >= limit) return { model, ok: null, httpStatus: null }
      const target: CompletionTarget = { provider: provider.provider, model }
      try {
        const text = await completeChat(
          target,
          [{ role: "user", content: "Reply with ok." }],
          {
            json: false,
            timeoutMs: 12000,
            maxTokens: provider.provider === "groq" ? 1024 : 32,
          },
          env,
        )
        return { model, ok: text.length > 0, httpStatus: 200 }
      } catch (error: unknown) {
        const status = error instanceof ProviderRequestError ? error.status : null
        return { model, ok: false, httpStatus: status }
      }
    }))
    return { provider: provider.provider, configured: true, models }
  }))
}
