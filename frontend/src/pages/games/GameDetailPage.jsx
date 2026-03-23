import { Link, useParams } from 'react-router-dom'

export default function GameDetailPage() {
  const { slug } = useParams()
  return (
    <div className="pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link to="/games" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6">
          ← Back to Games
        </Link>
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-display font-bold mb-4 gradient-text">Game Preview</h1>
          <p className="text-gray-400 mb-6">Game ID: {slug}</p>
          <Link to="/deposit" className="btn-primary px-8 py-3">
            Play Now
          </Link>
        </div>
      </div>
    </div>
  )
}
