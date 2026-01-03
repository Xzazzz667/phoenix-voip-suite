import { useState, useEffect, useMemo } from "react";
import { Phone, Search, ShoppingCart, RefreshCw, Download } from "lucide-react";
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

interface PhoneNumber {
  id: string;
  numero: string;
  prefix: string;
  region: string;
}

const getRegionFromPrefix = (numero: string): { prefix: string; region: string } => {
  const prefixMap: Record<string, string> = {
    "331": "Île-de-France",
    "332": "Nord-Ouest",
    "333": "Nord-Est",
    "334": "Sud-Est",
    "335": "Sud-Ouest",
    "336": "Mobile",
    "337": "Mobile",
    "338": "Services",
    "339": "Services",
  };
  
  const prefix = numero.substring(0, 3);
  return {
    prefix,
    region: prefixMap[prefix] || "France"
  };
};

const formatPhoneNumber = (numero: string): string => {
  // Format: +33 X XX XX XX XX
  if (numero.startsWith("33")) {
    const withPlus = "+" + numero;
    return withPlus.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5 $6");
  }
  return numero;
};

const OrderNumber = () => {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchNumbers = async () => {
      try {
        const response = await fetch("/data/liste-numeros.csv");
        const text = await response.text();
        const lines = text.split("\n").slice(1); // Skip header
        
        const parsedNumbers: PhoneNumber[] = lines
          .filter(line => line.trim())
          .map((line, index) => {
            const parts = line.split(";");
            const numero = parts[1]?.trim() || "";
            const { prefix, region } = getRegionFromPrefix(numero);
            return {
              id: `num-${index}`,
              numero,
              prefix,
              region,
            };
          })
          .filter(n => n.numero);

        setNumbers(parsedNumbers);
      } catch (error) {
        console.error("Error loading numbers:", error);
        toast.error("Erreur lors du chargement des numéros");
      } finally {
        setLoading(false);
      }
    };

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

  const handleOrder = () => {
    if (selectedNumbers.size === 0) {
      toast.error("Veuillez sélectionner au moins un numéro");
      return;
    }
    
    const selectedList = numbers.filter(n => selectedNumbers.has(n.id));
    toast.success(`Commande de ${selectedNumbers.size} numéro(s) en cours de traitement`, {
      description: selectedList.slice(0, 3).map(n => formatPhoneNumber(n.numero)).join(", ") + 
        (selectedList.length > 3 ? "..." : ""),
    });
    setSelectedNumbers(new Set());
  };

  const handleRefresh = () => {
    setLoading(true);
    setSelectedNumbers(new Set());
    setTimeout(() => setLoading(false), 500);
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
            variant="default" 
            onClick={handleOrder}
            disabled={selectedNumbers.size === 0}
            className="gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Commander les SDA
            {selectedNumbers.size > 0 && (
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
