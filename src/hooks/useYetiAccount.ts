import { useState, useEffect, useCallback, useRef } from 'react';
import { useYetiApi } from '@/contexts/AuthContext';

interface AccountStats {
  balance: number;
  currency: string;
  callsThisMonth: number;
  totalDuration: string;
  activeUsers: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Singleton cache to prevent multiple components from triggering duplicate requests
let globalCache: {
  data: Omit<AccountStats, 'isLoading' | 'error' | 'refetch'> | null;
  lastFetch: number;
  fetchPromise: Promise<void> | null;
} = {
  data: null,
  lastFetch: 0,
  fetchPromise: null,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useYetiAccount(): AccountStats {
  const [balance, setBalance] = useState<number>(globalCache.data?.balance ?? 0);
  const [currency, setCurrency] = useState<string>(globalCache.data?.currency ?? 'EUR');
  const [callsThisMonth, setCallsThisMonth] = useState<number>(globalCache.data?.callsThisMonth ?? 0);
  const [totalDuration, setTotalDuration] = useState<string>(globalCache.data?.totalDuration ?? '0h 0m');
  const [activeUsers, setActiveUsers] = useState<number>(globalCache.data?.activeUsers ?? 0);
  const [isLoading, setIsLoading] = useState(!globalCache.data);
  const [error, setError] = useState<string | null>(null);
  const { callApi } = useYetiApi();
  
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const updateLocalState = useCallback(() => {
    if (globalCache.data && isMountedRef.current) {
      setBalance(globalCache.data.balance);
      setCurrency(globalCache.data.currency);
      setCallsThisMonth(globalCache.data.callsThisMonth);
      setTotalDuration(globalCache.data.totalDuration);
      setActiveUsers(globalCache.data.activeUsers);
    }
  }, []);

  const fetchAccountData = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // Return cached data if still valid and not forcing refresh
    if (!forceRefresh && globalCache.data && (now - globalCache.lastFetch) < CACHE_TTL) {
      updateLocalState();
      setIsLoading(false);
      return;
    }
    
    // If a fetch is already in progress, wait for it
    if (globalCache.fetchPromise) {
      await globalCache.fetchPromise;
      updateLocalState();
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    globalCache.fetchPromise = (async () => {
      try {
        // Fetch accounts list (JSON:API format: data.attributes)
        const accountsResponse = await callApi('/accounts', 'GET');
        
        // Parse JSON:API response format
        let accountData = null;
        if (accountsResponse?.data) {
          const dataArray = Array.isArray(accountsResponse.data) ? accountsResponse.data : [accountsResponse.data];
          if (dataArray.length > 0) {
            accountData = dataArray[0].attributes || dataArray[0];
          }
        } else if (Array.isArray(accountsResponse)) {
          accountData = accountsResponse[0];
        } else {
          accountData = accountsResponse;
        }
        
        const newData: Omit<AccountStats, 'isLoading' | 'error' | 'refetch'> = {
          balance: accountData?.balance !== undefined ? parseFloat(accountData.balance) || 0 : 0,
          currency: accountData?.['balance-currency'] || accountData?.balance_currency || 'EUR',
          callsThisMonth: 0,
          totalDuration: '0h 0m',
          activeUsers: 0,
        };

        // Fetch CDR stats for this month
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = currentDate.toISOString().split('T')[0];
        
        try {
          const cdrsResponse = await callApi(`/cdrs?filter[time_start_gteq]=${startDate}&filter[time_start_lteq]=${endDate}`, 'GET');
          const cdrsData = cdrsResponse?.data || cdrsResponse;
          if (Array.isArray(cdrsData)) {
            newData.callsThisMonth = cdrsData.length;
            const totalSeconds = cdrsData.reduce((acc: number, cdr: any) => {
              const cdrAttrs = cdr.attributes || cdr;
              return acc + (parseInt(cdrAttrs.duration) || 0);
            }, 0);
            newData.totalDuration = formatDuration(totalSeconds);
          }
        } catch (cdrsError) {
          console.warn('Could not fetch CDRs:', cdrsError);
        }

        // Fetch origination gateways count
        try {
          const gatewaysResponse = await callApi('/origination-gateways', 'GET');
          const gatewaysData = gatewaysResponse?.data || gatewaysResponse;
          if (Array.isArray(gatewaysData)) {
            newData.activeUsers = gatewaysData.length;
          }
        } catch (gatewaysError) {
          console.warn('Could not fetch gateways:', gatewaysError);
        }

        // Update global cache
        globalCache.data = newData;
        globalCache.lastFetch = Date.now();
        
      } catch (err) {
        console.error('Error fetching account data:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch account data');
        }
      } finally {
        globalCache.fetchPromise = null;
      }
    })();
    
    await globalCache.fetchPromise;
    updateLocalState();
    if (isMountedRef.current) {
      setIsLoading(false);
    }
  }, [callApi, updateLocalState]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    fetchAccountData();
    
    // Set up refresh interval
    intervalRef.current = setInterval(() => {
      fetchAccountData(true); // Force refresh
    }, REFRESH_INTERVAL);
    
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchAccountData]);

  return {
    balance,
    currency,
    callsThisMonth,
    totalDuration,
    activeUsers,
    isLoading,
    error,
    refetch: () => fetchAccountData(true),
  };
}
