import React, { useState } from 'react';
import { useYetiApi } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Phone, DollarSign, Clock, AlertCircle, Info } from 'lucide-react';
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

interface CheckRateResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      'rateplan-id': string;
      number: string;
      rates: RateItem[];
    };
  };
}

const Pricing: React.FC = () => {
  const { callApi } = useYetiApi();
  const [calledNumber, setCalledNumber] = useState('');
  const [rateplanId, setRateplanId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rates, setRates] = useState<RateItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedNumber, setSearchedNumber] = useState('');

  const handleCheckRate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!calledNumber.trim()) {
      toast.error('Veuillez entrer un numéro à vérifier');
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSearchedNumber(calledNumber.trim());

    try {
      // Build the JSON:API request body for check-rate
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
        setRates(ratesData);
        
        if (ratesData.length === 0) {
          toast.info('Aucun tarif trouvé pour ce numéro');
        } else {
          toast.success(`${ratesData.length} tarif(s) trouvé(s)`);
        }
      } else {
        setRates([]);
        toast.info('Aucun tarif trouvé pour ce numéro');
      }
    } catch (err) {
      console.error('Error checking rate:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification du tarif';
      setError(errorMessage);
      toast.error('Erreur lors de la vérification du tarif');
      setRates([]);
    } finally {
      setIsLoading(false);
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

  const clearSearch = () => {
    setCalledNumber('');
    setRateplanId('');
    setRates([]);
    setHasSearched(false);
    setError(null);
    setSearchedNumber('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tarifs</h1>
        <p className="text-muted-foreground mt-1">
          Consultez les tarifs d'appel en fonction de la destination
        </p>
      </div>

      {/* Check Rate Form */}
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
                <Label htmlFor="rateplanId">ID du Rateplan (optionnel)</Label>
                <div className="relative">
                  <Info className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="rateplanId"
                    type="text"
                    placeholder="Laisser vide pour le rateplan par défaut"
                    value={rateplanId}
                    onChange={(e) => setRateplanId(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Spécifiez un rateplan ID si nécessaire
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
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
                <Button type="button" variant="outline" onClick={clearSearch}>
                  Effacer
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasSearched && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Résultats
              {rates.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {rates.length} tarif(s)
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
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : rates.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun tarif trouvé pour ce numéro</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vérifiez le format du numéro (international sans le +)
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Préfixe</TableHead>
                      <TableHead className="text-right">Tarif initial</TableHead>
                      <TableHead className="text-right">Intervalle initial (s)</TableHead>
                      <TableHead className="text-right">Tarif suivant</TableHead>
                      <TableHead className="text-right">Intervalle suivant (s)</TableHead>
                      <TableHead className="text-right">Frais connexion</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((rate, index) => (
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
                  <li>• Optionnellement, ajoutez le numéro appelant pour un tarif plus précis</li>
                  <li>• Le système affichera les tarifs applicables à cet appel</li>
                  <li>• Les tarifs sont affichés en €/minute avec les frais de connexion</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Pricing;
