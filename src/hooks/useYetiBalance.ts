import { useState, useEffect } from 'react';
import { useYetiApi } from '@/contexts/AuthContext';

interface BalanceData {
  balance: number;
  currency: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useYetiBalance(): BalanceData {
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('EUR');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { callApi } = useYetiApi();

  const fetchBalance = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // L'API Yeti Customer utilise /account pour obtenir les infos du compte
      const data = await callApi('/account', 'GET');
      
      if (data?.balance !== undefined) {
        setBalance(parseFloat(data.balance) || 0);
      }
      if (data?.balance_currency) {
        setCurrency(data.balance_currency);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    
    // Rafraîchir le solde toutes les 5 minutes
    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    balance,
    currency,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
