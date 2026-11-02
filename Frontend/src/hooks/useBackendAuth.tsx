import { useState, useEffect, createContext, useContext } from 'react';
import { apiService } from '@/lib/api';
import { useToast } from './use-toast';

interface User {
  id: string;
  email: string;
  name: string;
  userRole?: string;
  profileCompleted?: boolean;
  persona?: any;
  pastOutputs?: any[];
  currency?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useBackendAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useBackendAuth must be used within a BackendAuthProvider');
  }
  return context;
};

export const BackendAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refreshUser = async () => {
    try {
      const result = await apiService.getCurrentUser();
      if (result.data && 
          typeof result.data === 'object' && 
          result.data !== null &&
          'success' in result.data && 
          result.data.success === true &&
          'data' in result.data && 
          result.data.data &&
          typeof result.data.data === 'object' &&
          'user' in result.data.data
      ) {
        setUser(result.data.data.user as User);
      } else {
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await apiService.signIn(email, password);
      
      if (result.error) {
        toast({
          title: "Sign in failed",
          description: result.error,
          variant: "destructive",
        });
        return { error: result.error };
      }

      if (result.data && 
          typeof result.data === 'object' && 
          result.data !== null &&
          'success' in result.data && 
          result.data.success === true &&
          'data' in result.data && 
          result.data.data &&
          typeof result.data.data === 'object' &&
          'user' in result.data.data &&
          'token' in result.data.data
      ) {
        const { user, token } = result.data.data as { user: any; token: string };

        // Store token
        localStorage.setItem('authToken', token);
        
        // Set user
        setUser(user);
        
        toast({
          title: "Welcome back!",
          description: "Successfully signed in",
        });
        
        return { error: undefined };
      }
      
      return { error: 'Sign in failed' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const result = await apiService.signUp(email, password, name);
      
      if (result.error) {
        toast({
          title: "Sign up failed",
          description: result.error,
          variant: "destructive",
        });
        return { error: result.error };
      }

      if (result.data && 
          typeof result.data === 'object' && 
          result.data !== null &&
          'success' in result.data && 
          result.data.success === true &&
          'data' in result.data && 
          result.data.data &&
          typeof result.data.data === 'object' &&
          'user' in result.data.data &&
          'token' in result.data.data
      ) {
        const { user, token } = result.data.data as { user: any; token: string };

        // Store token
        localStorage.setItem('authToken', token);
        
        // Set user
        setUser(user);
        
        toast({
          title: "Welcome to Cre8Hub!",
          description: "Account created successfully",
        });
        
        return { error: undefined };
      }
      
      return { error: 'Sign up failed' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      // Call backend logout endpoint to invalidate token on server
      await apiService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed, but continuing with client-side logout:', error);
    } finally {
      // Clear all authentication data from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      // Clear any other auth-related data
      sessionStorage.clear();
      
      // Reset user state
      setUser(null);
      
      // Clear any cached user data
      if (typeof window !== 'undefined') {
        // Clear any cached API responses
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }
      }
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out and all data has been cleared",
      });
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        await refreshUser();
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      const result = await apiService.refreshToken();
      if (result.data && 
          typeof result.data === 'object' && 
          result.data !== null &&
          'success' in result.data && 
          result.data.success === true &&
          'data' in result.data && 
          result.data.data &&
          typeof result.data.data === 'object' &&
          'token' in result.data.data
      ) {
        const { token } = result.data.data as { token: string };
        localStorage.setItem('authToken', token);
      }
    }, 14 * 60 * 1000); // Refresh every 14 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
