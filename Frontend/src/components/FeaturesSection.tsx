
import { Brain,Image, BarChart3,VideoIcon,Sparkle, Users, Zap, Target, Shield } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Cre8Echo",
    description: "Smart Content Ideation – Generate fresh, trend-aligned content ideas and scripts tailored to your unique style and audience."
  },
  {
    icon: Image,
    title: "Cre8Canvas",
    description: "AI Thumbnail Designer – Create eye-catching, high-converting thumbnails in seconds with our AI-powered image generation tools."
  },
  {
    icon: VideoIcon,
    title: "Cre8Motion",
    description: "Next-Gen Video Creation – Transform scripts into engaging short-form videos with automated editing and smart visual enhancements."
  },
  {
    icon: BarChart3,
    title: "Cre8Sight",
    description: "Creator Analytics – Track engagement, identify trends, and understand what drives growth with advanced performance insights."
  },
  {
    icon: Target,
    title: "Cre8Reach",
    description: "Personalized Audience Growth – Reach more viewers with AI-driven targeting, posting strategies, and platform-specific recommendations."
  },
  {
    icon: Sparkle,
    title: "Cre8Flow",
    description: "Creator Workflow Automation – Save time by automating repetitive tasks — from ideation to publishing — so you can focus on creating."
  }
];


const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Powerful Features for
            <span className="bg-gradient-to-r from-cre8-blue to-cre8-purple bg-clip-text text-transparent">
              {" "}Creative Success
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Everything you need to create, optimize, and grow your digital presence in one comprehensive platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-cre8-dark/50 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:border-cre8-blue/50 transition-all duration-300 group"
            >
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-cre8-blue to-cre8-purple p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
