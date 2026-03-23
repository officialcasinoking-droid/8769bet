import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const games = [
  { 
    id: 'aviator', 
    name: 'Aviator', 
    provider: 'Spribe', 
    multiplier: '50x', 
    slug: 'aviator', 
    emoji: '✈️',
    image: '/images/aviator logo.jpg',
    gradient: 'from-emerald-600 to-teal-600',
    playable: true,
    featured: true
  },
  { 
    id: 'fortune-gems', 
    name: 'Fortune Gems 3', 
    provider: 'JILI', 
    multiplier: '5,000x', 
    emoji: '💎',
    gradient: 'from-purple-600 to-pink-600',
    playable: false
  },
  { 
    id: 'money-coming', 
    name: 'Money Coming', 
    provider: 'JILI', 
    multiplier: '10,000x', 
    emoji: '💰',
    gradient: 'from-yellow-600 to-orange-600',
    playable: false
  },
  { 
    id: 'crazy777', 
    name: 'Crazy777', 
    provider: 'WG', 
    multiplier: '7,777x', 
    emoji: '🎰',
    gradient: 'from-red-600 to-rose-600',
    playable: false
  },
  { 
    id: 'jetx', 
    name: 'JetX', 
    provider: 'SmartSoft', 
    multiplier: '10,000x', 
    emoji: '🚀',
    gradient: 'from-blue-600 to-cyan-600',
    playable: false
  },
  { 
    id: 'lucky-jet', 
    name: 'Lucky Jet', 
    provider: '3 Oaks', 
    multiplier: '10,000x', 
    emoji: '🍀',
    gradient: 'from-green-600 to-emerald-600',
    playable: false
  },
]

function GameCard({ game, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link 
        to={game.playable ? `/play/${game.slug}` : '#'}
        className={`block relative overflow-hidden rounded-2xl bg-gradient-to-br ${game.gradient} p-4 group transition-transform hover:scale-[1.02] ${!game.playable ? 'cursor-not-allowed opacity-80' : ''}`}
        onClick={(e) => {
          if (!game.playable) {
            e.preventDefault()
          }
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Game Content */}
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            {game.image ? (
              <img src={game.image} alt={game.name} className="w-16 h-16 object-contain rounded-lg" />
            ) : (
              <span className="text-4xl">{game.emoji}</span>
            )}
            {game.playable ? (
              <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-yellow-900 rounded-full animate-pulse" />
                PLAY
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-white/20 text-white/80 text-[10px] font-bold rounded">
                SOON
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-bold text-white mb-1">{game.name}</h3>
          <p className="text-white/70 text-xs mb-3">{game.provider}</p>
          
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-yellow-400">{game.multiplier}</span>
            <div className="flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg text-white text-xs font-medium group-hover:bg-white/30 transition-colors">
              {game.playable ? (
                <>
                  <span>Play</span>
                  <span>→</span>
                </>
              ) : (
                <>
                  <span>Coming</span>
                  <span>Soon</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function GamesPage() {
  const featuredGame = games.find(g => g.featured)
  const otherGames = games.filter(g => !g.featured)

  return (
    <div className="pt-20 pb-12">
      <div className="bg-gradient-to-b from-primary-500/10 to-transparent py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-display font-bold text-center mb-2">
            Our <span className="gradient-text">Games</span>
          </h1>
          <p className="text-gray-400 text-center text-sm">Choose a game and start winning!</p>
        </div>
      </div>
      
      {/* Featured Game - Aviator */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Link 
          to="/play/aviator" 
          className="block relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 group"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE4IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-4xl">✈️</span>
                <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-yellow-900 rounded-full animate-pulse" />
                  LIVE
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Aviator</h2>
              <p className="text-emerald-100 text-sm mb-3">Crash Game • Up to 50x multipliers</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-white font-semibold group-hover:bg-white/30 transition-colors">
                <span>Play Now</span>
                <span>→</span>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-emerald-100 text-xs mb-1">Recent Crash</p>
              <p className="text-3xl font-bold text-yellow-400">2.45x</p>
            </div>
          </div>
        </Link>
      </div>
      
      {/* All Games Grid */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h2 className="text-xl font-bold text-white mb-4">All Games</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {otherGames.map((game, index) => (
            <GameCard key={game.id} game={game} index={index} />
          ))}
        </div>
      </div>
      
      {/* Popular Slots Section */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h2 className="text-xl font-bold text-white mb-4">Popular Slots</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform border border-slate-700 hover:border-emerald-500/50"
            >
              <span className="text-3xl">🎰</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
