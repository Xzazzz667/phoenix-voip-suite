import { useState, useEffect, useCallback } from 'react';
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

export function useYetiAccount(): AccountStats {
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('EUR');
  const [callsThisMonth, setCallsThisMonth] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<string>('0h 0m');
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { callApi } = useYetiApi();

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const fetchAccountData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch account info (balance)
      const accountData = await callApi('/account', 'GET');
      
      if (accountData?.balance !== undefined) {
        setBalance(parseFloat(accountData.balance) || 0);
      }
      if (accountData?.balance_currency) {
        setCurrency(accountData.balance_currency);
      }

      // Fetch CDR stats for this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];
      
      try {
        const cdrsData = await callApi(`/cdrs?time_start_gteq=${startDate}&time_start_lteq=${endDate}`, 'GET');
        
        if (Array.isArray(cdrsData)) {
          setCallsThisMonth(cdrsData.length);
          const totalSeconds = cdrsData.reduce((acc: number, cdr: any) => {
            return acc + (parseInt(cdr.duration) || 0);
          }, 0);
          setTotalDuration(formatDuration(totalSeconds));
        }
      } catch (cdrsError) {
        console.warn('Could not fetch CDRs:', cdrsError);
        // Keep default values if CDRs endpoint fails
      }

      // Fetch origination gateways count as proxy for active users/connections
      try {
        const gatewaysData = await callApi('/origination-gateways', 'GET');
        
        if (Array.isArray(gatewaysData)) {
          setActiveUsers(gatewaysData.length);
        }
      } catch (gatewaysError) {
        console.warn('Could not fetch gateways:', gatewaysError);
        // Keep default values if gateways endpoint fails
      }

    } catch (err) {
      console.error('Error fetching account data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch account data');
    } finally {
      setIsLoading(false);
    }
  }, [callApi]);

  useEffect(() => {
    fetchAccountData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAccountData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchAccountData]);

  return {
    balance,
    currency,
    callsThisMonth,
    totalDuration,
    activeUsers,
    isLoading,
    error,
    refetch: fetchAccountData,
  };
}
