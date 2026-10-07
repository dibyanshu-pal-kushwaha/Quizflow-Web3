import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_key" })

async function getLiveChatModels(): Promise<string[]> {
  const response = await groq.models.list()
  const BAD_KEYWORDS = ["whisper", "audio", "speech", "tts", "stt", "vision", "guard"]
  return response.data
    .map((m: any) => m.id)
    .filter((id: string) => !BAD_KEYWORDS.some(kw => id.toLowerCase().includes(kw)))
}

export async function POST(req: Request) {
  try {
    const { topic, walletAddress } = await req.json()

    const prompt = `Generate a 3-question multiple choice quiz about ${topic}. 
Respond ONLY with a raw JSON object. No markdown, no code blocks, no extra text.
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswerIndex": 0,
      "explanation": "Short explanation of why this is correct."
    }
  ]
}`

    const liveModels = await getLiveChatModels()
    console.log("Available models on your account:", liveModels)

    let text = ""
    let usedModel = ""

    for (const model of liveModels) {
      try {
        console.log(`Trying: ${model}`)
        const result = await groq.chat.completions.create({
          messages: [
            { role: "system", content: "You are a JSON-only API. Never use markdown." },
            { role: "user", content: prompt }
          ],
          model,
          temperature: 0.1,
          max_tokens: 1024,
        })
        text = result.choices[0]?.message?.content || "{}"
        usedModel = model
        console.log(`Success with: ${model}`)
        break
      } catch (err: any) {
        const code = err?.error?.error?.code || ""
        console.warn(`Skipping ${model}: ${code || err?.status}`)
        continue
      }
    }

    if (!usedModel) {
      return NextResponse.json({
        error: `No working model found. Models checked: ${liveModels.join(", ")}. Please check your Groq account at console.groq.com.`
      }, { status: 500 })
    }

    if (text.includes("```")) text = text.replace(/```json|```/g, "").trim()

    let quizData
    try {
      quizData = JSON.parse(text)
    } catch (e) {
      console.log("JSON parse failed:", text)
      throw new Error("The AI returned an invalid format. Please try again.")
    }

    let user = await prisma.user.findUnique({ where: { walletAddress } })
    if (!user) {
      user = await prisma.user.create({ data: { walletAddress } })
    }

    const quizRecord = await prisma.quiz.create({
      data: { topic, difficulty: "medium", userId: user.id }
    })

    return NextResponse.json({ quiz: quizData, record: quizRecord, model: usedModel })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || "Failed to generate quiz." }, { status: 500 })
  }
}
