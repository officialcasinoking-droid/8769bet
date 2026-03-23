import { motion } from 'framer-motion'

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`rounded-lg bg-gray-200 dark:bg-dark-200 animate-pulse ${className}`}
      {...props}
    />
  )
}

export function GameCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-dark-300">
      <Skeleton className="aspect-square" />
      <div className="p-2 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2 w-1/2" />
        <Skeleton className="h-6 w-full" />
      </div>
    </div>
  )
}

export function GameGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function JackpotSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-200">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center p-2 rounded-lg bg-gray-100">
            <Skeleton className="h-2 w-12 mx-auto mb-1" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CategorySkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="flex-shrink-0 w-16 h-16 rounded-xl" />
      ))}
    </div>
  )
}

export function BannerSkeleton() {
  return (
    <div className="mx-4 mt-4">
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-16" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  )
}
