import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { GoogleGenAI } from '@google/genai'

const ALLOWED_MODELS = new Set([
  'gemma-4-26b-a4b-it',
  'gemma-4-31b-it'
])

const ALLOWED_MODES = new Set(['design', 'explain', 'suggest'])

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
  const netlistBlock = String(circuitNetlist || '').trim()
  const fallbackNetlist = '* Simple Circuit Simulation\n.OP\n.TRAN 1m 100m\n.END'
  const referenceNetlist = netlistBlock || fallbackNetlist

  if (!mode) {
    return 'You are an AI Electrical Engineer and is tasked to help user understand their electronic circuits and build on top of it. You have three main modes: Design, explain and suggest which you will suggest the user to choose one of them if the conversation goes deep into circuits.'
  }

  if (mode === 'design') {
    return [
      'You are an expert circuit designer.',
      'Return ONLY a SPICE netlist as plain text. No markdown fences. No explanations.',
      'The netlist must follow the same structure/order as this reference and preserve this style:',
      referenceNetlist,
      'Required structure:',
      '1) First line title, typically "* Simple Circuit Simulation".',
      '2) Optional .MODEL/.SUBCKT section if needed.',
      '3) Component lines.',
      '4) .OP line.',
      '5) .TRAN line.',
      '6) Optional .PRINT TRAN line.',
      '7) .END as final line.'
    ].join('\n\n')
  }

  if (mode === 'suggest') {
    return [
      'You are a circuit optimization assistant.',
      'Use the provided current netlist to suggest concrete improvements based on the user question.',
      'Prioritize practical fixes: stability, component values, topology, and simulation directives.',
      'Current circuit netlist:',
      referenceNetlist
    ].join('\n\n')
  }

  return [
    'You are a circuit explanation assistant.',
    'Read and interpret the user current circuit netlist, then answer the user question clearly.',
    'Reference the actual circuit behavior and nodes/components in your answer.',
    'Current circuit netlist:',
    referenceNetlist
  ].join('\n\n')
}

function aiAssistantPlugin(geminiApiKey) {
  return {
    name: 'ai-assistant-api',
    configureServer(server) {
      server.middlewares.use('/api/ai-chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        const apiKey = geminiApiKey || process.env.GEMINI_API_KEY
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing GEMINI_API_KEY. Add it to .env.local or your shell environment.' }))
          return
        }

        try {
          const body = await new Promise((resolve, reject) => {
            let raw = ''
            req.on('data', (chunk) => {
              raw += chunk
            })
            req.on('end', () => {
              try {
                resolve(JSON.parse(raw || '{}'))
              } catch (parseError) {
                reject(parseError)
              }
            })
            req.on('error', reject)
          })

          const message = String(body.message || '').trim()
          const model = String(body.model || 'gemma-4-26b-a4b-it')
          const rawMode = body.mode
          const mode = typeof rawMode === 'string' ? rawMode.toLowerCase() : ''
          const circuitNetlist = String(body.circuitNetlist || '')

          if (!message) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Message is required.' }))
            return
          }

          if (!ALLOWED_MODELS.has(model)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Unsupported model selection.' }))
            return
          }

          const normalizedMode = ALLOWED_MODES.has(mode) ? mode : ''
          if (mode && !ALLOWED_MODES.has(mode)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Unsupported assistant mode.' }))
            return
          }

          const modeInstruction = getModeInstruction(normalizedMode, circuitNetlist)
          const finalPrompt = `${modeInstruction}\n\nUser request:\n${message}`

          const ai = new GoogleGenAI({ apiKey })
          const primaryModel = model
          const fallbackModel = getAlternateModel(primaryModel)

          const requestBody = {
            contents: [{
              role: 'user',
              parts: [{ text: finalPrompt }]
            }],
            config: {
              tools: [{ googleSearch: {} }]
            }
          }

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

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ text: response.text || '', usedModel }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message || 'AI request failed.' }))
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), aiAssistantPlugin(env.GEMINI_API_KEY)],
    base: '/CirSimai/'
  }
})
