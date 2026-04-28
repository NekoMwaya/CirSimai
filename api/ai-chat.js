// api/ai-chat.js  –  Vercel Serverless Function
// Replaces the Vite dev-server middleware that used to live in vite.config.js

import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import { retrieveClosestExamples, getExamplesPromptBlock } from '../ai/semanticRetrieval.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_MODELS = new Set([
  'gemma-4-26b-a4b-it',
  'gemma-4-31b-it'
])

const ALLOWED_MODES = new Set(['ask', 'agent', 'planning'])

// ---------------------------------------------------------------------------
// Pure helpers (no I/O)
// ---------------------------------------------------------------------------

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }
  return fallback
}

function getAlternateModel(model) {
  return model === 'gemma-4-26b-a4b-it' ? 'gemma-4-31b-it' : 'gemma-4-26b-a4b-it'
}

function isRateLimitError(error) {
  const status = Number(error?.status || error?.statusCode || 0)
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()

  return (
    status === 429 ||
    code.includes('resource_exhausted') ||
    code.includes('rate') ||
    message.includes('rate limit') ||
    message.includes('resource_exhausted') ||
    message.includes('quota')
  )
}

function getModeInstruction(mode, circuitNetlist) {
  const referenceNetlist = String(circuitNetlist || '').trim() || '* Empty Canvas';

  if (mode === 'agent') {
    return [
      'You are an autonomous circuit engineering agent.',
      'CRITICAL REASONING DIRECTIVE: Be extremely decisive. Once you reach a solution in your internal thoughts, proceed immediately to output. Do not double-check or repeat your reasoning once a valid netlist structure is identified.',
      'Return ONLY a SPICE netlist as plain text with [LAYOUT] tags. No markdown fences. No explanations.',
      `Current Canvas:\n${referenceNetlist}`
    ].join('\n\n')
  }

  if (mode === 'planning') {
    return [
      'You are a hardware architecture planner.',
      'If the user is just greeting you or asking a general theory question, reply normally and conversationally. Do NOT use any XML tags in that case.',
      'If the user is asking to design, build, or outline a circuit, you MUST wrap your entire step-by-step blueprint inside <PLAN> and </PLAN> tags.',
      'Example of a plan response:',
      '<PLAN>',
      '## Low-Pass RC Filter',
      '1. Place a 5V DC Source (V1).',
      '2. Add a 1kΩ Resistor (R1) in series.',
      '3. Connect a 10µF Capacitor (C1) from the mid-node to ground.',
      '</PLAN>',
      'DO NOT write the SPICE netlist inside the plan. Write clear, structured markdown.',
      `Current Canvas:\n${referenceNetlist}`
    ].join('\n\n')
  }

  // Default to 'ask'
  return [
    'You are an electrical engineering copilot.',
    'Answer the user\'s questions regarding theory, debugging, or SPICE syntax clearly and concisely.',
    `Current Canvas:\n${referenceNetlist}`
  ].join('\n\n')
}

function sanitizeMessageHistory(rawHistory, fallbackUserMessage) {
  const baseHistory = Array.isArray(rawHistory) ? rawHistory : []
  const cleaned = baseHistory
    .map((entry) => ({
      role: String(entry?.role || '').toLowerCase(),
      content: String(entry?.content || '').trim()
    }))
    .filter((entry) => entry.content && ['system', 'user', 'assistant'].includes(entry.role))

  if (!cleaned.some((entry) => entry.role === 'system')) {
    cleaned.unshift({
      role: 'system',
      content: 'You are a circuit designer. Output only custom netlist code.'
    })
  }

  if (!cleaned.some((entry) => entry.role === 'user') && fallbackUserMessage) {
    cleaned.push({ role: 'user', content: fallbackUserMessage })
  }

  return cleaned
}

function buildPromptFromHistory(messageHistory, extraSections = []) {
  const historyBlock = JSON.stringify(messageHistory, null, 2)
  const sections = [
    'Use this conversation memory array as context:',
    historyBlock,
    ...extraSections.filter(Boolean)
  ]
  return sections.join('\n\n')
}

function tryParseValidationJson(rawText) {
  const text = String(rawText || '').trim()
  if (!text) return null

  const tryParse = (value) => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  const direct = tryParse(text)
  if (direct) return direct

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch?.[1]) {
    const fenced = tryParse(fenceMatch[1].trim())
    if (fenced) return fenced
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    const objectSlice = text.slice(start, end + 1)
    const sliced = tryParse(objectSlice)
    if (sliced) return sliced
  }

  return null
}

