import { useState, useEffect, useMemo } from "react";
import { Calendar, Download, RefreshCw, Phone, Search, FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format, subDays, subHours } from "date-fns";
import { fr } from "date-fns/locale";
import { useYetiApi } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CDRRecord {
  id: string;
  timeStart: string;
  timeConnect: string | null;
  timeEnd: string;
  duration: number;
  success: boolean;
  srcPrefixIn: string;
  dstPrefixIn: string;
  customerPrice: number;
  legaDisconnectCode: number;
  legaDisconnectReason: string;
  authOrigIp: string;
  authOrigPort: number;
  localTag: string;
  fromDomain: string;
  toDomain: string;
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

const CDR = () => {
  const { callApi } = useYetiApi();
  const [loading, setLoading] = useState(true);
  const [cdrs, setCdrs] = useState<CDRRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState("7d");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

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
        from = subDays(now, 7);
    }

    return { from, to: now };
  };

  const fetchCDRs = async () => {
    setLoading(true);
    try {
      const range = getDateRange();
      const fromDate = range.from ? format(range.from, "yyyy-MM-dd") : "";
      const toDate = range.to ? format(range.to, "yyyy-MM-dd") : "";

      const response = await callApi(
        `/cdrs?filter[time_start_gteq]=${fromDate}&filter[time_start_lteq]=${toDate}&page[size]=${pageSize}&page[number]=${currentPage}`
      );

      if (response?.data) {
        const mappedCdrs: CDRRecord[] = response.data.map((cdr: any) => ({
          id: cdr.id,
          timeStart: cdr.attributes?.["time-start"] || cdr.attributes?.time_start || "",
          timeConnect: cdr.attributes?.["time-connect"] || cdr.attributes?.time_connect,
          timeEnd: cdr.attributes?.["time-end"] || cdr.attributes?.time_end || "",
          duration: cdr.attributes?.duration || 0,
          success: cdr.attributes?.success || false,
          srcPrefixIn: cdr.attributes?.["src-prefix-in"] || cdr.attributes?.src_prefix_in || "",
          dstPrefixIn: cdr.attributes?.["dst-prefix-in"] || cdr.attributes?.dst_prefix_in || "",
          customerPrice: parseFloat(cdr.attributes?.["customer-price"] || cdr.attributes?.customer_price || "0"),
          legaDisconnectCode: cdr.attributes?.["lega-disconnect-code"] || cdr.attributes?.lega_disconnect_code || 0,
          legaDisconnectReason: cdr.attributes?.["lega-disconnect-reason"] || cdr.attributes?.lega_disconnect_reason || "",
          authOrigIp: cdr.attributes?.["auth-orig-ip"] || cdr.attributes?.auth_orig_ip || "",
          authOrigPort: cdr.attributes?.["auth-orig-port"] || cdr.attributes?.auth_orig_port || 0,
          localTag: cdr.attributes?.["local-tag"] || cdr.attributes?.local_tag || "",
          fromDomain: cdr.attributes?.["from-domain"] || cdr.attributes?.from_domain || "",
          toDomain: cdr.attributes?.["to-domain"] || cdr.attributes?.to_domain || "",
        }));

        setCdrs(mappedCdrs);
        setTotalCount(response.meta?.["total-count"] || response.meta?.total_count || mappedCdrs.length);
      }
    } catch (error: any) {
      console.error("Error fetching CDRs:", error);
      toast.error("Erreur lors du chargement des CDR");
      setCdrs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCDRs();
  }, [period, dateRange, currentPage]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    setCurrentPage(1);
  };

  const filteredCdrs = useMemo(() => {
    if (!searchQuery) return cdrs;
    const query = searchQuery.toLowerCase();
    return cdrs.filter(
      (cdr) =>
        cdr.srcPrefixIn.toLowerCase().includes(query) ||
        cdr.dstPrefixIn.toLowerCase().includes(query) ||
        cdr.authOrigIp.toLowerCase().includes(query) ||
        cdr.localTag.toLowerCase().includes(query)
    );
  }, [cdrs, searchQuery]);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(4)} €`;
  };

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Date/Heure début",
      "Date/Heure fin",
      "Durée (s)",
      "Statut",
      "Source",
      "Destination",
      "Prix",
      "Code déconnexion",
      "IP origine",
      "Port origine",
    ];

    const rows = filteredCdrs.map((cdr) => [
      cdr.id,
      cdr.timeStart,
      cdr.timeEnd,
      cdr.duration,
      cdr.success ? "Succès" : "Échec",
      cdr.srcPrefixIn,
      cdr.dstPrefixIn,
      cdr.customerPrice,
      cdr.legaDisconnectCode,
      cdr.authOrigIp,
      cdr.authOrigPort,
    ]);

    const csvContent = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `CDR_export_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
    link.click();
    toast.success("Export CSV réussi");
  };

  const exportToXLS = () => {
    const headers = [
      "ID",
      "Date/Heure début",
      "Date/Heure fin",
      "Durée (s)",
      "Statut",
      "Source",
      "Destination",
      "Prix",
      "Code déconnexion",
      "IP origine",
      "Port origine",
    ];

    const rows = filteredCdrs.map((cdr) => [
      cdr.id,
      cdr.timeStart,
      cdr.timeEnd,
      cdr.duration,
      cdr.success ? "Succès" : "Échec",
      cdr.srcPrefixIn,
      cdr.dstPrefixIn,
      cdr.customerPrice,
      cdr.legaDisconnectCode,
      cdr.authOrigIp,
      cdr.authOrigPort,
    ]);

    // Generate HTML table for Excel compatibility
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1">
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `CDR_export_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xls`;
    link.click();
    toast.success("Export XLS réussi");
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CDR - Journal des appels</h1>
          <p className="text-muted-foreground">
            Consultez et exportez l'historique détaillé des appels
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[180px] justify-start">
                <Calendar className="w-4 h-4" />
                {periodOptions.find((p) => p.value === period)?.label}
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
                  <span>Du</span>
                  <span>→</span>
                  <span>Au</span>
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
                        onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
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
                        onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    size="sm"
                    onClick={() => {
                      setPeriod("custom");
                      setCurrentPage(1);
                      fetchCDRs();
                    }}
                  >
                    Ok
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
                <FileText className="w-4 h-4" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToXLS} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" />
                Export XLS
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
          <Button variant="outline" size="icon" onClick={fetchCDRs} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par source, destination, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {totalCount} appels au total
          </span>
        </div>
      </div>

      {/* CDR Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>IP Origine</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredCdrs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucun CDR trouvé pour cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCdrs.map((cdr) => (
                    <TableRow key={cdr.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(cdr.timeStart)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{cdr.srcPrefixIn || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{cdr.dstPrefixIn || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDuration(cdr.duration)}</TableCell>
                      <TableCell>
                        <Badge variant={cdr.success ? "default" : "destructive"} className="text-xs">
                          {cdr.success ? "Succès" : "Échec"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{cdr.legaDisconnectCode}</TableCell>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        {cdr.authOrigIp}:{cdr.authOrigPort}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(cdr.customerPrice)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CDR;
