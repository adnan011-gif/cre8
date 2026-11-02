import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReactElement, useState } from "react";
import { Youtube, Instagram, Twitter, Linkedin, Sparkles, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PlatformCardProps {
  platform: "youtube" | "instagram" | "twitter" | "linkedin";
  title: string;
  description: string;
  onSelect: () => void;
  isSelected?: boolean;
  setShowTranscriptRequest: (show: boolean) => void;
  showTranscriptRequest: boolean;
}

const platformIcons = {
  youtube: Youtube,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
};

const platformColors = {
  youtube: "text-red-500",
  instagram: "text-pink-500",
  twitter: "text-blue-400",
  linkedin: "text-blue-600",
};

export function PlatformCard({ platform, title, description, onSelect, isSelected }: PlatformCardProps) {
  const { toast } = useToast();
  const [isPersonifyEnabled, setIsPersonifyEnabled] = useState(false);
  const [showTranscriptRequest, setShowTranscriptRequest] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<'none' | 'extracting' | 'completed' | 'error'>('none');
  
  const Icon = platformIcons[platform];
  const colorClass = platformColors[platform];

  const handlePersonifyToggle = (checked: boolean) => {
    setIsPersonifyEnabled(checked);
    if (checked && platform === "youtube") {
      setShowTranscriptRequest(true);
    } else {
      setShowTranscriptRequest(false);
    }
  };

  const getChannelIdFromUrl = (url: string) => {
    // Extract channel ID from various YouTube URL formats
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return url; // Return as-is if no pattern matches
  };

  const handleExtractPersona = async () => {
    if (!channelId.trim()) {
      toast({
        title: "Channel ID required",
        description: "Please enter a valid YouTube channel ID",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    setExtractionStatus('extracting');
    
    try {
      const result = await apiService.extractPersonaFromYouTube(channelId);
      
      if (result.error) {
        setExtractionStatus('error');
        toast({
          title: "Persona extraction failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setExtractionStatus('completed');
      toast({
        title: "Persona extracted successfully!",
        description: "Your YouTube persona has been analyzed and saved",
      });
      
      // Clear the input and close the request after successful extraction
      setChannelId('');
      setShowTranscriptRequest(false);
    } catch (error) {
      setExtractionStatus('error');
      toast({
        title: "Error",
        description: "Failed to extract persona from YouTube",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGrantAccess = () => {
    // This now triggers the persona extraction flow
    if (channelId.trim()) {
      handleExtractPersona();
    }
  };

  return (
    <Card
      className={cn(
        "relative group backdrop-blur-2xl bg-white/20 hover:border-primary/50 transition-all duration-300 hover:shadow-cosmic cursor-pointer overflow-hidden border border-transparent",
        isSelected &&
          "border-primary shadow-[0_0_20px_rgba(147,51,234,0.8)] ring-2 ring-primary/50"
      )}
      onClick={onSelect}
    >
      <div className="absolute inset-0 bg-gradient-orb opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-secondary/20 ${colorClass}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          
          {platform === "youtube" && (
            <div
              className="flex items-center space-x-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Sparkles className="w-4 h-4 text-cosmic-glow" />
              <span className="text-sm font-medium">Personify</span>
              <Switch
                checked={isPersonifyEnabled}
                onCheckedChange={handlePersonifyToggle}
                className="data-[state=checked]:bg-cre8-purple"
              />
            </div>
          )}
        </div>
        
        {showTranscriptRequest && (
          <div className="mt-4 p-4 bg-white/20 rounded-xl space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cosmic-glow" />
              <h4 className="font-medium text-sm">Persona Enhancement Ready</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your YouTube channel to extract your unique content persona and create personalized content.
            </p>
            
            <div className="space-y-2">
              <Input
                placeholder="https://youtube.com/@yourchannel or UC..."
                value={channelId}
                onChange={(e) => setChannelId(getChannelIdFromUrl(e.target.value))}
                className="bg-white/10 border-white/20 text-white text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Paste your YouTube channel URL or channel ID
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={handleGrantAccess}
                disabled={isExtracting || !channelId.trim()}
                className="bg-gray-800 rounded-full hover:bg-white hover:text-black disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Extracting...
                  </>
                ) : extractionStatus === 'completed' ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Extracted
                  </>
                ) : (
                  'Extract Persona'
                )}
              </Button>
              <Button 
                size="sm" 
                onClick={() => setShowTranscriptRequest(false)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Later
              </Button>
            </div>
            
            {extractionStatus === 'completed' && (
              <div className="text-xs text-green-400 text-center bg-green-500/10 rounded-lg p-2">
                ✓ Persona extracted successfully!
              </div>
            )}
            
            {extractionStatus === 'error' && (
              <div className="text-xs text-red-400 text-center bg-red-500/10 rounded-lg p-2">
                ✗ Failed to extract persona. Please try again.
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}