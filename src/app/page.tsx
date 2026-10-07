import WalletConnect from "../components/WalletConnect";
export default function Home() {
  return (
    <main className="min-h-screen p-24 bg-gray-900 text-white flex flex-col items-center">
      <h1 className="text-5xl font-bold mb-8">QuizFlow Web3</h1>
      <WalletConnect />
    </main>
  )
}
