"use client"
import { useState } from "react"
import { ethers } from "ethers"

export default function WalletConnect() {
  const [account, setAccount] = useState<string>("")
  
  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum)
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        setAccount(address)
      } catch (error) {
        console.error("Wallet connection failed:", error)
        alert("Failed to connect wallet. See console for details.")
      }
    } else {
      alert("No Web3 wallet detected! Please install the MetaMask extension in your browser.")
    }
  }

  const simulateWallet = () => {
    setAccount("0xTestWallet" + Math.floor(Math.random() * 1000000000).toString())
  }
  
  return (
    <div className="flex flex-col items-center gap-6">
      {!account ? (
        <div className="flex flex-col gap-4">
          <button onClick={connectWallet} className="px-6 py-3 bg-blue-600 rounded-lg text-xl font-semibold hover:bg-blue-700 transition cursor-pointer w-full">
            Connect Web3 Wallet
          </button>
          <div className="text-gray-400 text-center text-sm">OR</div>
          <button onClick={simulateWallet} className="px-6 py-3 bg-gray-600 rounded-lg text-xl font-semibold hover:bg-gray-700 transition cursor-pointer w-full">
            Simulate Login (Test Mode)
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-green-400 font-mono mb-4 bg-gray-800 p-2 rounded inline-block">{account}</p>
          <QuizInterface walletAddress={account} />
        </div>
      )}
    </div>
  )
}

function QuizInterface({ walletAddress }: { walletAddress: string }) {
  const [topic, setTopic] = useState("")
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  
  const generateQuiz = async () => {
    if (!topic) return alert("Please enter a topic!")
    setLoading(true)
    setQuiz(null)
    setSubmitted(false)
    setSelectedAnswers({})
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, walletAddress })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setQuiz(data.quiz)
    } catch (err: any) {
      console.error(err)
      alert("Error generating quiz: " + err.message)
    }
    setLoading(false)
  }

  const handleSelect = (qIndex: number, optIndex: number) => {
    if (submitted) return;
    setSelectedAnswers({ ...selectedAnswers, [qIndex]: optIndex })
  }

  const calculateScore = () => {
    let score = 0;
    quiz.questions.forEach((q: any, i: number) => {
      if (selectedAnswers[i] === q.correctAnswerIndex) score++;
    })
    return score;
  }
  
  return (
    <div className="mt-8 bg-gray-800 p-8 rounded-xl w-full max-w-2xl border border-gray-700 mx-auto">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter quiz topic (e.g., React, History)..."
        className="w-full p-4 mb-4 bg-gray-900 border border-gray-700 rounded text-white"
      />
      <button onClick={generateQuiz} disabled={loading} className="w-full px-6 py-3 bg-purple-600 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 cursor-pointer">
        {loading ? "Generating via Groq AI..." : "Generate AI Quiz & Earn Tokens"}
      </button>

      {quiz && quiz.questions && (
        <div className="mt-8 text-left bg-gray-900 p-6 rounded-lg border border-gray-700">
          <h3 className="text-3xl font-bold mb-6 text-purple-400">{quiz.title}</h3>
          
          {quiz.questions.map((q: any, qIndex: number) => (
            <div key={qIndex} className="mb-8 p-6 bg-gray-800 rounded-lg shadow-md">
              <p className="text-xl font-semibold mb-4">{qIndex + 1}. {q.question}</p>
              
              <div className="flex flex-col gap-3">
                {q.options.map((opt: string, optIndex: number) => {
                  const isSelected = selectedAnswers[qIndex] === optIndex;
                  const isCorrect = submitted && q.correctAnswerIndex === optIndex;
                  const isWrongSelection = submitted && isSelected && !isCorrect;
                  
                  let btnClass = "text-left p-4 rounded-lg border-2 transition-all cursor-pointer text-lg font-medium ";
                  
                  if (submitted) {
                    if (isCorrect) btnClass += "bg-green-600 border-green-500 text-white";
                    else if (isWrongSelection) btnClass += "bg-red-600 border-red-500 text-white";
                    else btnClass += "bg-gray-700 border-gray-600 text-gray-500 opacity-50";
                  } else {
                    btnClass += isSelected 
                      ? "bg-purple-600 border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.5)]" 
                      : "bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500";
                  }

                  return (
                    <button 
                      key={optIndex} 
                      onClick={() => handleSelect(qIndex, optIndex)}
                      className={btnClass}
                      disabled={submitted}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              
              {submitted && (
                <div className="mt-6 p-4 bg-blue-900/40 border border-blue-700 rounded-lg text-blue-100">
                  <strong className="text-blue-300 block mb-1">Explanation:</strong> 
                  {q.explanation}
                </div>
              )}
            </div>
          ))}

          {!submitted ? (
            <button 
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(selectedAnswers).length < quiz.questions.length}
              className="w-full mt-4 px-6 py-4 bg-green-600 rounded-lg font-bold text-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Submit Answers & See Results
            </button>
          ) : (
            <div className="mt-8 text-center p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-3xl font-bold text-white mb-2">
                Your Score: {calculateScore()} / {quiz.questions.length}
              </h4>
              <p className="text-xl text-yellow-400 font-bold">You earned {calculateScore() * 10} 🪙 Tokens!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
