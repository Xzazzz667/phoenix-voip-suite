import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Node {
  id: string;
  name: string;
  rpcEndpoint?: string;
  signallingIp?: string;
  signallingPort?: number;
}

interface UseYetiAdminNodesResult {
  nodes: Node[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useYetiAdminNodes(): UseYetiAdminNodesResult {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('yeti-admin-api', {
        body: {
          endpoint: '/nodes',
          method: 'GET',
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Parse JSON:API response
      const nodesData = data?.data || [];
      const parsedNodes: Node[] = nodesData.map((node: any) => ({
        id: node.id,
        name: node.attributes?.name || `Node ${node.id}`,
        rpcEndpoint: node.attributes?.['rpc-endpoint'],
        signallingIp: node.attributes?.['signalling-ip'],
        signallingPort: node.attributes?.['signalling-port'],
      }));

      setNodes(parsedNodes);
    } catch (err) {
      console.error('Error fetching nodes:', err);
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  return { nodes, isLoading, error, refetch: fetchNodes };
}
