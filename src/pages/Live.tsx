import { useState, useEffect, useCallback, useRef } from "react";
import { useYetiApi } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Phone, 
  RefreshCw, 
  Clock,
  TrendingUp,
  Globe,
  Timer
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ActiveCall {
  id: string;
  "src-prefix-routing": string;
  "dst-prefix-routing": string;
  duration: number;
  "customer-price": number;
  "connect-time": string;
  "auth-orig-ip": string;
}

interface CPSDataPoint {
  time: string;
  cps: number;
}

export default function Live() {
  const { callApi } = useYetiApi();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [activeCallsError, setActiveCallsError] = useState<string | null>(null);
  const [cpsData, setCpsData] = useState<CPSDataPoint[]>([]);
  const [currentCPS, setCurrentCPS] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const callApiRef = useRef(callApi);

  // Keep callApi ref updated
  useEffect(() => {
    callApiRef.current = callApi;
  }, [callApi]);

  // Fetch account ID on mount
  useEffect(() => {
    const fetchAccountId = async () => {
      try {
        const response = await callApiRef.current('/accounts', 'GET');
        if (response?.data) {
          const dataArray = Array.isArray(response.data) ? response.data : [response.data];
          if (dataArray.length > 0) {
            setAccountId(dataArray[0].id);
          }
        }
      } catch (error) {
        console.warn("Erreur lors de la récupération du compte:", error);
      }
    };
    fetchAccountId();
  }, []);

  const fetchActiveCalls = useCallback(async () => {
    if (!accountId) return;
    
    try {
      const response = await callApiRef.current(
        `/origination_active_calls?filter[account-id]=${accountId}`,
        "GET"
      );
      
      // Si response est null, cela signifie probablement une erreur 403
      if (response === null) {
        setActiveCallsError("Accès refusé à cette ressource (403)");
        setActiveCalls([]);
        return;
      }
      
      setActiveCallsError(null);
      if (response?.data) {
        const calls = Array.isArray(response.data) ? response.data : [];
        setActiveCalls(calls.map((item: any) => ({
          id: item.id,
          ...item.attributes
        })));
      } else {
        setActiveCalls([]);
      }
    } catch (error) {
      console.warn("Erreur lors de la récupération des appels actifs:", error);
      setActiveCallsError("Erreur de connexion");
      setActiveCalls([]);
    }
  }, [accountId]);

  const fetchCPSData = useCallback(async () => {
    if (!accountId) return;
    
    try {
      const toTime = new Date().toISOString().replace("T", " ").substring(0, 19);
      const fromTime = new Date(Date.now() - 5 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19);
      
      const response = await callApiRef.current("/chart-originated-cps", "POST", {
        data: {
          type: "chart-originated-cps",
          attributes: {
            "from-time": fromTime,
            "to-time": toTime
          },
          relationships: {
            account: {
              data: {
                type: "accounts",
                id: accountId
              }
            }
          }
        }
      });
      
      if (response?.data?.attributes?.["y-values"]) {
        const yValues = response.data.attributes["y-values"];
        const xMin = new Date(response.data.attributes["x-min"]).getTime();
        const xMax = new Date(response.data.attributes["x-max"]).getTime();
        const interval = (xMax - xMin) / (yValues.length - 1 || 1);
        
        const chartData: CPSDataPoint[] = yValues.map((value: number, index: number) => ({
          time: new Date(xMin + interval * index).toLocaleTimeString("fr-FR", { 
            hour: "2-digit", 
            minute: "2-digit",
            second: "2-digit"
          }),
          cps: value
        }));
        
        setCpsData(chartData);
        setCurrentCPS(yValues[yValues.length - 1] || 0);
      } else {
        setCpsData([]);
        setCurrentCPS(0);
      }
    } catch (error) {
      console.warn("Erreur lors de la récupération du CPS:", error);
      setCpsData([]);
      setCurrentCPS(0);
    }
  }, [accountId]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchActiveCalls(), fetchCPSData()]);
    setLastUpdate(new Date());
    setLoading(false);
  }, [fetchActiveCalls, fetchCPSData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchAllData();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllData]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Activité en direct
          </h1>
          <p className="text-muted-foreground">
            Dernières 5 minutes • Mise à jour: {lastUpdate?.toLocaleTimeString("fr-FR") || "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "⏸ Pause" : "▶ Auto"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CPS actuel</p>
                <p className="text-3xl font-bold text-primary">{currentCPS.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Appels en cours</p>
                <p className="text-3xl font-bold text-green-500">{activeCalls.length}</p>
              </div>
              <Phone className="w-10 h-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto-refresh</p>
                <p className="text-3xl font-bold text-amber-500">{autoRefresh ? "10s" : "Off"}</p>
              </div>
              <Clock className="w-10 h-10 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CPS Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Graphique CPS (5 dernières minutes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cpsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={cpsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cps" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              <p>Aucune donnée CPS disponible</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-500" />
            Appels en cours ({activeCalls.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeCalls.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Source</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Destination</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Durée</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Prix</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">IP Origine</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Connexion</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCalls.map((call) => (
                    <tr key={call.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono">
                          {call["src-prefix-routing"] || "—"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="font-mono">
                          {call["dst-prefix-routing"] || "—"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-sm">
                          <Timer className="w-3 h-3" />
                          {formatDuration(call.duration)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {call["customer-price"]?.toFixed(4) || "0.00"} €
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Globe className="w-3 h-3" />
                          {call["auth-orig-ip"] || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {call["connect-time"] ? new Date(call["connect-time"]).toLocaleTimeString("fr-FR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeCallsError ? (
            <div className="py-12 text-center">
              <Phone className="w-12 h-12 mx-auto mb-4 text-destructive/50" />
              <p className="text-destructive font-medium">{activeCallsError}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Votre compte n'a pas les permissions nécessaires pour voir les appels en cours.
              </p>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Aucun appel en cours</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
