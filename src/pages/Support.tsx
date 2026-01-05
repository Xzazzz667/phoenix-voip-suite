import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  HelpCircle, 
  Send, 
  MessageSquare, 
  Phone, 
  Mail, 
  BookOpen,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

const faqItems = [
  {
    question: "Comment configurer mon trunk SIP ?",
    answer: "Pour configurer votre trunk SIP, rendez-vous dans Configuration > Trunks. Cliquez sur 'Ajouter un trunk' et renseignez les informations de votre opérateur : adresse du serveur, port, identifiants d'authentification. Une fois enregistré, le trunk sera automatiquement testé."
  },
  {
    question: "Comment recharger mon compte ?",
    answer: "Accédez à Finances > Recharger mon compte. Vous pouvez recharger par carte bancaire, virement SEPA ou PayPal. Les recharges par carte sont créditées instantanément. Les virements peuvent prendre 1 à 3 jours ouvrés."
  },
  {
    question: "Comment obtenir un numéro de téléphone ?",
    answer: "Rendez-vous dans Commande numéro pour parcourir notre catalogue de numéros disponibles. Sélectionnez le pays, le type de numéro (géographique, mobile, ou numéro vert) et finalisez votre commande. L'activation est généralement immédiate."
  },
  {
    question: "Comment consulter mes CDR (relevés d'appels) ?",
    answer: "Les CDR sont accessibles dans Rapport > CDR. Vous pouvez filtrer par date, destination, ou statut d'appel. L'export CSV est disponible pour une analyse détaillée dans vos outils de reporting."
  },
  {
    question: "Quels sont les délais d'autorisation des numéros ?",
    answer: "Les demandes d'autorisation de numéros sont généralement traitées sous 24 à 48 heures ouvrées. Assurez-vous de fournir tous les documents requis (justificatif d'identité, justificatif de domicile) pour accélérer le processus."
  },
  {
    question: "Comment interpréter les statistiques de mes appels ?",
    answer: "Dans Rapport > Statistiques, vous trouverez des indicateurs clés comme l'ASR (taux de réponse), l'ACD (durée moyenne des appels), et le CPS (appels par seconde). Ces métriques vous aident à optimiser la qualité de vos communications."
  },
  {
    question: "Puis-je avoir plusieurs utilisateurs sur mon compte ?",
    answer: "Oui, rendez-vous dans Configuration > Utilisateurs pour ajouter des collaborateurs. Vous pouvez définir des rôles et permissions spécifiques pour chaque utilisateur (administrateur, opérateur, lecture seule)."
  },
  {
    question: "Comment contacter le support technique ?",
    answer: "Vous pouvez nous contacter via le formulaire ci-dessous, par email à support@datavoipsolutions.com, ou par téléphone au +33 1 XX XX XX XX. Notre équipe est disponible du lundi au vendredi, de 9h à 18h."
  }
];

export default function Support() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success("Votre message a été envoyé avec succès !");
    
    // Reset form after delay
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: "",
        email: "",
        subject: "",
        category: "",
        message: ""
      });
    }, 3000);
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
          <HelpCircle className="w-8 h-8 text-primary" />
          Support & Assistance
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Consultez notre FAQ ou contactez notre équipe pour toute question concernant nos services VoIP.
        </p>
      </div>

      {/* Quick Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <Phone className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Téléphone</h3>
            <p className="text-sm text-muted-foreground mt-1">+33 1 XX XX XX XX</p>
            <p className="text-xs text-muted-foreground">Lun-Ven, 9h-18h</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-turquoise/10 to-turquoise/5 border-turquoise/20">
          <CardContent className="p-6 text-center">
            <Mail className="w-10 h-10 text-turquoise mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Email</h3>
            <p className="text-sm text-muted-foreground mt-1">support@datavoipsolutions.com</p>
            <p className="text-xs text-muted-foreground">Réponse sous 24h</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-6 text-center">
            <BookOpen className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Documentation</h3>
            <p className="text-sm text-muted-foreground mt-1">docs.datavoipsolutions.com</p>
            <p className="text-xs text-muted-foreground">Guides & Tutoriels</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Questions fréquentes
            </CardTitle>
            <CardDescription>
              Trouvez rapidement des réponses à vos questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-sm hover:text-primary">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Nous contacter
            </CardTitle>
            <CardDescription>
              Envoyez-nous un message, nous vous répondrons rapidement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Message envoyé !</h3>
                <p className="text-muted-foreground">
                  Nous vous répondrons dans les plus brefs délais.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet *</Label>
                    <Input
                      id="name"
                      placeholder="Votre nom"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => handleInputChange("category", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technique">Support technique</SelectItem>
                        <SelectItem value="facturation">Facturation</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Sujet *</Label>
                    <Input
                      id="subject"
                      placeholder="Sujet de votre demande"
                      value={formData.subject}
                      onChange={(e) => handleInputChange("subject", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Décrivez votre demande en détail..."
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    rows={5}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer le message
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}