import { useState, useEffect } from 'react';

export default function LiveDemo() {
  const [multiplier, setMultiplier] = useState(1.00);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isFlying, setIsFlying] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [profit, setProfit] = useState(0);

  // Simulate the game
  useEffect(() => {
    if (isFlying && !cashedOut) {
      const interval = setInterval(() => {
        setMultiplier(prev => {
          const newValue = prev + 0.01;
          // Simulate crash between 1.5x and 5x
          const crashPoint = 1.5 + Math.random() * 3.5;
          if (newValue >= crashPoint) {
            setIsFlying(false);
            if (!cashedOut) {
              // User didn't cash out in time
              setCashedOut(true);
              setProfit(-10); // Lost stake
            }
            return 0; // Crash
          }
          return Number(newValue.toFixed(2));
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isFlying, cashedOut]);

  // Generate AI suggestion randomly for demo
  useEffect(() => {
    if (isFlying) {
      const suggestInterval = setInterval(() => {
        // Suggest cashing out between 1.8x and 3.5x
        const suggestion = (1.8 + Math.random() * 1.7).toFixed(2);
        setAiSuggestion(suggestion);
      }, 2000);
      return () => clearInterval(suggestInterval);
    }
  }, [isFlying]);

  const startGame = () => {
    setMultiplier(1.00);
    setAiSuggestion(null);
    setIsFlying(true);
    setCashedOut(false);
    setProfit(0);
  };

  const cashOut = () => {
    if (isFlying && !cashedOut) {
      setIsFlying(false);
      setCashedOut(true);
      // Profit = stake * (multiplier - 1)
      setProfit((multiplier - 1) * 10); // Assuming stake of 10
    }
  };

  return (
    <div className="py-16 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-orbitron text-center text-primary mb-12">
          Live AI Agent Demo
        </h2>
        
        {/* Demo Controls */}
        <div className="mb-8 text-center">
          {!isFlying && !cashedOut ? (
            <button 
              onClick={startGame}
              className="px-6 py-3 bg-primary text-black font-semibold rounded hover:bg-primary/90 transition-colors transform hover:scale-105"
            >
              Start Demo
            </button>
          ) : (
            <button 
              onClick={cashedOut ? startGame : cashOut}
              className="px-6 py-3 bg-gray-800/50 text-gray-300 font-semibold rounded hover:bg-gray-800/70 hover:text-white transition-colors transform hover:scale-105"
            >
              {cashedOut ? 'Play Again' : 'Cash Out'}
            </button>
          )}
        </div>
        
        {/* Game Display */}
        <div className="relative aspect-w-16 aspect-h-9 bg-gray-800/50 rounded-lg overflow-hidden mb-8">
          {/* Background - dark */}
          <div className="absolute inset-0 bg-gray-900/50"></div>
          
          {/* Plane */}
          <div 
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${
              isFlying ? 'animate-fly-in' : ''
            }`}
            style={{ bottom: isFlying ? '20%' : '-20%' }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-1 bg-white rotate-45"></div>
              <div className="w-10 h-0.5 bg-white"></div>
              <div className="w-4 h-1 bg-white -rotate-45"></div>
            </div>
          </div>
          
          {/* Multiplier Overlay */}
          <div className="absolute bottom-4 left-4 text-2xl font-orbitron text-primary">
            {multiplier.toFixed(2)}x
          </div>
          
          {/* AI Suggestion */}
          {aiSuggestion && !cashedOut && (
            <div className="absolute top-4 right-4 bg-primary/20 text-primary px-3 py-1 rounded text-sm font-medium">
              AI Suggestion: Cash out at {aiSuggestion}x
            </div>
          )}
          
          {/* Crash Effect */}
          {!isFlying && cashedOut && multiplier === 0 && (
            <div className="absolute inset-0 bg-red-500/30 animate-pulse"></div>
          )}
        </div>
        
        {/* Results */}
        {cashedOut && (
          <div className="bg-gray-800/50 p-6 rounded-lg text-center">
            {profit > 0 ? (
              <>
                <h3 className="text-green-400 font-medium mb-2">You Won!</h3>
                <p className="text-lg font-bold text-primary">Profit: {profit.toFixed(2)} &#8377;</p>
                <p className="text-sm text-gray-400">Cashed out at {multiplier.toFixed(2)}x</p>
              </>
            ) : (
              <>
                <h3 className="text-red-400 font-medium mb-2">You Lost!</h3>
                <p className="text-lg font-bold text-red-400">Loss: {Math.abs(profit).toFixed(2)} &#8377;</p>
                <p className="text-sm text-gray-400">Crashed at {multiplier.toFixed(2)}x</p>
              </>
            )}
          </div>
        )}
        
        {/* Demo Info */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>This demo simulates how the AI Agent provides real-time suggestions during gameplay.</p>
          <p className="mt-2">In the actual platform, the AI analyzes provably-fair data to optimize cashout decisions.</p>
        </div>
      </div>
    </div>
  );
}
