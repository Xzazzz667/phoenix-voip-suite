import React, { useState, useEffect } from 'react';
import { useYetiApi } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Phone, DollarSign, AlertCircle, Info, Globe, List, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface RateItem {
  id: string;
  prefix: string;
  initial_rate: string;
  initial_interval: number;
  next_rate: string;
  next_interval: number;
  connect_fee: string;
  reject_calls: boolean;
  valid_from?: string;
  valid_till?: string;
  network_prefix_id?: number;
  routing_tag_names?: string[];
}

interface FullRateItem {
  id: string;
  type: string;
  attributes: {
    prefix: string;
    'dst-number-min-length': number;
    'dst-number-max-length': number;
    enabled: boolean;
    'reject-calls': boolean;
    'initial-rate': string;
    'initial-interval': number;
    'next-rate': string;
    'next-interval': number;
    'connect-fee': string;
    'valid-from': string;
    'valid-till': string;
    'network-prefix-id': number;
  };
}

interface Country {
  id: string;
  type: string;
  attributes: {
    name: string;
    iso2: string;
  };
}

interface Rateplan {
  id: string;
  type: string;
  attributes: {
    name: string;
  };
}

const Pricing: React.FC = () => {
  const { callApi } = useYetiApi();
  
  // Check rate state
  const [calledNumber, setCalledNumber] = useState('');
  const [rateplanId, setRateplanId] = useState('');
  const [isCheckingRate, setIsCheckingRate] = useState(false);
  const [checkRates, setCheckRates] = useState<RateItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [searchedNumber, setSearchedNumber] = useState('');
  
  // Rateplans state
  const [rateplans, setRateplans] = useState<Rateplan[]>([]);
  const [isLoadingRateplans, setIsLoadingRateplans] = useState(false);
  
  // Full rates list state
  const [fullRates, setFullRates] = useState<FullRateItem[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [prefixFilter, setPrefixFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRates, setTotalRates] = useState(0);
  const pageSize = 50;

  // Load countries and rateplans on mount
  useEffect(() => {
    loadCountries();
    loadRateplans();
  }, []);

  const loadRateplans = async () => {
    setIsLoadingRateplans(true);
    try {
      const response = await callApi('/rateplans', 'GET');
      if (response?.data) {
        setRateplans(response.data);
      } else {
        // API returned null (403) or no data
        setRateplans([]);
      }
    } catch (err) {
      console.error('Error loading rateplans:', err);
      setRateplans([]);
    } finally {
      setIsLoadingRateplans(false);
    }
  };

  const loadCountries = async () => {
    setIsLoadingCountries(true);
    try {
      const response = await callApi('/countries?page[size]=300', 'GET');
      if (response?.data) {
        setCountries(response.data);
      } else {
        // API returned null (403) or no data
        setCountries([]);
      }
    } catch (err) {
      console.error('Error loading countries:', err);
      setCountries([]);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const loadRates = async (page: number = 1, prefix?: string) => {
    setIsLoadingRates(true);
    setRatesError(null);
    
    try {
      // Note: L'API /rates ne supporte pas le filtrage par rateplan
      // Le sélecteur de rateplan dans cette section est informatif uniquement
      let endpoint = `/rates?page[size]=${pageSize}&page[number]=${page}`;
      
      if (prefix && prefix.trim()) {
        endpoint += `&filter[prefix-start]=${encodeURIComponent(prefix.trim())}`;
      }
      
      const response = await callApi(endpoint, 'GET');
      
      // Check if response indicates an error
      if (response && response.errors) {
        const errorMsg = response.errors[0]?.detail || response.errors[0]?.title || 'Erreur API';
        throw new Error(errorMsg);
      }
      
      if (response && response.data) {
        setFullRates(response.data);
        setTotalRates(response.meta?.['total-count'] || response.data.length);
        setCurrentPage(page);
      } else {
        setFullRates([]);
        setTotalRates(0);
      }
    } catch (err) {
      console.error('Error loading rates:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des tarifs';
      setRatesError(errorMessage);
      setFullRates([]);
    } finally {
      setIsLoadingRates(false);
    }
  };

  const handleCheckRate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!calledNumber.trim()) {
      toast.error('Veuillez entrer un numéro à vérifier');
      return;
    }

    setIsCheckingRate(true);
    setCheckError(null);
    setHasSearched(true);
    setSearchedNumber(calledNumber.trim());

    try {
      const requestData = {
        data: {
          type: 'check-rates',
          attributes: {
            number: calledNumber.trim(),
            ...(rateplanId.trim() && { 'rateplan-id': rateplanId.trim() })
          }
        }
      };

      const response = await callApi('/check-rate', 'POST', requestData);
      
      if (response && response.data && response.data.attributes && response.data.attributes.rates) {
        const ratesData = response.data.attributes.rates;
        setCheckRates(ratesData);
        
        if (ratesData.length === 0) {
          toast.info('Aucun tarif trouvé pour ce numéro');
        } else {
          toast.success(`${ratesData.length} tarif(s) trouvé(s)`);
        }
      } else {
        setCheckRates([]);
        toast.info('Aucun tarif trouvé pour ce numéro');
      }
    } catch (err) {
      console.error('Error checking rate:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification du tarif';
      setCheckError(errorMessage);
      toast.error('Erreur lors de la vérification du tarif');
      setCheckRates([]);
    } finally {
      setIsCheckingRate(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(num);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return '-';
    }
  };

  const clearCheckSearch = () => {
    setCalledNumber('');
    setRateplanId('');
    setCheckRates([]);
    setHasSearched(false);
    setCheckError(null);
    setSearchedNumber('');
  };

  const handlePrefixSearch = () => {
    loadRates(1, prefixFilter);
  };

  const exportRatesToCSV = () => {
    if (fullRates.length === 0) {
      toast.error('Aucun tarif à exporter');
      return;
    }

    const headers = ['Préfixe', 'Tarif Initial (€)', 'Intervalle Initial (s)', 'Tarif Suivant (€)', 'Intervalle Suivant (s)', 'Frais Connexion (€)', 'Valide du', 'Valide jusqu\'au', 'Actif'];
    
    const rows = fullRates.map(rate => [
      rate.attributes.prefix,
      rate.attributes['initial-rate'],
      rate.attributes['initial-interval'],
      rate.attributes['next-rate'],
      rate.attributes['next-interval'],
      rate.attributes['connect-fee'],
      formatDate(rate.attributes['valid-from']),
      formatDate(rate.attributes['valid-till']),
      rate.attributes.enabled ? 'Oui' : 'Non'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tarifs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Export CSV téléchargé');
  };

  const totalPages = Math.ceil(totalRates / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tarifs</h1>
        <p className="text-muted-foreground mt-1">
          Consultez les tarifs d'appel en fonction de la destination
        </p>
      </div>

      <Tabs defaultValue="check" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="check" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Vérifier un tarif
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Liste des tarifs
          </TabsTrigger>
        </TabsList>

        {/* Tab: Check Rate */}
        <TabsContent value="check" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Vérifier un tarif
              </CardTitle>
              <CardDescription>
                Entrez un numéro de destination pour connaître le tarif applicable
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckRate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="calledNumber">Numéro de destination *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="calledNumber"
                        type="tel"
                        placeholder="Ex: 33164789654"
                        value={calledNumber}
                        onChange={(e) => setCalledNumber(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Format international sans le +
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rateplanId">Rateplan (optionnel)</Label>
                    <div className="flex gap-2">
                      <Select value={rateplanId || "__default__"} onValueChange={(val) => setRateplanId(val === "__default__" ? "" : val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={isLoadingRateplans ? "Chargement..." : "Rateplan par défaut"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">Rateplan par défaut</SelectItem>
                          {rateplans.map((rateplan) => (
                            <SelectItem key={rateplan.id} value={rateplan.id}>
                              {rateplan.attributes.name} (ID: {rateplan.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={loadRateplans}
                        disabled={isLoadingRateplans}
                        title="Rafraîchir les rateplans"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingRateplans ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sélectionnez un rateplan pour ce compte
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={isCheckingRate}>
                    {isCheckingRate ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Recherche...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Vérifier le tarif
                      </>
                    )}
                  </Button>
                  
                  {hasSearched && (
                    <Button type="button" variant="outline" onClick={clearCheckSearch}>
                      Effacer
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Check Rate Error */}
          {checkError && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>{checkError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Check Rate Results */}
          {hasSearched && !checkError && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Résultats
                  {checkRates.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {checkRates.length} tarif(s)
                    </Badge>
                  )}
                </CardTitle>
                {searchedNumber && (
                  <CardDescription>
                    Tarifs pour le numéro : <span className="font-mono font-medium">{searchedNumber}</span>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {isCheckingRate ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : checkRates.length === 0 ? (
                  <div className="text-center py-12">
                    <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun tarif trouvé pour ce numéro</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vérifiez le format du numéro (international sans le +)
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Préfixe</TableHead>
                          <TableHead className="text-right">Tarif initial</TableHead>
                          <TableHead className="text-right">Intervalle (s)</TableHead>
                          <TableHead className="text-right">Tarif suivant</TableHead>
                          <TableHead className="text-right">Intervalle (s)</TableHead>
                          <TableHead className="text-right">Frais connexion</TableHead>
                          <TableHead>Tags</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {checkRates.map((rate, index) => (
                          <TableRow key={rate.id || index}>
                            <TableCell className="font-mono font-medium">
                              {rate.prefix || '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary">
                              {formatCurrency(rate.initial_rate || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {rate.initial_interval || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(rate.next_rate || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {rate.next_interval || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(rate.connect_fee || 0)}
                            </TableCell>
                            <TableCell>
                              {rate.routing_tag_names && rate.routing_tag_names.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {rate.routing_tag_names.map((tag, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help Card */}
          {!hasSearched && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Comment ça marche ?</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Entrez le numéro de destination au format international (sans le +)</li>
                      <li>• Optionnellement, spécifiez un rateplan ID</li>
                      <li>• Le système affichera les tarifs applicables à cet appel</li>
                      <li>• Les tarifs sont affichés en €/minute avec les frais de connexion</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Full Rates List */}
        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Liste complète des tarifs
                  </CardTitle>
                  <CardDescription>
                    Parcourez tous les tarifs par préfixe pays
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => loadRates(1, prefixFilter)}
                    disabled={isLoadingRates}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingRates ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={exportRatesToCSV}
                    disabled={fullRates.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search by prefix */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="prefixFilter" className="sr-only">Filtrer par préfixe</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="prefixFilter"
                      placeholder="Filtrer par préfixe (ex: 33 pour France)"
                      value={prefixFilter}
                      onChange={(e) => setPrefixFilter(e.target.value)}
                      className="pl-10"
                      onKeyDown={(e) => e.key === 'Enter' && handlePrefixSearch()}
                    />
                  </div>
                </div>
                <Button onClick={handlePrefixSearch} disabled={isLoadingRates}>
                  {isLoadingRates ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Rechercher
                    </>
                  )}
                </Button>
              </div>

              {/* Countries quick filter */}
              {countries.length > 0 && (
                <div className="space-y-2">
                  <Label>Préfixes pays courants</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'France', prefix: '33' },
                      { name: 'Belgique', prefix: '32' },
                      { name: 'Suisse', prefix: '41' },
                      { name: 'Canada', prefix: '1' },
                      { name: 'USA', prefix: '1' },
                      { name: 'UK', prefix: '44' },
                      { name: 'Allemagne', prefix: '49' },
                      { name: 'Espagne', prefix: '34' },
                      { name: 'Italie', prefix: '39' },
                      { name: 'Maroc', prefix: '212' },
                    ].map((country) => (
                      <Button
                        key={country.prefix + country.name}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPrefixFilter(country.prefix);
                          loadRates(1, country.prefix);
                        }}
                        className="text-xs"
                      >
                        {country.name} (+{country.prefix})
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {ratesError && (
                <div className="flex items-center gap-2 text-destructive p-4 border border-destructive rounded-md">
                  <AlertCircle className="h-5 w-5" />
                  <span>{ratesError}</span>
                </div>
              )}

              {/* Results */}
              {isLoadingRates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : fullRates.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Cliquez sur "Rechercher" pour charger les tarifs</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ou sélectionnez un pays ci-dessus
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{totalRates} tarif(s) trouvé(s)</span>
                    <span>Page {currentPage} / {totalPages}</span>
                  </div>
                  
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Préfixe</TableHead>
                          <TableHead className="text-right">Tarif initial (€/min)</TableHead>
                          <TableHead className="text-right">Intervalle (s)</TableHead>
                          <TableHead className="text-right">Tarif suivant (€/min)</TableHead>
                          <TableHead className="text-right">Intervalle (s)</TableHead>
                          <TableHead className="text-right">Frais connexion</TableHead>
                          <TableHead>Valide du</TableHead>
                          <TableHead>Valide jusqu'au</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fullRates.map((rate) => (
                          <TableRow key={rate.id}>
                            <TableCell className="font-mono font-medium">
                              +{rate.attributes.prefix}
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary">
                              {formatCurrency(rate.attributes['initial-rate'] || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {rate.attributes['initial-interval'] || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(rate.attributes['next-rate'] || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {rate.attributes['next-interval'] || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(rate.attributes['connect-fee'] || 0)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(rate.attributes['valid-from'])}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(rate.attributes['valid-till'])}
                            </TableCell>
                            <TableCell>
                              {rate.attributes['reject-calls'] ? (
                                <Badge variant="destructive">Bloqué</Badge>
                              ) : rate.attributes.enabled ? (
                                <Badge variant="default" className="bg-green-500">Actif</Badge>
                              ) : (
                                <Badge variant="secondary">Inactif</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadRates(currentPage - 1, prefixFilter)}
                        disabled={currentPage <= 1 || isLoadingRates}
                      >
                        Précédent
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} sur {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadRates(currentPage + 1, prefixFilter)}
                        disabled={currentPage >= totalPages || isLoadingRates}
                      >
                        Suivant
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Pricing;
