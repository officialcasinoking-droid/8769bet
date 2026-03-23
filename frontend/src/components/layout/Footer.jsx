import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  GithubIcon,
  TwitterIcon,
  DiscordIcon,
  TelegramIcon,
  YoutubeIcon
} from './Icons'

const footerLinks = {
  platform: {
    title: 'Platform',
    links: [
      { name: 'Games', href: '/games' },
      { name: 'Live Casino', href: '/games?category=live' },
      { name: 'Sports', href: '/sports' },
      { name: 'Promotions', href: '/promotions' },
    ]
  },
  support: {
    title: 'Support',
    links: [
      { name: 'Help Center', href: '/help' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Live Chat', href: '/chat' },
    ]
  },
  company: {
    title: 'Company',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Blog', href: '/blog' },
      { name: 'Press', href: '/press' },
    ]
  },
  legal: {
    title: 'Legal',
    links: [
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Responsible Gaming', href: '/responsible' },
      { name: 'AML Policy', href: '/aml' },
    ]
  }
}

const socialLinks = [
  { name: 'Twitter', href: 'https://twitter.com', icon: TwitterIcon },
  { name: 'Telegram', href: 'https://telegram.org', icon: TelegramIcon },
  { name: 'Discord', href: 'https://discord.com', icon: DiscordIcon },
  { name: 'YouTube', href: 'https://youtube.com', icon: YoutubeIcon },
]

export default function Footer() {
  return (
    <footer className="relative bg-dark-400 border-t border-dark-100">
      {/* Gradient border top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow">
                <span className="text-xl font-bold text-dark-500">8</span>
              </div>
              <span className="text-xl font-display font-bold gradient-text">8769bet</span>
            </Link>
            <p className="text-sm text-gray-400 mb-6">
              The most advanced AI-powered gaming platform with provably fair games and smart predictions.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-primary-500/20 hover:border-primary-500/50 transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-5 h-5 text-gray-400 hover:text-primary-400" />
                  </motion.a>
                )
              })}
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-400 hover:text-primary-400 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-dark-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
              <span>© 2024 8769bet. All rights reserved.</span>
              <span className="hidden md:inline">•</span>
              <span>Licensed & Regulated</span>
            </div>
            
            {/* Payment Methods */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-300/50 text-xs text-gray-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                SSL Secure
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-300/50 text-xs text-gray-400">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                Provably Fair
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
