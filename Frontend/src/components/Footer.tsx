
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className=" border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center mb-4">
              <img 
                src="/lovable-uploads/logomain.png" 
                alt="CRE8HUB Logo" 
                className="h-20 w-auto"
              />
              <span className="ml-2 text-xl font-bold text-white">CRE8HUB</span>
            </Link>
            <p className="text-gray-300 mb-6 max-w-md">
              Empowering creators with AI-powered tools and insights to optimize content and grow their audience.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-cre8-blue transition-colors">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-cre8-blue transition-colors">
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-cre8-blue transition-colors">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-cre8-blue transition-colors">
                <Linkedin className="h-6 w-6" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              <li><a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Integrations</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">API</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 mt-12 pt-8">
          <p className="text-center text-gray-400">
            © 2024 CRE8HUB. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
