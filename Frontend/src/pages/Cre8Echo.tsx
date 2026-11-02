import { ContentGenerator } from "@/components/ContentGenerator";

const Cre8Echo = () => {
  return (
    <div className="min-h-screen bg-gradient-background relative overflow-hidden">
      {/* Background Orb */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-orb bg-cre8-purple rounded-full blur-3xl opacity-30 animate-pulse" />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <ContentGenerator />
      </div>
    </div>
  );
};

export default Cre8Echo;
