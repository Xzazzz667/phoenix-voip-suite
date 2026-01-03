import { useState } from "react"
import { 
  Settings, 
  CreditCard, 
  BarChart3, 
  Puzzle, 
  Megaphone,
  Home,
  Users,
  Phone,
  List,
  TrendingUp,
  FileText,
  ChevronRight,
  ShoppingCart,
  Shield
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import logo from "@/assets/logo.png"

const menuItems = [
  {
    title: "Tableau de bord",
    url: "/",
    icon: Home,
    badge: null
  },
  {
    title: "Commande numéro",
    url: "/order-number",
    icon: ShoppingCart,
    badge: null
  },
  {
    title: "Configuration",
    icon: Settings,
    items: [
      { title: "Mon compte", url: "/configuration/account", icon: Users },
      { title: "Autorisation numéros", url: "/configuration/authorizations", icon: Shield },
      { title: "Trunks", url: "/configuration/trunks", icon: Phone },
      { title: "Utilisateurs", url: "/configuration/users", icon: Users },
    ]
  },
  {
    title: "Finances",
    icon: CreditCard,
    items: [
      { title: "Recharger mon compte", url: "/finances/recharge", icon: CreditCard },
      { title: "Historique des recharges", url: "/finances/history", icon: FileText },
      { title: "Liste de prix", url: "/finances/pricing", icon: List },
    ]
  },
  {
    title: "Rapport",
    icon: BarChart3,
    items: [
      { title: "Appels sortants", url: "/rapport/outbound", icon: TrendingUp },
      { title: "Appels entrants", url: "/rapport/inbound", icon: TrendingUp },
      { title: "Statistiques", url: "/rapport/statistics", icon: BarChart3 },
    ]
  },
  {
    title: "Campagnes",
    url: "/campagnes",
    icon: Megaphone,
    badge: "2"
  },
  {
    title: "Plugins",
    url: "/plugins",
    icon: Puzzle,
    badge: null
  }
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Configuration'])
  const collapsed = state === 'collapsed'

  const isActive = (path: string) => currentPath === path
  const isGroupActive = (items: any[]) => items?.some(item => isActive(item.url))

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) 
        ? prev.filter(g => g !== title)
        : [...prev, title]
    )
  }

  const getNavClasses = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative",
      isActive 
        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25" 
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    )

  return (
    <Sidebar className={cn("border-r border-sidebar-border", collapsed ? "w-16" : "w-64")} collapsible="icon">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
          <img src={logo} alt="DATA VOIP SOLUTIONS" className="w-10 h-10 rounded-lg object-cover" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-accent-foreground leading-tight">DATA VOIP SOLUTIONS</span>
              <span className="text-xs text-sidebar-foreground opacity-70">VoIP Management</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 space-y-2">
          {menuItems.map((item) => (
            <div key={item.title}>
              {item.items ? (
                // Groupe avec sous-éléments
                <div>
                  <button
                    onClick={() => toggleGroup(item.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-3 rounded-lg transition-all duration-200",
                      isGroupActive(item.items)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronRight 
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          expandedGroups.includes(item.title) && "rotate-90"
                        )} 
                      />
                    )}
                  </button>
                  
                  {!collapsed && expandedGroups.includes(item.title) && (
                    <div className="ml-4 mt-2 space-y-1 animate-slide-up">
                      {item.items.map((subItem) => (
                        <NavLink
                          key={subItem.url}
                          to={subItem.url}
                          className={({ isActive }) => getNavClasses(isActive)}
                        >
                          <subItem.icon className="w-4 h-4" />
                          <span className="text-sm">{subItem.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Élément direct
                <NavLink
                  to={item.url!}
                  className={({ isActive }) => getNavClasses(isActive)}
                >
                  <item.icon className="w-5 h-5" />
                  {!collapsed && (
                    <>
                      <span className="font-medium flex-1">{item.title}</span>
                      {item.badge && (
                        <span className="bg-turquoise text-turquoise-foreground text-xs px-2 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">X</span>
            </div>
            {!collapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium text-sidebar-accent-foreground">Xavier Limoges</p>
                <p className="text-xs text-sidebar-foreground opacity-70">En ligne</p>
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}