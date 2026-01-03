import { useState, useEffect, useMemo } from "react";
import { Phone, Search, ShoppingCart, RefreshCw, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PhoneNumber {
  id: string;
  numero: string;
  prefix: string;
  region: string;
  type: string;
  status: string;
  price: number;
}

const formatPhoneNumber = (numero: string): string => {
  if (numero.startsWith("33")) {
    const withPlus = "+" + numero;
    return withPlus.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5 $6");
  }
  return numero;
};

const OrderNumber = () => {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("available_numbers")
        .select("*")
        .eq("status", "available")
        .order("numero");

      if (error) throw error;

      setNumbers(data?.map(n => ({
        id: n.id,
        numero: n.numero,
        prefix: n.prefix,
        region: n.region,
        type: n.type,
        status: n.status,
        price: Number(n.price) || 0
      })) || []);
    } catch (error) {
      console.error("Error fetching numbers:", error);
      toast.error("Erreur lors du chargement des numéros");
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async () => {
    setImporting(true);
    try {
      const response = await fetch("/data/liste-numeros.csv");
      const csvData = await response.text();

      const { data, error } = await supabase.functions.invoke("import-numbers", {
        body: { csvData }
      });

      if (error) throw error;

      toast.success(data.message);
      fetchNumbers();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erreur lors de l'import des numéros");
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const regions = useMemo(() => {
    const uniqueRegions = [...new Set(numbers.map(n => n.region))];
    return uniqueRegions.sort();
  }, [numbers]);

  const filteredNumbers = useMemo(() => {
    return numbers.filter(n => {
      const matchesSearch = n.numero.includes(searchQuery.replace(/\s/g, ""));
      const matchesRegion = selectedRegion === "all" || n.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [numbers, searchQuery, selectedRegion]);

  const paginatedNumbers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNumbers.slice(start, start + itemsPerPage);
  }, [filteredNumbers, currentPage]);

  const totalPages = Math.ceil(filteredNumbers.length / itemsPerPage);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedNumbers);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedNumbers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedNumbers.size === paginatedNumbers.length) {
      setSelectedNumbers(new Set());
    } else {
      setSelectedNumbers(new Set(paginatedNumbers.map(n => n.id)));
    }
  };

  const [ordering, setOrdering] = useState(false);

  const handleOrder = async () => {
    if (selectedNumbers.size === 0) {
      toast.error("Veuillez sélectionner au moins un numéro");
      return;
    }
    
    setOrdering(true);
    const selectedList = numbers.filter(n => selectedNumbers.has(n.id));
    
    try {
      const { data, error } = await supabase.functions.invoke("send-order-email", {
        body: {
          numbers: selectedList.map(n => ({
            id: n.id,
            numero: n.numero,
            prefix: n.prefix,
            region: n.region
          })),
          orderedBy: "Utilisateur connecté"
        }
      });

      if (error) throw error;

      toast.success(`Commande de ${selectedNumbers.size} numéro(s) envoyée`, {
        description: "Un email a été envoyé à l'administrateur pour traitement",
      });
      
      // Remove ordered numbers from the list
      setNumbers(prev => prev.filter(n => !selectedNumbers.has(n.id)));
      setSelectedNumbers(new Set());
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Erreur lors de la commande", {
        description: "Veuillez réessayer"
      });
    } finally {
      setOrdering(false);
    }
  };

  const handleRefresh = () => {
    setSelectedNumbers(new Set());
    fetchNumbers();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commande de numéros</h1>
          <p className="text-muted-foreground">
            Sélectionnez et commandez des numéros SDA disponibles
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleImportCSV}
            disabled={importing}
            className="gap-2"
          >
            <Upload className={`w-4 h-4 ${importing ? "animate-spin" : ""}`} />
            Importer CSV
          </Button>
          <Button
            variant="default" 
            onClick={handleOrder}
            disabled={selectedNumbers.size === 0 || ordering}
            className="gap-2"
          >
            <ShoppingCart className={`w-4 h-4 ${ordering ? "animate-spin" : ""}`} />
            {ordering ? "Commande en cours..." : "Commander les SDA"}
            {selectedNumbers.size > 0 && !ordering && (
              <Badge variant="secondary" className="ml-1">
                {selectedNumbers.size}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un numéro..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Select 
              value={selectedRegion} 
              onValueChange={(value) => {
                setSelectedRegion(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Région" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les régions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Numéros disponibles
            <Badge variant="outline" className="ml-2">
              {filteredNumbers.length} numéros
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredNumbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Phone className="w-12 h-12 mb-4 opacity-50" />
              <p>Aucun numéro trouvé</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedNumbers.size === paginatedNumbers.length && paginatedNumbers.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Préfixe</TableHead>
                      <TableHead>Région</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedNumbers.map((number) => (
                      <TableRow 
                        key={number.id}
                        className={selectedNumbers.has(number.id) ? "bg-primary/5" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedNumbers.has(number.id)}
                            onCheckedChange={() => toggleSelection(number.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {formatPhoneNumber(number.numero)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">+{number.prefix}</Badge>
                        </TableCell>
                        <TableCell>{number.region}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">SDA</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={selectedNumbers.has(number.id) ? "secondary" : "default"}
                            onClick={() => toggleSelection(number.id)}
                          >
                            {selectedNumbers.has(number.id) ? "Retirer" : "Sélectionner"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderNumber;
