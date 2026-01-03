import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPABASE_URL = "https://fbxtflpiszcqgveckyjm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZieHRmbHBpc3pjcWd2ZWNreWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0ODkwMDksImV4cCI6MjA2NzA2NTAwOX0.mjJCAoXs5CMFwtqTSg9_8AVQFFchqbi2VrzeGUgcah4";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedToken = sessionStorage.getItem('yeti_token');
    const storedUsername = sessionStorage.getItem('yeti_username');
    
    if (storedToken && storedUsername) {
      setToken(storedToken);
      setUsername(storedUsername);
    }
    setIsLoading(false);
  }, []);

  const login = async (usernameInput: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/yeti-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          endpoint: '/auth',
          auth: {
            username: usernameInput,
            password: password,
          }
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('Login failed:', data);
        return { 
          success: false, 
          error: data.error || 'Identifiants invalides' 
        };
      }

      if (data.jwt) {
        setToken(data.jwt);
        setUsername(usernameInput);
        sessionStorage.setItem('yeti_token', data.jwt);
        sessionStorage.setItem('yeti_username', usernameInput);
        return { success: true };
      }

      return { success: false, error: 'Token non reçu' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    sessionStorage.removeItem('yeti_token');
    sessionStorage.removeItem('yeti_username');
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      token,
      username,
      login,
      logout,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook pour appeler l'API Yeti avec authentification
export const useYetiApi = () => {
  const { token } = useAuth();

  const callApi = async (endpoint: string, method: string = 'GET', data?: any) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/yeti-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'x-yeti-token': token,
      },
      body: JSON.stringify({
        endpoint,
        method,
        data,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'API call failed');
    }

    return responseData;
  };

  return { callApi };
};
