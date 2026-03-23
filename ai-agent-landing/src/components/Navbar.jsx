import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Games', path: '/games' },
    { name: 'AI Agent', path: '/agent' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Play Now', path: '/play/aviator' },
    { name: 'Admin', path: '/admin/login' },
  ];

  return (
    <>
      {/* Fixed Top Bar */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Logo/Brand */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-orbitron text-primary">
                AI Agent
              </Link>
            </div>
            
            {/* Center: Navigation (hidden on mobile) */}
            <div className="hidden md:flex md:items-center md:space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-sm font-medium text-gray-300 hover:text-primary transition-colors ${
                    location.pathname === link.path ? 'text-primary' : ''
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              
              {/* Balance Display */}
              <div className="flex items-center text-sm text-gray-300">
                <span className="mr-2">Balance:</span>
                <span className="font-medium text-primary">5.56</span>
                <span className="ml-1">&#8377;</span>
              </div>
            </div>
            
            {/* Right: Buttons and Mobile Menu */}
            <div className="flex items-center space-x-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 rounded hover:bg-gray-800"
                aria-label="Open menu"
              >
                {/* Hamburger Icon */}
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Deposit Button */}
              <Link to="/deposit" className="px-4 py-2 bg-secondary text-black font-semibold rounded hover:bg-yellow-400 transition-colors">
                Deposit ↓
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} bg-black/90 backdrop-blur-sm border-t border-gray-800`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="space-y-4">
            {/* Mobile Nav Links */}
            <div className="space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`block px-3 py-2 rounded text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-primary transition-colors ${
                    location.pathname === link.path ? 'bg-gray-800 text-primary' : ''
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            {/* Mobile Balance and Deposit */}
            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>Balance:</span>
                <span className="font-medium text-primary">5.56 &#8377;</span>
              </div>
              <Link to="/deposit" className="w-full mt-2 px-3 py-2 bg-secondary text-black font-semibold text-center rounded hover:bg-yellow-400 transition-colors">
                Deposit ↓
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
