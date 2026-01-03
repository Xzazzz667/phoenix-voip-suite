import { useState } from "react"
import { 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  User, 
  CreditCard,
  Globe,
  Menu,
  RefreshCw
} from "lucide-react"
import { useYetiAccount } from "@/hooks/useYetiAccount"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")
  const { balance, currency, isLoading, refetch } = useYetiAccount()
  const { username, logout } = useAuth()
  
  const formatBalance = (value: number, curr: string) => {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value) + ' ' + curr
  }

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-50 backdrop-blur-sm">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Balance */}
        <div className="hidden sm:flex items-center gap-2 bg-turquoise/10 text-turquoise border border-turquoise/20 px-4 py-2 rounded-full">
          <CreditCard className="w-4 h-4" />
          <span className="font-semibold">
            {isLoading ? 'Chargement...' : `Balance: ${formatBalance(balance, currency)}`}
          </span>
          <button 
            onClick={refetch} 
            className="ml-1 hover:opacity-70 transition-opacity"
            title="Rafraîchir le solde"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <div className="w-5 h-4 rounded-sm overflow-hidden">
                <div className="w-full h-1/3 bg-blue-500"></div>
                <div className="w-full h-1/3 bg-white"></div>
                <div className="w-full h-1/3 bg-red-500"></div>
              </div>
              <span className="hidden sm:inline">FR</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem className="flex items-center gap-2">
              <div className="w-5 h-4 rounded-sm overflow-hidden">
                <div className="w-full h-1/3 bg-blue-500"></div>
                <div className="w-full h-1/3 bg-white"></div>
                <div className="w-full h-1/3 bg-red-500"></div>
              </div>
              Français
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <div className="w-5 h-4 rounded-sm overflow-hidden">
                <div className="w-full h-1/2 bg-red-500"></div>
                <div className="w-full h-1/2 bg-white"></div>
              </div>
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground">
            3
          </Badge>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-3 py-2 h-auto">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">
                  {username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium">{username || 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground">Client</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">
                  {username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{username || 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground">Client Yeti-Switch</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Facturation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="flex items-center gap-2 text-destructive focus:text-destructive"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}