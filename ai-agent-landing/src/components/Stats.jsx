export default function Stats() {
  const stats = [
    { value: '97%', label: 'RTP', description: 'Return to Player' },
    { value: '12,456', label: 'Active Users', description: 'Currently playing' },
    { value: '24/7', label: 'AI Agent', description: 'Always analyzing' },
    { value: '₨704M', label: 'Jackpot', description: 'Cumulative prize pool' }
  ];

  return (
    <div className="py-16 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-orbitron text-center text-primary mb-12">
          Platform Statistics
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 text-center"
            >
              <div className="flex items-center justify-center mb-3">
                <div className="w-8 h-8 flex items-center justify-center bg-primary/20 rounded-full">
                  <span className="text-primary">{stat.value}</span>
                </div>
              </div>
              <h3 className="font-medium text-white">{stat.label}</h3>
              <p className="text-sm text-gray-400">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
