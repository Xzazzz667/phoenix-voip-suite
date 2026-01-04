import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  tokenExpiresAt: Date | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPABASE_URL = "https://fbxtflpiszcqgveckyjm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZieHRmbHBpc3pjcWd2ZWNreWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0ODkwMDksImV4cCI6MjA2NzA2NTAwOX0.mjJCAoXs5CMFwtqTSg9_8AVQFFchqbi2VrzeGUgcah4";

// Refresh token 5 minutes before expiration
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Parse JWT to get expiration time
const parseJwtExpiration = (token: string): Date | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null);
  
  // Store password in memory for auto-refresh (not persisted)
  const passwordRef = useRef<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const performLogin = async (usernameInput: string, password: string): Promise<{ success: boolean; error?: string; jwt?: string }> => {
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
        return { success: true, jwt: data.jwt };
      }

      return { success: false, error: 'Token non reçu' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  };

  const scheduleTokenRefresh = useCallback((expiresAt: Date, currentUsername: string) => {
    clearRefreshTimeout();
    
    const now = Date.now();
    const expiresIn = expiresAt.getTime() - now;
    const refreshIn = Math.max(expiresIn - REFRESH_BUFFER_MS, 0);
    
    console.log(`Token expires in ${Math.round(expiresIn / 1000 / 60)} minutes, scheduling refresh in ${Math.round(refreshIn / 1000 / 60)} minutes`);
    
    if (refreshIn <= 0) {
      // Token already expired or about to expire, refresh now
      if (passwordRef.current) {
        console.log('Token about to expire, refreshing now...');
        performLogin(currentUsername, passwordRef.current).then(result => {
          if (result.success && result.jwt) {
            const newExpiresAt = parseJwtExpiration(result.jwt);
            setToken(result.jwt);
            setTokenExpiresAt(newExpiresAt);
            sessionStorage.setItem('yeti_token', result.jwt);
            
            if (newExpiresAt) {
              scheduleTokenRefresh(newExpiresAt, currentUsername);
            }
            console.log('Token refreshed successfully');
          } else {
            console.warn('Token refresh failed, logging out');
            logout();
          }
        });
      }
      return;
    }
    
    refreshTimeoutRef.current = setTimeout(async () => {
      if (!passwordRef.current) {
        console.warn('No password stored for token refresh');
        return;
      }
      
      console.log('Refreshing token before expiration...');
      const result = await performLogin(currentUsername, passwordRef.current);
      
      if (result.success && result.jwt) {
        const newExpiresAt = parseJwtExpiration(result.jwt);
        setToken(result.jwt);
        setTokenExpiresAt(newExpiresAt);
        sessionStorage.setItem('yeti_token', result.jwt);
        
        if (newExpiresAt) {
          scheduleTokenRefresh(newExpiresAt, currentUsername);
        }
        console.log('Token refreshed successfully');
      } else {
        console.warn('Token refresh failed:', result.error);
        // Don't logout immediately, let the user continue until the token actually expires
      }
    }, refreshIn);
  }, [clearRefreshTimeout]);

  const logout = useCallback(() => {
    clearRefreshTimeout();
    setToken(null);
    setUsername(null);
    setTokenExpiresAt(null);
    passwordRef.current = null;
    sessionStorage.removeItem('yeti_token');
    sessionStorage.removeItem('yeti_username');
  }, [clearRefreshTimeout]);

  useEffect(() => {
    // Check for existing session on mount
    const storedToken = sessionStorage.getItem('yeti_token');
    const storedUsername = sessionStorage.getItem('yeti_username');
    
    if (storedToken && storedUsername) {
      const expiresAt = parseJwtExpiration(storedToken);
      
      // Check if token is still valid
      if (expiresAt && expiresAt.getTime() > Date.now()) {
        setToken(storedToken);
        setUsername(storedUsername);
        setTokenExpiresAt(expiresAt);
        // Note: Can't auto-refresh without password, user will need to re-login when token expires
      } else {
        // Token expired, clear session
        sessionStorage.removeItem('yeti_token');
        sessionStorage.removeItem('yeti_username');
      }
    }
    setIsLoading(false);
    
    return () => clearRefreshTimeout();
  }, [clearRefreshTimeout]);

  const login = async (usernameInput: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await performLogin(usernameInput, password);
    
    if (result.success && result.jwt) {
      const expiresAt = parseJwtExpiration(result.jwt);
      
      setToken(result.jwt);
      setUsername(usernameInput);
      setTokenExpiresAt(expiresAt);
      
      // Store password in memory for auto-refresh
      passwordRef.current = password;
      
      sessionStorage.setItem('yeti_token', result.jwt);
      sessionStorage.setItem('yeti_username', usernameInput);
      
      // Schedule token refresh
      if (expiresAt) {
        scheduleTokenRefresh(expiresAt, usernameInput);
      }
      
      return { success: true };
    }
    
    return { success: false, error: result.error };
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      token,
      username,
      login,
      logout,
      isLoading,
      tokenExpiresAt,
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
  const { token, logout } = useAuth();

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

    // Handle 401 - token expired, logout user
    if (response.status === 401) {
      console.warn('Token expired, logging out...');
      logout();
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    // Don't throw for 404 - let the calling code handle missing resources gracefully
    if (!response.ok && response.status !== 404) {
      throw new Error(responseData.error || 'API call failed');
    }

    // Return null for 404 to indicate resource not found
    if (response.status === 404) {
      return null;
    }

    return responseData;
  };

  return { callApi };
};
