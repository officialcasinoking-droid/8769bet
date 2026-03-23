export default function PromoBanner() {
  return (
    <div className="bg-gradient-to-r from-green-500 to-emerald-600 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex flex-col items-center space-x-4 text-sm font-medium text-black">
          <div className="flex items-center space-x-2">
            {/* Handshake emoji */}
            <span>🤝</span>
            <span>Invite A Friend and Get Rs 500</span>
            {/* Gold coins */}
            <span>💰</span>
          </div>
          <div className="flex items-center space-x-3">
            {/* Speaker icon with badge */}
            <div className="relative">
              <span>🔊</span>
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center bg-red-500 text-xs font-medium rounded-full">
                3
              </span>
            </div>
            <span className="text-xs">Bonus for VIP members has been distributed and collected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
