import { useState, useEffect } from 'react';
import './App.css';

// Components
import Navbar from './components/Navbar';
import PromoBanner from './components/PromoBanner';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import LiveDemo from './components/LiveDemo';
import Stats from './components/Stats';
import Promo from './components/Promo';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash && (
        <div className="fixed inset-0 flex items-center justify-center bg-black z-50">
          <div className="text-center">
            <h1 className="text-4xl font-orbitron text-primary mb-4">AI Agent</h1>
            <p className="text-lg text-gray-300">Loading predictive intelligence...</p>
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden mt-6">
              <div className="h-full w-[30%] bg-primary animate-pulse-slow"></div>
            </div>
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-black">
        <Navbar />
        {!showSplash && (
          <>
            <PromoBanner />
            <Hero />
            <Features />
            <HowItWorks />
            <LiveDemo />
            <Stats />
            <Promo />
            <Testimonials />
            <Footer />
          </>
        )}
      </div>
    </>
  );
}

export default App;
