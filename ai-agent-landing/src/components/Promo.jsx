export default function Promo() {
  const promos = [
    {
      title: 'First Deposit Bonus',
      description: 'Get 100% bonus on your first deposit up to Rs 5,000.',
      icon: '🎁',
      link: '/register'
    },
    {
      title: 'AI Referral Rain',
      description: 'Earn extra rewards when your referrals use AI Agent.',
      icon: '💸',
      link: '/referrals'
    },
    {
      title: 'Leaderboard Prizes',
      description: 'Compete for daily prizes up to Rs 50,000.',
      icon: '🏆',
      link: '/leaderboard'
    }
  ];

  return (
    <div className="py-16 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-orbitron text-center text-primary mb-12">
          Special Promotions
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {promos.map((promo, index) => (
            <div 
              key={index} 
              className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 hover:border-primary/50 transition-colors transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center bg-primary/20 rounded-full">
                  {promo.icon}
                </div>
              </div>
              <h3 className="font-medium text-white text-center">{promo.title}</h3>
              <p className="text-sm text-gray-400 text-center">{promo.description}</p>
              <a 
                href={promo.link} 
                className="mt-4 block w-full text-center px-3 py-2 bg-primary text-black font-semibold rounded hover:bg-primary/90 transition-colors"
              >
                Claim Now
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
