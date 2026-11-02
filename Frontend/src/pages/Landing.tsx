import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBackendAuth } from "@/hooks/useBackendAuth";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import MockupsSection from "@/components/MockupsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import FaqSection from "@/components/FaqSection";
import Footer from "@/components/Footer";
import { Header } from "@/components/Header";

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useBackendAuth();


  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A') {
        const href = target.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const id = href.substring(1);
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth'
            });
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => {
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);

  return (
    <>
    <Header />
    <div className="relative min-h-screen bg-gradient-to-br bg-black overflow-hidden">
      

      {/* More Vibrant Blobs */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-2xl opacity-40"
          style={{
            top: '-10%',
            left: '-10%',
            animation: 'blob 8s infinite',
            background: 'radial-gradient(circle, #3b82f6, #1d4ed8)'
          }}
        />
        <div 
          className="absolute w-80 h-80 bg-purple-500 rounded-full mix-blend-screen filter blur-2xl opacity-45"
          style={{
            top: '-5%',
            right: '-5%',
            animation: 'blob 7s infinite 2s',
            background: 'radial-gradient(circle, #8b5cf6, #7c3aed)'
          }}
        />
        <div 
          className="absolute w-72 h-72 bg-pink-400 rounded-full mix-blend-screen filter blur-2xl opacity-35"
          style={{
            bottom: '-10%',
            left: '15%',
            animation: 'blob 9s infinite 4s',
            background: 'radial-gradient(circle, #ec4899, #db2777)'
          }}
        />
        <div 
          className="absolute w-64 h-64 bg-cyan-300 rounded-full mix-blend-screen filter blur-2xl opacity-30"
          style={{
            top: '40%',
            right: '10%',
            animation: 'blob 6s infinite 1s',
            background: 'radial-gradient(circle, #06b6d4, #0891b2)'
          }}
        />
      </div>
      <div className="relative z-10 flex flex-col min-h-screen">
        
        <main className="flex-grow">
          <HeroSection />
          <FeaturesSection />
          <MockupsSection />
          <TestimonialsSection />
          <PricingSection />
          <FaqSection />
        </main>
        <Footer />
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.2); }
          66% { transform: translate(-30px, 30px) scale(0.8); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>
    </div>
    </>
  );
};


export default Landing;