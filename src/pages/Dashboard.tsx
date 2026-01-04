import { StatsCard } from "@/components/dashboard/StatsCard"
import { DataTable } from "@/components/dashboard/DataTable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Phone, 
  TrendingUp, 
  Users, 
  CreditCard, 
  ArrowUpRight,
  Calendar,
  Clock,
  MapPin,
  Server,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import { useYetiAccount } from "@/hooks/useYetiAccount"
// Disabled: Admin API /nodes endpoint not available on this server
// import { useYetiAdminNodes } from "@/hooks/useYetiAdminNodes"

// Mock data
const recentCharges = [
  {
    id: "31",
    date: "2022-10-23 23:53:11",
    amount: 166.67,
    account: "Tenant: DVS CONNECT",
    comment: "Recharge manuelle",
    status: "Avancé"
  },
  {
    id: "32", 
    date: "2022-10-14 15:22:10",
    amount: 20.00,
    account: "Tenant: DVS CONNECT",
    comment: "Recharge manuelle",
    status: "Avancé"
  },
  {
    id: "33",
    date: "2022-10-14 15:26:10", 
    amount: -20.00,
    account: "Tenant: DVS CONNECT",
    comment: "Recharge manuelle",
    status: "Prépayé"
  }
]

const recentCampaigns = [
  {
    id: "camp01",
    name: "Campagne Marketing Q4",
    type: "Préfixe",
    detection: "33",
    antiSpam: "Identitaires",
    status: "Avancé",
    date: "2022-10-23 23:53:11"
  }
]

const chargeColumns = [
  { key: 'date', label: 'Date de recharge', sortable: true },
  { key: 'amount', label: 'Montant (€ HT)', sortable: true },
  { key: 'account', label: 'Compte', sortable: false },
  { key: 'comment', label: 'Commentaire', sortable: false }
]

const campaignColumns = [
  { key: 'name', label: 'Nom', sortable: true },
  { key: 'type', label: 'Type de Détection', sortable: true },
  { key: 'detection', label: 'Anti-démarchage', sortable: false },
  { key: 'status', label: 'AMD', sortable: true },
  { key: 'date', label: 'Date de création', sortable: true }
]

export default function Dashboard() {
  const { balance, currency, callsThisMonth, totalDuration, activeUsers, isLoading } = useYetiAccount()
  // Disabled: Admin API /nodes endpoint not available on this server
  // const { nodes, isLoading: nodesLoading, error: nodesError, refetch: refetchNodes } = useYetiAdminNodes()
  
  const formatBalance = (value: number, curr: string) => {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value) + ' ' + curr
  }
  
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue sur votre interface de gestion VoIP</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Dernière mise à jour: Aujourd'hui, 14:32</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Solde disponible"
          value={isLoading ? 'Chargement...' : formatBalance(balance, currency)}
          description="Synchronisé avec Yeti-Switch"
          icon={CreditCard}
          className="bg-gradient-to-br from-turquoise/10 to-primary/10 border-turquoise/20"
        />
        
        <StatsCard
          title="Appels ce mois"
          value={isLoading ? 'Chargement...' : formatNumber(callsThisMonth)}
          description={`Durée totale: ${totalDuration}`}
          icon={Phone}
          className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20"
        />
        
        <StatsCard
          title="Passerelles actives"
          value={isLoading ? 'Chargement...' : formatNumber(activeUsers)}
          description="Connexions d'origine"
          icon={Users}
          className="bg-gradient-to-br from-success/10 to-turquoise/10 border-success/20"
        />
        
        <StatsCard
          title="Taux de succès"
          value="98.2%"
          description="Qualité excellente"
          icon={TrendingUp}
          trend={{ value: 2.1, label: "vs mois dernier", isPositive: true }}
          className="bg-gradient-to-br from-warning/10 to-secondary/10 border-warning/20"
        />
      </div>

      {/* Quick Actions */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-turquoise" />
            Actions rapides
          </CardTitle>
          <CardDescription>
            Accédez rapidement aux fonctionnalités principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="btn-turquoise h-16 flex flex-col gap-2 hover-lift">
              <CreditCard className="w-6 h-6" />
              <span>Recharger</span>
            </Button>
            
            <Button variant="outline" className="h-16 flex flex-col gap-2 hover-lift">
              <Phone className="w-6 h-6" />
              <span>Nouvel appel</span>
            </Button>
            
            <Button variant="outline" className="h-16 flex flex-col gap-2 hover-lift">
              <Users className="w-6 h-6" />
              <span>Gérer utilisateurs</span>
            </Button>
            
            <Button variant="outline" className="h-16 flex flex-col gap-2 hover-lift">
              <TrendingUp className="w-6 h-6" />
              <span>Voir rapports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Charges */}
        <DataTable
          title="Historique des recharges récentes"
          data={recentCharges}
          columns={chargeColumns}
          pageSize={5}
          searchable={false}
          filterable={false}
          exportable={false}
        />

        {/* Recent Campaigns */}
        <DataTable
          title="Campagnes récentes"
          data={recentCampaigns}
          columns={campaignColumns}
          pageSize={5}
          searchable={false}
          filterable={false}
          exportable={false}
        />
      </div>

      {/* System Status - Disabled: Admin API not available
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-success" />
              État du système - Nodes actifs
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Section désactivée - API Admin non disponible</p>
        </CardContent>
      </Card>
      */}
    </div>
  )
}