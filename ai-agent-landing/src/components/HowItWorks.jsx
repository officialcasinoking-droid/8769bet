export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Place Your Bet',
      description: 'Select your stake and launch the game as usual.',
      icon: '🎮',
      link: '/play/aviator'
    },
    {
      number: '02',
      title: 'AI Analyzes',
      description: 'Our agent processes live data to predict optimal cashout points.',
      icon: '🧠',
      link: '/agent-demo'
    },
    {
      number: '03',
      title: 'Cash Out Smartly',
      description: 'Follow AI suggestions or set auto-cashout for consistent profits.',
      icon: '💰',
      link: '/play/aviator'
    }
  ];

  return (
    <div className="py-16 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-orbitron text-center text-primary mb-12">
          How AI Agent Works
        </h2>
        
        {/* Timeline */}
        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-0.5 bg-primary/20"></div>
          
          {steps.map((step, index) => (
            <div 
              key={step.number} 
              className="relative"
            >
              {/* Step Circle */}
              <div className={`w-12 h-12 flex items-center justify-center bg-primary/20 rounded-full mb-4 ${
                index === 0 ? 'mt-0' : index === steps.length - 1 ? 'mb-0' : ''
              }`}>
                <span className="text-primary font-bold">{step.number}</span>
              </div>
              
              {/* Step Content */}
              <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="text-2xl">{step.icon}</div>
                  <div>
                    <h3 className="font-medium text-white">{step.title}</h3>
                    <p className="text-sm text-gray-400">{step.description}</p>
                  </div>
                </div>
                <a 
                  href={step.link} 
                  className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
                >
                  Learn More →
                  <span className="ml-1">→</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
