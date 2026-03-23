import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FireIcon, StarIcon, HeartIcon, PlayIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function GameCard({ game, index = 0, compact = false }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  
  const gameEmoji = game.cat === 'crash' ? '🚀' : game.cat === 'slots' ? '💎' : '🎰'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative overflow-hidden rounded-xl bg-white dark:bg-dark-300 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
    >
      {/* Image/Placeholder */}
      <div className={`relative overflow-hidden ${compact ? 'aspect-[4/3]' : 'aspect-square'}`}>
        {game.image ? (
          <img
            src={game.image}
            alt={game.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${isHovered ? 'scale-110' : ''} transition-transform duration-500`}>
            <span className="text-5xl md:text-6xl">{gameEmoji}</span>
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button overlay */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary-500/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <PlayIcon className="w-8 h-8 text-white" />
          </div>
        </motion.div>
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {game.hot && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-[10px] font-bold text-white shadow-md"
            >
              <FireIcon className="w-3 h-3" />
              HOT
            </motion.div>
          )}
          {game.ai && (
            <div className="px-2 py-0.5 rounded-full bg-primary-500 text-[10px] font-bold text-white shadow-md">
              🤖 AI
            </div>
          )}
        </div>
        
        {/* Favorite button */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => { e.preventDefault(); setIsFavorite(!isFavorite) }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
        >
          <HeartIcon className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </motion.button>
        
        {/* Multiplier */}
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
          <span className="text-xs font-mono font-bold text-primary-400">{game.multiplier}</span>
        </div>
      </div>
      
      {/* Info */}
      <div className={`p-2 ${compact ? '' : 'sm:p-3'}`}>
        <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${compact ? 'text-xs' : 'text-sm'}`}>
          {game.name}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>{game.provider}</span>
          <div className="flex items-center gap-1">
            <span className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>{game.rtp}</span>
          </div>
        </div>
        
        {!compact && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-500">{game.players} playing</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-[10px] font-bold text-white shadow-md"
            >
              PLAY
            </motion.button>
          </div>
        )}
      </div>
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/10 to-transparent" />
      </div>
    </motion.div>
  )
}

export function GameCardCompact({ game, index = 0 }) {
  return <GameCard game={game} index={index} compact={true} />
}
