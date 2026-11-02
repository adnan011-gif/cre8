import { useBackendAuth } from "@/hooks/useBackendAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Settings, Plus, Video, ShoppingBag, Zap, Shield, Building2, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, signOut } = useBackendAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cre8-dark to-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="/lovable-uploads/logomain.png" 
                alt="CRE8HUB Logo" 
                className="h-8"
              />
              <h1 className="text-xl font-bold text-white">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate("/cre8echo")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Content
              </Button>
              
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || ""} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-gray-400 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Welcome back!</CardTitle>
              <CardDescription className="text-gray-400">
                Ready to create amazing content?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/cre8echo")}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start Creating
              </Button>
            </CardContent>
          </Card>

          {/* Profile Status */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Profile Status</CardTitle>
              <CardDescription className="text-gray-400">
                Complete your profile to unlock all features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Profile Completed</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user?.profileCompleted 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {user?.profileCompleted ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">User Role</span>
                  <span className="text-white">
                    {user?.userRole ? user.userRole.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not Set'}
                  </span>
                </div>
                {!user?.profileCompleted && (
                  <Button 
                    onClick={() => navigate("/profile-setup")}
                    variant="outline" 
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Complete Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
              <CardDescription className="text-gray-400">
                Access your most used features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate("/cre8echo")}
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Content
                </Button>
                <Button 
                  onClick={async () => navigate("/studio")}
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <Video className="h-4 w-4 mr-2 text-blue-400" />
                  Cre8Studio
                </Button>
                <Button 
                  onClick={async () => navigate("/store")}
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <ShoppingBag className="h-4 w-4 mr-2 text-green-400" />
                  Cre8Store
                </Button>
                <Button 
                  onClick={async () => navigate("/agent")}
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <Zap className="h-4 w-4 mr-2 text-purple-400" />
                  Cre8Agent
                </Button>
                <Button 
                  onClick={async () => navigate("/agency")}
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <Building2 className="h-4 w-4 mr-2 text-cyan-400" />
                  Agency Dashboard
                </Button>
                <Button 
                  onClick={async () => navigate("/campaigns")}
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <Megaphone className="h-4 w-4 mr-2 text-orange-400" />
                  Campaigns
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
