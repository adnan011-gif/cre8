import { useState, useCallback } from "react";
import { Briefcase, Pen, Users, Image, ChartBar, MessageSquare, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useBackendProfile } from "@/hooks/useBackendProfile";
import { useNavigate } from "react-router-dom";

// Type definitions
type UserRole = "content-creator" | "entrepreneur" | "social-media-manager";
type ContentGenre = "educational" | "entertainment" | "gaming" | "lifestyle" | "music" | "tech" | "travel" | "other";
type BusinessCategory = "ecommerce" | "saas" | "consulting" | "agency" | "retail" | "manufacturing" | "other";
type ClientType = "influencers" | "small-businesses" | "corporate" | "individuals" | "mixed";
type BusinessSize = "solo" | "small-team" | "medium" | "large";
type SocialMediaNiche = "content-creation" | "community-management" | "marketing-campaigns" | "analytics" | "full-service";

interface FormData {
  contentGenre: ContentGenre | "";
  businessCategory: BusinessCategory | "";
  businessDescription: string;
  clientType: ClientType | "";
  businessSize: BusinessSize | "";
  socialMediaNiche: SocialMediaNiche | "";
}

interface UserProfile {
  role: UserRole;
  formData: FormData;
  completedAt: string;
}

const ProfileSetup = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  const { loading, updateUserRole, createContentCreatorProfile, createEntrepreneurProfile, createSocialMediaManagerProfile } = useBackendProfile();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<FormData>({
    contentGenre: "",
    businessCategory: "",
    businessDescription: "",
    clientType: "",
    businessSize: "",
    socialMediaNiche: ""
  });

  // Toast function
  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRoleSelect = useCallback((role: string) => {
    setUserRole(role as UserRole);
  }, []);

  const handleFormDataChange = useCallback(<K extends keyof FormData>(
    key: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const validateStep1 = (): boolean => {
    if (!userRole) {
      showToast('error', 'Please select a role to continue');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (userRole === "content-creator") {
      if (!formData.contentGenre) {
        showToast('error', 'Please select a content genre');
        return false;
      }
    } else if (userRole === "entrepreneur") {
      if (!formData.businessCategory || !formData.businessDescription.trim()) {
        showToast('error', 'Please complete all required fields');
        return false;
      }
    } else if (userRole === "social-media-manager") {
      if (!formData.clientType || !formData.businessSize || !formData.socialMediaNiche) {
        showToast('error', 'Please complete all required fields');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      
      // Update user role
      const { error } = await updateUserRole(userRole!);
      if (error) {
        showToast('error', error);
        return;
      }
      
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!validateStep2()) return;
      
      let error: string | null = null;
      
      // Create role-specific profile
      if (userRole === 'content-creator') {
        const result = await createContentCreatorProfile(formData.contentGenre as any);
        error = result.error || null;
      } else if (userRole === 'entrepreneur') {
        const result = await createEntrepreneurProfile(
          formData.businessCategory as any,
          formData.businessDescription
        );
        error = result.error || null;
      } else if (userRole === 'social-media-manager') {
        const result = await createSocialMediaManagerProfile(
          formData.clientType as any,
          formData.businessSize as any,
          formData.socialMediaNiche as any
        );
        error = result.error || null;
      }
      
      if (error) {
        showToast('error', error);
        return;
      }
      
      const profile: UserProfile = {
        role: userRole!,
        formData: { ...formData },
        completedAt: new Date().toISOString()
      };
      
      setUserProfile(profile);
      setStep(3);
      showToast('success', 'Profile setup completed successfully!');
      
      // Log the saved data to console
      console.log('Profile saved:', profile);
    }
  };

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1);
    }
  }, [step]);

  const handleStartOver = () => {
    setStep(1);
    setUserRole(null);
    setUserProfile(null);
    setFormData({
      contentGenre: "",
      businessCategory: "",
      businessDescription: "",
      clientType: "",
      businessSize: "",
      socialMediaNiche: ""
    });
  };

  // Success page
  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
                    <div className="fixed inset-0 z-0">
        {/* Layer 1 - Larger, more blurred */}
        <div className="absolute w-[500px] h-[500px] bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 -top-20 -left-20 animate-pulse" 
             style={{ animation: 'blob 10s infinite' }} />
        <div className="absolute w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-35 -top-10 -right-10" 
             style={{ animation: 'blob 8s infinite 2s' }} />
        
        {/* Layer 2 - Medium, sharper */}
        <div className="absolute w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-xl opacity-50 top-1/4 right-1/4" 
             style={{ animation: 'blob 12s infinite 1s' }} />
        <div className="absolute w-72 h-72 bg-pink-500 rounded-full mix-blend-screen filter blur-xl opacity-45 bottom-1/4 left-1/3" 
             style={{ animation: 'blob 9s infinite 4s' }} />
        
        {/* Layer 3 - Smaller, very sharp for definition */}
        <div className="absolute w-48 h-48 bg-emerald-400 rounded-full mix-blend-screen filter blur-lg opacity-60 top-1/2 left-1/4" 
             style={{ animation: 'blob 7s infinite 3s' }} />
        <div className="absolute w-56 h-56 bg-yellow-400 rounded-full mix-blend-screen filter blur-lg opacity-40 bottom-1/3 right-1/3" 
             style={{ animation: 'blob 11s infinite 5s' }} />
      </div>
        <div className="w-full max-w-md space-y-8">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-xl p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-500/20 mb-6">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">Welcome aboard!</h2>
            <p className="text-gray-300 mb-6">Your profile has been set up successfully.</p>
            
            {userProfile && (
              <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-lg font-semibold text-white mb-2">Profile Summary:</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><span className="font-medium">Role:</span> {userProfile.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                  {userProfile.role === 'content-creator' && formData.contentGenre && (
                    <p><span className="font-medium">Genre:</span> {formData.contentGenre}</p>
                  )}
                  {userProfile.role === 'entrepreneur' && (
                    <>
                      <p><span className="font-medium">Category:</span> {formData.businessCategory}</p>
                      <p><span className="font-medium">Description:</span> {formData.businessDescription}</p>
                    </>
                  )}
                  {userProfile.role === 'social-media-manager' && (
                    <>
                      <p><span className="font-medium">Clients:</span> {formData.clientType}</p>
                      <p><span className="font-medium">Team Size:</span> {formData.businessSize}</p>
                      <p><span className="font-medium">Niche:</span> {formData.socialMediaNiche}</p>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Go to Dashboard
              </button>
              
              <button
                onClick={handleStartOver}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg border border-white/20 transition-all duration-200"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="fixed inset-0 z-0">
        {/* Layer 1 - Larger, more blurred */}
        <div className="absolute w-[500px] h-[500px] bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 -top-20 -left-20 animate-pulse" 
             style={{ animation: 'blob 10s infinite' }} />
        <div className="absolute w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-35 -top-10 -right-10" 
             style={{ animation: 'blob 8s infinite 2s' }} />
        
        {/* Layer 2 - Medium, sharper */}
        <div className="absolute w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-xl opacity-50 top-1/4 right-1/4" 
             style={{ animation: 'blob 12s infinite 1s' }} />
        <div className="absolute w-72 h-72 bg-pink-500 rounded-full mix-blend-screen filter blur-xl opacity-45 bottom-1/4 left-1/3" 
             style={{ animation: 'blob 9s infinite 4s' }} />
        
        {/* Layer 3 - Smaller, very sharp for definition */}
        <div className="absolute w-48 h-48 bg-emerald-400 rounded-full mix-blend-screen filter blur-lg opacity-60 top-1/2 left-1/4" 
             style={{ animation: 'blob 7s infinite 3s' }} />
        <div className="absolute w-56 h-56 bg-yellow-400 rounded-full mix-blend-screen filter blur-lg opacity-40 bottom-1/3 right-1/3" 
             style={{ animation: 'blob 11s infinite 5s' }} />
      </div>
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-48 w-48 -mb-10 flex items-center justify-center ">
            <img src="../../public/lovable-uploads/logomain.png" alt="" />
          </div>
          <h2 className="text-3xl font-bold text-white">Set Up Your Profile</h2>
          <p className="mt-2 text-sm text-gray-300">
            Tell us more about yourself so we can personalize your experience
          </p>
        </div>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-white/20 text-gray-400'}`}>
            1
          </div>
          <div className={`h-1 w-12 ${step >= 2 ? 'bg-blue-600' : 'bg-white/20'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-white/20 text-gray-400'}`}>
            2
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-xl p-6">
          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">What best describes you?</h3>
                <p className="text-gray-300 text-sm">Choose the option that best fits your role</p>
              </div>
              
              <div className="space-y-3">
                {[
                  { value: "content-creator", icon: Pen, label: "Content Creator", desc: "Create engaging content for audiences" },
                  { value: "entrepreneur", icon: Briefcase, label: "Entrepreneur", desc: "Build and grow your business" },
                  { value: "social-media-manager", icon: Users, label: "Social Media Manager", desc: "Manage social media for clients" }
                ].map(({ value, icon: Icon, label, desc }) => (
                  <label
                    key={value}
                    className={`flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      userRole === value 
                        ? "border-blue-500 bg-blue-500/10" 
                        : "border-white/20 hover:bg-white/5 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="userRole"
                      value={value}
                      checked={userRole === value}
                      onChange={(e) => handleRoleSelect(e.target.value)}
                      className="sr-only"
                    />
                    <Icon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-white font-medium">{label}</div>
                      <div className="text-gray-400 text-sm">{desc}</div>
                    </div>
                    {userRole === value && <CheckCircle className="h-5 w-5 text-blue-400" />}
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Step 2: Role-specific details */}
          {step === 2 && userRole === "content-creator" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">What type of content do you create?</h3>
                <p className="text-gray-300 text-sm">This helps us tailor our features to your needs</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">Content Genre *</label>
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.contentGenre}
                  onChange={(e) => handleFormDataChange('contentGenre', e.target.value as ContentGenre)}
                >
                  <option value="">Select genre</option>
                  {[
                    { value: "educational", label: "Educational" },
                    { value: "entertainment", label: "Entertainment" },
                    { value: "gaming", label: "Gaming" },
                    { value: "lifestyle", label: "Lifestyle" },
                    { value: "music", label: "Music" },
                    { value: "tech", label: "Tech" },
                    { value: "travel", label: "Travel" },
                    { value: "other", label: "Other" }
                  ].map(({ value, label }) => (
                    <option key={value} value={value} className="bg-gray-800">{label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {step === 2 && userRole === "entrepreneur" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Tell us about your business</h3>
                <p className="text-gray-300 text-sm">This helps us tailor our features to your needs</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Business Category *</label>
                  <select
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.businessCategory}
                    onChange={(e) => handleFormDataChange('businessCategory', e.target.value as BusinessCategory)}
                  >
                    <option value="">Select category</option>
                    {[
                      { value: "ecommerce", label: "E-commerce" },
                      { value: "saas", label: "SaaS" },
                      { value: "consulting", label: "Consulting" },
                      { value: "agency", label: "Agency" },
                      { value: "retail", label: "Retail" },
                      { value: "manufacturing", label: "Manufacturing" },
                      { value: "other", label: "Other" }
                    ].map(({ value, label }) => (
                      <option key={value} value={value} className="bg-gray-800">{label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Business Description *</label>
                  <textarea 
                    placeholder="Tell us more about your business..."
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.businessDescription}
                    onChange={(e) => handleFormDataChange('businessDescription', e.target.value)}
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-400 text-right">
                    {formData.businessDescription.length}/500
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {step === 2 && userRole === "social-media-manager" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Tell us about your social media management</h3>
                <p className="text-gray-300 text-sm">This helps us tailor our features to your needs</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Type of Clients *</label>
                  <select
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.clientType}
                    onChange={(e) => handleFormDataChange('clientType', e.target.value as ClientType)}
                  >
                    <option value="">Select client type</option>
                    {[
                      { value: "influencers", label: "Influencers" },
                      { value: "small-businesses", label: "Small Businesses" },
                      { value: "corporate", label: "Corporate" },
                      { value: "individuals", label: "Individuals" },
                      { value: "mixed", label: "Mixed" }
                    ].map(({ value, label }) => (
                      <option key={value} value={value} className="bg-gray-800">{label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Team Size *</label>
                  <select
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.businessSize}
                    onChange={(e) => handleFormDataChange('businessSize', e.target.value as BusinessSize)}
                  >
                    <option value="">Select team size</option>
                    {[
                      { value: "solo", label: "Solo" },
                      { value: "small-team", label: "Small Team (2-5)" },
                      { value: "medium", label: "Medium (6-20)" },
                      { value: "large", label: "Large (20+)" }
                    ].map(({ value, label }) => (
                      <option key={value} value={value} className="bg-gray-800">{label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Social Media Niche *</label>
                  <select
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.socialMediaNiche}
                    onChange={(e) => handleFormDataChange('socialMediaNiche', e.target.value as SocialMediaNiche)}
                  >
                    <option value="">Select niche</option>
                    {[
                      { value: "content-creation", label: "Content Creation" },
                      { value: "community-management", label: "Community Management" },
                      { value: "marketing-campaigns", label: "Marketing Campaigns" },
                      { value: "analytics", label: "Analytics & Reporting" },
                      { value: "full-service", label: "Full Service" }
                    ].map(({ value, label }) => (
                      <option key={value} value={value} className="bg-gray-800">{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
            {step === 2 && (
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}
            
            <button
              onClick={handleNext}
              disabled={loading}
              className="ml-auto flex rounded-full items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-6 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>{step === 2 ? "Complete Setup" : "Next"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Toast notification */}
        {toastMessage && (
          <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}>
            {toastMessage.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;