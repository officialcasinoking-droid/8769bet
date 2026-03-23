export default function Features() {
  const features = [
    {
      icon: '🧠',
      title: 'AI Crash Prediction',
      description: 'Advanced ML analyzes provably-fair data to forecast crash points with 87% accuracy.',
      link: '/agent/predictions',
      color: 'primary'
    },
    {
      icon: '🤖',
      title: 'Smart Auto-Cashout',
      description: 'Set intelligent cashout thresholds based on risk tolerance and historical patterns.',
      link: '/agent/auto',
      color: 'accent-blue'
    },
    {
      icon: '📊',
      title: 'Live Multiplier Insights',
      description: 'Real-time analytics dashboard showing AI suggestions and betting patterns.',
      link: '/play/aviator',
      color: 'accent-purple'
    },
    {
      icon: '✅',
      title: 'Provably Fair Verifier',
      description: 'Instantly verify game fairness using blockchain hashes and client seeds.',
      link: '/provably-fair',
      color: 'primary'
    },
    {
      icon: '💸',
      title: 'Referral Bonus AI',
      description: 'Optimize referral rewards with AI-powered incentive structures.',
      link: '/referrals',
      color: 'secondary'
    },
    {
      icon: '📱',
      title: 'Mobile-First Agent',
      description: 'Native-like performance with offline capabilities and push notifications.',
      link: '/mobile',
      color: 'primary'
    }
  ];

  return (
    <div className="py-16 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-orbitron text-center text-primary mb-12">
          How AI Agent Enhances Your Game
        </h2>
        
        {/* Desktop: 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 hover:border-primary/50 transition-colors transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-10 h-10 flex items-center justify-center bg-${feature.color}/20 rounded-lg`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-medium text-white">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              </div>
              <a 
                href={feature.link} 
                className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
              >
                Learn More →
                <span className="ml-1">→</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
