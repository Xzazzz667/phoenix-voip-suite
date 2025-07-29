import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Mail, User, Building, MapPin, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

export function SignupForm() {
  const [formData, setFormData] = useState({
    company: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.company.trim()) newErrors.company = "Le nom de société est requis"
    if (!formData.firstName.trim()) newErrors.firstName = "Le prénom est requis"
    if (!formData.lastName.trim()) newErrors.lastName = "Le nom est requis"
    if (!formData.email.trim()) newErrors.email = "L'email est requis"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Format d'email invalide"
    if (!formData.phone.trim()) newErrors.phone = "Le téléphone est requis"
    if (!formData.password) newErrors.password = "Le mot de passe est requis"
    else if (formData.password.length < 8) newErrors.password = "Au moins 8 caractères requis"
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas"
    }
    if (!formData.acceptTerms) newErrors.acceptTerms = "Vous devez accepter les conditions"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log("Form submitted:", formData)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-turquoise/10 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <div className="w-12 h-12 bg-gradient-to-br from-turquoise to-primary rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">PLUG&TEL</h1>
                <p className="text-sm text-muted-foreground">Opérateur VoIP & Intégrateur</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  Essayez
                  <br />
                  <span className="text-turquoise">Maintenant</span>
                  <br />
                  <span className="text-muted-foreground font-normal text-2xl">Sans engagement</span>
                </h2>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-turquoise/20 rounded-full flex items-center justify-center">
                    <span className="text-turquoise font-bold text-sm">✓</span>
                  </div>
                  <span className="text-foreground">Activer votre ligne instantanément</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-turquoise/20 rounded-full flex items-center justify-center">
                    <span className="text-turquoise font-bold text-sm">✓</span>
                  </div>
                  <span className="text-foreground">Appels illimités vers France fixe et mobile</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-turquoise/20 rounded-full flex items-center justify-center">
                    <span className="text-turquoise font-bold text-sm">✓</span>
                  </div>
                  <span className="text-foreground">Statistiques avancées en temps réel</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-turquoise/20 rounded-full flex items-center justify-center">
                    <span className="text-turquoise font-bold text-sm">✓</span>
                  </div>
                  <span className="text-foreground">Téléphonie, SMS, CRM</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-turquoise/20 rounded-full flex items-center justify-center">
                    <span className="text-turquoise font-bold text-sm">✓</span>
                  </div>
                  <span className="text-foreground">Applications Web et Mobile</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <Card className="w-full max-w-md mx-auto glass shadow-xl animate-scale-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-turquoise">
              Démarrez votre essai
            </CardTitle>
            <CardDescription className="text-lg font-semibold text-foreground">
              gratuit sans engagement !
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company */}
              <div className="space-y-2">
                <Label htmlFor="company" className="flex items-center gap-2 text-foreground font-medium">
                  <Building className="w-4 h-4" />
                  Société *
                </Label>
                <Input
                  id="company"
                  placeholder="Entrez le nom de votre société"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className={cn(errors.company && "border-destructive")}
                />
                {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-foreground font-medium">Nom *</Label>
                  <Input
                    id="lastName"
                    placeholder="Entrez votre nom"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className={cn(errors.lastName && "border-destructive")}
                  />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-foreground font-medium">Prénom *</Label>
                  <Input
                    id="firstName"
                    placeholder="Entrez votre prénom"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className={cn(errors.firstName && "border-destructive")}
                  />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-foreground font-medium">
                  <Mail className="w-4 h-4" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Entrez votre email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={cn(errors.email && "border-destructive")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-foreground font-medium">
                  <Phone className="w-4 h-4" />
                  Téléphone *
                </Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                    <div className="w-5 h-4 rounded-sm overflow-hidden mr-2">
                      <div className="w-full h-1/3 bg-blue-500"></div>
                      <div className="w-full h-1/3 bg-white"></div>
                      <div className="w-full h-1/3 bg-red-500"></div>
                    </div>
                    <span className="text-sm">+33</span>
                  </div>
                  <Input
                    id="phone"
                    placeholder="6 12 34 56 78"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={cn("rounded-l-none", errors.phone && "border-destructive")}
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2 text-foreground font-medium">
                  <Lock className="w-4 h-4" />
                  Mot de passe *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Créez un mot de passe"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className={cn(errors.password && "border-destructive")}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                  Confirmer le mot de passe *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmez votre mot de passe"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className={cn(errors.confirmPassword && "border-destructive")}
                />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>

              {/* Terms */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => handleInputChange("acceptTerms", checked === true)}
                  className={cn(errors.acceptTerms && "border-destructive")}
                />
                <Label htmlFor="terms" className="text-sm text-foreground leading-relaxed">
                  J'ai lu et j'accepte la politique de{" "}
                  <a href="#" className="text-turquoise hover:underline font-medium">
                    Protection des données personnelles Plug & Tel
                  </a>
                </Label>
              </div>
              {errors.acceptTerms && <p className="text-xs text-destructive">{errors.acceptTerms}</p>}

              <p className="text-xs text-muted-foreground">*champs obligatoires</p>

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full btn-turquoise h-12 text-lg font-semibold hover-lift"
                disabled={isLoading}
              >
                {isLoading ? "Création en cours..." : "Essayez"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}