function extractThinkingText(response) {
  const parts = response?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''

  return parts
    .filter((part) => part?.thought === true && typeof part?.text === 'string' && part.text.trim())
    .map((part) => part.text.trim())
    .join('\n\n')
    .trim()
}

function extractChunkTextParts(responseChunk) {
  const parts = responseChunk?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts) || parts.length === 0) {
    return {
      thinkingText: '',
      answerText: String(responseChunk?.text || '')
    }
  }

  let thinkingText = ''
  let answerText = ''

  parts.forEach((part) => {
    if (typeof part?.text !== 'string' || !part.text) return
    if (part?.thought === true) {
      thinkingText += part.text
      return
    }
    answerText += part.text
  })

  return { thinkingText, answerText }
}

function accumulateChunkDelta(nextText, previousText) {
  const normalizedNext = String(nextText || '')
  const normalizedPrevious = String(previousText || '')

  if (!normalizedNext) {
    return { delta: '', nextText: normalizedPrevious }
  }

  if (normalizedNext.startsWith(normalizedPrevious)) {
    return {
      delta: normalizedNext.slice(normalizedPrevious.length),
      nextText: normalizedNext
    }
  }

  // Some stream payloads are pure deltas instead of cumulative text.
  return {
    delta: normalizedNext,
    nextText: `${normalizedPrevious}${normalizedNext}`
  }
}

function buildGenerationConfig(includeThinking, model = '') {
  const baseConfig = {
    maxOutputTokens: 16384
  }

  // Only gemma-4-31b doesn't support thinkingLevel parameter
  const supportsThinking = !model.includes('gemma')

  if (!includeThinking || !supportsThinking) {
    return baseConfig
  }

  return {
    ...baseConfig,
    thinkingConfig: {
      includeThoughts: true,
      thinkingLevel: 'medium'
    }
  }
}

// ---------------------------------------------------------------------------
// AI call helpers
// ---------------------------------------------------------------------------

async function generateWithFallback({ ai, primaryModel, fallbackModel, requestBody }) {
  let response
  let usedModel = primaryModel

  try {
    response = await ai.models.generateContent({
      model: primaryModel,
      ...requestBody
    })
  } catch (primaryError) {
    if (!isRateLimitError(primaryError)) {
      throw primaryError
    }

    response = await ai.models.generateContent({
      model: fallbackModel,
      ...requestBody
    })
    usedModel = fallbackModel
  }

  return { response, usedModel }
}

async function generateStreamWithFallback({ ai, primaryModel, fallbackModel, requestBody }) {
  let stream
  let usedModel = primaryModel

  try {
    stream = await ai.models.generateContentStream({
      model: primaryModel,
      ...requestBody
    })
  } catch (primaryError) {
    if (!isRateLimitError(primaryError)) {
      throw primaryError
    }

    stream = await ai.models.generateContentStream({
      model: fallbackModel,
      ...requestBody
    })
    usedModel = fallbackModel
  }

  return { stream, usedModel }
}

// ---------------------------------------------------------------------------
// SSE writer
// ---------------------------------------------------------------------------

function writeSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`)
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

// ---------------------------------------------------------------------------
// Usage tracking
// ---------------------------------------------------------------------------

async function trackUsage(req, responseObj) {
  if (!req.userContext || req.userContext.isDev) return

  // Extract total token count from the response or stream completion
  let tokensUsed = 0
  if (responseObj?.usageMetadata?.totalTokenCount) {
    tokensUsed = responseObj.usageMetadata.totalTokenCount
  } else if (responseObj?.candidates?.[0]?.tokenCount) {
    tokensUsed = responseObj.candidates[0].tokenCount
  } else {
    // Fallback estimation (roughly 1 token per 4 chars) if metadata is missing
    const text = responseObj?.text || ''
    tokensUsed = Math.ceil(text.length / 4)
  }

  if (tokensUsed <= 0) return

  const { user, today, currentUsage, supabase } = req.userContext
  const newUsage = currentUsage + tokensUsed

  // Upsert the new usage into Supabase
  const { error } = await supabase
    .from('daily_token_usage')
    .upsert(
      { user_id: user.id, date: today, tokens_used: newUsage },
      { onConflict: 'user_id,date' }
    )

  if (error) {
    console.error('Failed to track token usage:', error)
  } else {
    req.userContext.currentUsage = newUsage
  }
}

// ---------------------------------------------------------------------------
// Vercel Serverless Function handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  // CORS headers – allow the frontend origin (update if you use a custom domain)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable.' })
    return
  }

  try {
    // 1. Verify User Session
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' })
      return
    }
    const token = authHeader.split(' ')[1]

    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ error: 'Missing Supabase environment variables on server.' })
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      res.status(401).json({ error: 'Unauthorized: Invalid token.' })
      return
    }

    const isDev = user.email === 'rhotonsia@gmail.com'
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const DAILY_LIMIT = 16000

    // 2. Check Daily Limit (skip for dev)
    let currentUsage = 0
    if (!isDev) {
      const { data: usageData, error: usageError } = await supabase
        .from('daily_token_usage')
        .select('tokens_used')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching usage:', usageError)
      } else if (usageData) {
        currentUsage = usageData.tokens_used
      }

      if (currentUsage >= DAILY_LIMIT) {
        res.status(403).json({ error: `Daily limit reached. You have used ${currentUsage}/${DAILY_LIMIT} tokens today.` })
        return
      }
    }

    // Attach user metadata to request for tracking after generation
    req.userContext = { user, isDev, today, currentUsage, supabase }

    // Vercel automatically parses JSON bodies – body is already an object.
    const body = req.body || {}

    const message = String(body.message || '').trim()
    const model = String(body.model || 'gemma-4-26b-a4b-it')
    const rawMode = body.mode
    const mode = typeof rawMode === 'string' ? rawMode.toLowerCase() : ''
    const circuitNetlist = String(body.circuitNetlist || '')
    const action = String(body.action || 'chat').toLowerCase()
    const iterationPhase = String(body.iterationPhase || 'initial').toLowerCase()
    const simulationOutput = String(body.simulationOutput || '')
    const previousNetlist = String(body.previousNetlist || '')
    const intentSummary = String(body.intentSummary || message)
    const messageHistory = sanitizeMessageHistory(body.messageHistory, message)
    const includeThinking = parseBoolean(body.includeThinking, true)
    const streamRequested = parseBoolean(body.stream, false)

    if (!message) {
      res.status(400).json({ error: 'Message is required.' })
      return
    }

    if (!ALLOWED_MODELS.has(model)) {
      res.status(400).json({ error: 'Unsupported model selection.' })
      return
    }

    const normalizedMode = ALLOWED_MODES.has(mode) ? mode : 'ask'
    if (mode && !ALLOWED_MODES.has(mode)) {
      res.status(400).json({ error: 'Unsupported assistant mode.' })
      return
    }

    const modeInstruction = getModeInstruction(normalizedMode, circuitNetlist)
    const ai = new GoogleGenAI({ apiKey })
    const primaryModel = model
    const fallbackModel = getAlternateModel(primaryModel)

    // -----------------------------------------------------------------------
    // action: design-build
    // -----------------------------------------------------------------------
    if (action === 'design-build') {
      if (normalizedMode !== 'agent') {
        res.status(400).json({ error: 'Design build action is only allowed in Agent mode.' })
        return
      }

      let designPrompt
      let retrieval = null
      let semanticProjection = null

      if (iterationPhase === 'retry') {
        designPrompt = buildPromptFromHistory(messageHistory, [
          'Iteration mode: do not use retrieval examples. Repair only based on latest output and latest error.',
          'Return only a valid custom SPICE netlist in plain text (no markdown fences).'
        ])
      } else {
        retrieval = retrieveClosestExamples(message, 2)
        const examplesBlock = getExamplesPromptBlock(retrieval.matches)

        semanticProjection = {
          queryAnchors: retrieval.queryEmbedding.anchorProjection,
          nearestExamples: retrieval.matches.map((match) => ({
            id: match.id,
            title: match.title,
            distance: Number(match.distance.toFixed(6)),
            anchors: match.anchorProjection
          }))
        }

        designPrompt = buildPromptFromHistory(messageHistory, [
          modeInstruction,
          'Semantic retrieval conceptual space (query vs examples):',
          JSON.stringify(semanticProjection, null, 2),
          'Use the nearest examples below as references. Keep their top comments.',
          examplesBlock,
          'Return only a valid custom SPICE netlist in plain text (no markdown fences).'
        ])
      }

      const requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: designPrompt }]
        }],
        config: buildGenerationConfig(includeThinking, primaryModel)
      }

      console.log('[AI DEBUG] Gemma input payload:', {
        action,
        iterationPhase,
        model: primaryModel,
        messageHistory,
        semanticProjection,
        nearestExampleTitles: retrieval ? retrieval.matches.map((m) => m.title) : []
      })

      if (streamRequested) {
        res.status(200)
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders?.()

        try {
          const { stream, usedModel } = await generateStreamWithFallback({
            ai, primaryModel, fallbackModel, requestBody
          })

          let fullThinking = ''
          let fullText = ''

          writeSseEvent(res, 'meta', { usedModel })

          for await (const chunk of stream) {
            const { thinkingText, answerText } = extractChunkTextParts(chunk)
            const thinkingAccumulation = accumulateChunkDelta(thinkingText, fullThinking)
            const answerAccumulation = accumulateChunkDelta(answerText, fullText)

            fullThinking = thinkingAccumulation.nextText
            fullText = answerAccumulation.nextText

            if (!thinkingAccumulation.delta && !answerAccumulation.delta) continue

            writeSseEvent(res, 'chunk', {
              thinkingDelta: thinkingAccumulation.delta,
              textDelta: answerAccumulation.delta
            })
          }

          const generatedNetlist = String(fullText || '').trim()

          await trackUsage(req, { text: fullText })

          writeSseEvent(res, 'complete', {
            text: generatedNetlist,
            generatedNetlist,
            thinking: fullThinking,
            usedModel,
            retrievedExamples: retrieval ? retrieval.matches.map((m) => ({
              id: m.id, title: m.title, distance: m.distance
            })) : [],
            semanticProjection
          })
        } catch (streamError) {
          writeSseEvent(res, 'error', {
            error: streamError?.message || 'Streaming design build failed.'
          })
        }

        res.end()
        return
      }

      const { response, usedModel } = await generateWithFallback({
        ai, primaryModel, fallbackModel, requestBody
      })

      const generatedNetlist = String(response.text || '').trim()
      const thinking = extractThinkingText(response)
      console.log('[AI DEBUG] Gemma output netlist:', generatedNetlist)

      await trackUsage(req, response)

      res.status(200).json({
        text: generatedNetlist,
        generatedNetlist,
        thinking,
        usedModel,
        retrievedExamples: retrieval ? retrieval.matches.map((m) => ({
          id: m.id, title: m.title, distance: m.distance
        })) : [],
        semanticProjection
      })
      return
    }

    // -----------------------------------------------------------------------
    // action: validate-intent
    // -----------------------------------------------------------------------
    if (action === 'validate-intent') {
      const validationPrompt = buildPromptFromHistory(messageHistory, [
        'You are validating whether a generated SPICE circuit matches intended behavior.',
        `Intended circuit request: ${intentSummary}`,
        'Generated netlist:',
        previousNetlist || circuitNetlist,
        'ngspice simulation output:',
        simulationOutput,
        'Return strict JSON only with keys: intended(boolean), confidence(number 0-1), reason(string), suggestedFix(string).'
      ])

      const requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: validationPrompt }]
        }],
        // Force no-thinking mode for validation to avoid leaking internal thoughts
        config: buildGenerationConfig(false, primaryModel)
      }

      console.log('[AI DEBUG] Validation input payload:', {
        action, model: primaryModel, messageHistory, intentSummary
      })

      if (streamRequested) {
        res.status(200)
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders?.()

        try {
          const { stream, usedModel } = await generateStreamWithFallback({
            ai, primaryModel, fallbackModel, requestBody
          })

          let fullThinking = ''
          let fullText = ''

          writeSseEvent(res, 'meta', { usedModel })

          for await (const chunk of stream) {
            const { answerText } = extractChunkTextParts(chunk)
            const answerAccumulation = accumulateChunkDelta(answerText, fullText)

            fullText = answerAccumulation.nextText

            if (!answerAccumulation.delta) continue

            writeSseEvent(res, 'chunk', {
              textDelta: answerAccumulation.delta
            })
          }

          const rawText = String(fullText || '').trim()
          const parsed = tryParseValidationJson(rawText)

          await trackUsage(req, { text: fullText })

          const validationPayload = parsed || {
            intended: false,
            confidence: 0.3,
            reason: rawText || 'Validation response was not JSON.',
            suggestedFix: 'Review node connections and component values, then regenerate once.'
          }

          const normalizedValidation = {
            intended: Boolean(validationPayload.intended),
            confidence: Number.isFinite(Number(validationPayload.confidence))
              ? Number(validationPayload.confidence)
              : 0.3,
            reason: String(validationPayload.reason || ''),
            suggestedFix: String(validationPayload.suggestedFix || '')
          }

          writeSseEvent(res, 'complete', {
            text: rawText,
            usedModel,
            validation: normalizedValidation
          })
        } catch (streamError) {
          writeSseEvent(res, 'error', {
            error: streamError?.message || 'Streaming validation failed.'
          })
        }

        res.end()
        return
      }

      const { response, usedModel } = await generateWithFallback({
        ai, primaryModel, fallbackModel, requestBody
      })

      const rawText = String(response.text || '').trim()
      console.log('[AI DEBUG] Validation model output:', rawText)

      await trackUsage(req, response)

      const parsed = tryParseValidationJson(rawText)

      const validationPayload = parsed || {
        intended: false,
        confidence: 0.3,
        reason: rawText || 'Validation response was not JSON.',
        suggestedFix: 'Review node connections and component values, then regenerate once.'
      }

      const normalizedValidation = {
        intended: Boolean(validationPayload.intended),
        confidence: Number.isFinite(Number(validationPayload.confidence))
          ? Number(validationPayload.confidence)
          : 0.3,
        reason: String(validationPayload.reason || ''),
        suggestedFix: String(validationPayload.suggestedFix || '')
      }

      res.status(200).json({
        text: rawText,
        usedModel,
        validation: normalizedValidation
      })
      return
    }

    // -----------------------------------------------------------------------
    // action: chat (streaming)
    // -----------------------------------------------------------------------
    if (action === 'chat' && streamRequested) {
      const finalPrompt = buildPromptFromHistory(messageHistory, [
        modeInstruction,
        `User request:\n${message}`
      ])

      const requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: finalPrompt }]
        }],
        config: buildGenerationConfig(includeThinking, primaryModel)
      }

      console.log('[AI DEBUG] Chat stream input payload:', {
        action, streamRequested, model: primaryModel, messageHistory
      })

      res.status(200)
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders?.()

      try {
        const { stream, usedModel } = await generateStreamWithFallback({
          ai, primaryModel, fallbackModel, requestBody
        })

        let fullThinking = ''
        let fullText = ''

        writeSseEvent(res, 'meta', { usedModel })

        for await (const chunk of stream) {
          const { thinkingText, answerText } = extractChunkTextParts(chunk)
          const thinkingAccumulation = accumulateChunkDelta(thinkingText, fullThinking)
          const answerAccumulation = accumulateChunkDelta(answerText, fullText)

          fullThinking = thinkingAccumulation.nextText
          fullText = answerAccumulation.nextText

          if (!thinkingAccumulation.delta && !answerAccumulation.delta) continue

          writeSseEvent(res, 'chunk', {
            thinkingDelta: thinkingAccumulation.delta,
            textDelta: answerAccumulation.delta
          })
        }

        await trackUsage(req, { text: fullText })

        writeSseEvent(res, 'complete', {
          text: fullText,
          thinking: fullThinking,
          usedModel
        })
      } catch (streamError) {
        writeSseEvent(res, 'error', {
          error: streamError?.message || 'Streaming chat failed.'
        })
      }

      res.end()
      return
    }

    // -----------------------------------------------------------------------
    // action: chat (non-streaming)
    // -----------------------------------------------------------------------
    const finalPrompt = buildPromptFromHistory(messageHistory, [
      modeInstruction,
      `User request:\n${message}`
    ])

    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: finalPrompt }]
      }],
      config: buildGenerationConfig(includeThinking, primaryModel)
    }

    console.log('[AI DEBUG] Chat input payload:', {
      action, model: primaryModel, messageHistory
    })

    const { response, usedModel } = await generateWithFallback({
      ai, primaryModel, fallbackModel, requestBody
    })

    const thinking = extractThinkingText(response)
    console.log('[AI DEBUG] Chat output:', String(response.text || ''))

    await trackUsage(req, response)

    res.status(200).json({ text: response.text || '', thinking, usedModel })
  } catch (error) {
    res.status(500).json({ error: error.message || 'AI request failed.' })
  }
}
