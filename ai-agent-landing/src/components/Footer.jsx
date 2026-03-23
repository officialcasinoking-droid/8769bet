import { Link } from 'react-router-dom';

export default function Footer() {
  const footerLinks = [
    { title: 'About', links: [
      { name: 'About Us', path: '/about' },
      { name: 'How It Works', path: '/how-it-works' },
      { name: 'AI Agent Docs', path: '/docs/agent' },
      { name: 'Provably Fair', path: '/provably-fair' }
    ] },
    { title: 'Games', links: [
      { name: 'Aviator', path: '/play/aviator' },
      { name: 'JetX', path: '/play/jetx' },
      { name: 'Lucky Jet', path: '/play/lucky-jet' },
      { name: 'All Games', path: '/games' }
    ] },
    { title: 'Community', links: [
      { name: 'Forum', path: '/community' },
      { name: 'Blog', path: '/blog' },
      { name: 'News', path: '/news' },
      { name: 'Events', path: '/events' }
    ] },
    { title: 'Legal', links: [
      { name: 'Terms of Service', path: '/terms' },
      { name: 'Privacy Policy', path: '/privacy' },
      { name: 'Responsible Gaming', path: '/responsible-gaming' },
      { name: 'Affiliates', path: '/affiliates' }
    ] }
  ];

  return (
    <div className="bg-black border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-12">
          {footerLinks.map((column) => (
            <div key={column.title}>
              <h3 className="text-lg font-medium text-primary mb-4">
                {column.title}
              </h3>
              <ul className="space-y-2 text-sm">
                {column.links.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Bottom Section */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-center gap-4">
            {/* Social Icons */}
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <span aria-label="Twitter">🐦</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <span aria-label="Telegram">✈️</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <span aria-label="Discord">🎮</span>
              </a>
            </div>
            
            {/* Legal & Copyright */}
            <div className="text-xs text-gray-500">
              <p className="sm:text-right">
                © 2026 AI Agent Platform. All rights reserved.
              </p>
              <p className="sm:text-right">
                <a href="/cookies" className="text-gray-400 hover:text-primary">Cookie Settings</a>
                |
                <a href="/privacy" className="text-gray-400 hover:text-primary">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
