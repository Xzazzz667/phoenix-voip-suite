import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, TrendingUp, TrendingDown, Phone, PhoneOff, Timer, DollarSign, BarChart3, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subHours, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useYetiApi } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Area,
  AreaChart,
  ComposedChart
} from "recharts";

interface StatsData {
  acd: number;
  asr: number;
  failedCalls: number;
  successfulCalls: number;
  totalCalls: number;
  totalDuration: number;
  totalPrice: number;
}

interface ChartDataPoint {
  time: string;
  activeCalls: number;
  successfulCalls: number;
  totalCalls: number;
  duration: number;
}

const periodOptions = [
  { value: "2h", label: "2 dernières heures" },
  { value: "6h", label: "6 dernières heures" },
  { value: "24h", label: "24 dernières heures" },
  { value: "2d", label: "2 derniers jours" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "custom", label: "Période personnalisée" },
];

const granularityOptions = [
  { value: "hour", label: "Heure" },
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

const Statistics = () => {
  const { callApi } = useYetiApi();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("2d");
  const [granularity, setGranularity] = useState("hour");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 2),
    to: new Date(),
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  
  const [stats, setStats] = useState<StatsData>({
    acd: 0,
    asr: 0,
    failedCalls: 0,
    successfulCalls: 0,
    totalCalls: 0,
    totalDuration: 0,
    totalPrice: 0,
  });
  
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Calculate date range based on period selection
  const getDateRange = () => {
    const now = new Date();
    let from: Date;
    
    switch (period) {
      case "2h":
        from = subHours(now, 2);
        break;
      case "6h":
        from = subHours(now, 6);
        break;
      case "24h":
        from = subHours(now, 24);
        break;
      case "2d":
        from = subDays(now, 2);
        break;
      case "7d":
        from = subDays(now, 7);
        break;
      case "30d":
        from = subDays(now, 30);
        break;
      case "custom":
        return dateRange;
      default:
        from = subDays(now, 2);
    }
    
    return { from, to: now };
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const range = getDateRange();
      const fromDate = range.from ? format(range.from, "yyyy-MM-dd'T'HH:mm:ss") : "";
      const toDate = range.to ? format(range.to, "yyyy-MM-dd'T'HH:mm:ss") : "";
      
      // Fetch CDR data from Yeti API
      const response = await callApi(`/cdrs?filter[time_start_gteq]=${fromDate}&filter[time_start_lteq]=${toDate}&page[size]=1000`);
      
      if (response?.data) {
        const cdrs = response.data;
        
        // Calculate statistics
        const totalCalls = cdrs.length;
        const successfulCalls = cdrs.filter((cdr: any) => cdr.attributes?.success === true).length;
        const failedCalls = totalCalls - successfulCalls;
        const asr = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
        
        const totalDuration = cdrs.reduce((sum: number, cdr: any) => {
          return sum + (cdr.attributes?.duration || 0);
        }, 0);
        
        const acd = successfulCalls > 0 ? totalDuration / successfulCalls / 60 : 0;
        
        const totalPrice = cdrs.reduce((sum: number, cdr: any) => {
          return sum + (cdr.attributes?.customer_price || 0);
        }, 0);
        
        setStats({
          acd,
          asr,
          failedCalls,
          successfulCalls,
          totalCalls,
          totalDuration: totalDuration / 60,
          totalPrice,
        });
        
        // Generate chart data based on granularity
        const chartPoints = generateChartData(cdrs, granularity, range);
        setChartData(chartPoints);
      }
    } catch (error: any) {
      console.error("Error fetching statistics:", error);
      toast.error("Erreur lors du chargement des statistiques");
      
      // Show empty data on error
      setStats({
        acd: 0,
        asr: 0,
        failedCalls: 0,
        successfulCalls: 0,
        totalCalls: 0,
        totalDuration: 0,
        totalPrice: 0,
      });
      
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (cdrs: any[], granularity: string, range: { from: Date | undefined; to: Date | undefined }): ChartDataPoint[] => {
    if (!range.from || !range.to || cdrs.length === 0) return [];
    
    const groupedData: Map<string, ChartDataPoint> = new Map();
    
    cdrs.forEach((cdr: any) => {
      const timestamp = new Date(cdr.attributes?.time_start || new Date());
      let key: string;
      
      switch (granularity) {
        case "hour":
          key = format(timestamp, "HH:00\nyyyy-MM-dd");
          break;
        case "day":
          key = format(timestamp, "dd/MM");
          break;
        case "week":
          key = `S${format(timestamp, "ww")}`;
          break;
        case "month":
          key = format(timestamp, "MMM yyyy", { locale: fr });
          break;
        default:
          key = format(timestamp, "HH:00");
      }
      
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          time: key,
          activeCalls: 0,
          successfulCalls: 0,
          totalCalls: 0,
          duration: 0,
        });
      }
      
      const point = groupedData.get(key)!;
      point.totalCalls += 1;
      if (cdr.attributes?.success) {
        point.successfulCalls += 1;
      }
      point.duration += (cdr.attributes?.duration || 0) / 60;
      point.activeCalls = Math.max(point.activeCalls, point.totalCalls - point.successfulCalls);
    });
    
    return Array.from(groupedData.values()).sort((a, b) => a.time.localeCompare(b.time));
  };

  useEffect(() => {
    fetchStatistics();
  }, [period, granularity, dateRange]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    if (value === "custom") {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
    }
  };

  const formatDuration = (minutes: number) => {
    return `${minutes.toFixed(2)} min`;
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} €`;
  };

  const statsCards = [
    {
      title: "ACD",
      value: formatDuration(stats.acd),
      icon: Timer,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "ASR",
      value: `${stats.asr.toFixed(1)} %`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Appels échoués",
      value: stats.failedCalls.toString(),
      icon: PhoneOff,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Appels réussis",
      value: stats.successfulCalls.toString(),
      icon: Phone,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Total des appels",
      value: stats.totalCalls.toString(),
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Durée totale",
      value: formatDuration(stats.totalDuration),
      icon: Clock,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      title: "Prix total",
      value: formatPrice(stats.totalPrice),
      icon: DollarSign,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
          <p className="text-muted-foreground">
            Analysez les performances de vos appels par période
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[180px] justify-start">
                <Calendar className="w-4 h-4" />
                {periodOptions.find(p => p.value === period)?.label}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-2 space-y-1">
                {periodOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={period === option.value ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handlePeriodChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              
              {/* Custom Date Range Picker */}
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span>Start date</span>
                  <span>→</span>
                  <span>End date</span>
                </div>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "Début"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Fin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setPeriod("custom");
                      fetchStatistics();
                    }}
                  >
                    Ok
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Refresh Button */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchStatistics}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.title}</p>
              <p className={cn("text-xl font-bold mt-1", stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Calls Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Appels actifs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="activeCalls" fill="hsl(var(--primary))" name="Temps" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="activeCalls" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="Appels actifs" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Granularity Selector & Successful Calls Chart */}
      <div className="space-y-4">
        <div className="flex justify-end">
          <Tabs value={granularity} onValueChange={setGranularity}>
            <TabsList>
              {granularityOptions.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Appels réussis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="successfulCalls" fill="hsl(142, 76%, 36%)" name="Appels réussis" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Calls & Duration Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Total des appels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="totalCalls" fill="hsl(142, 50%, 25%)" name="Total appels" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Durée totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} min`, "Durée"]}
                  />
                  <Bar dataKey="duration" fill="hsl(var(--primary))" name="Durée (min)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;
