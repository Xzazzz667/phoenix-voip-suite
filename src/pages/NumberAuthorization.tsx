import { useState, useEffect } from "react";
import { Phone, FileText, Upload, Send, Search, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface AuthorizationRequest {
  id: string;
  numero: string;
  requester_name: string;
  requester_email: string;
  status: string;
  document_urls: string[];
  comment: string | null;
  admin_comment: string | null;
  created_at: string;
  processed_at: string | null;
}

const authorizationSchema = z.object({
  numero: z.string().min(5, "Le numéro doit contenir au moins 5 caractères").regex(/^\+?[0-9\s]+$/, "Format de numéro invalide"),
  requesterName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  requesterEmail: z.string().email("Email invalide"),
  comment: z.string().optional(),
});

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", icon: Clock, variant: "secondary" },
  approved: { label: "Approuvé", icon: CheckCircle, variant: "default" },
  rejected: { label: "Refusé", icon: XCircle, variant: "destructive" },
  expired: { label: "Expiré", icon: AlertCircle, variant: "outline" },
};

const NumberAuthorization = () => {
  const [requests, setRequests] = useState<AuthorizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // Form state
  const [numero, setNumero] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("number_authorizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.numero.includes(searchQuery) || 
                          r.requester_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || r.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const isValidType = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      if (!isValidType) toast.error(`${file.name}: Type de fichier non autorisé`);
      if (!isValidSize) toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
      return isValidType && isValidSize;
    });
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setNumero("");
    setRequesterName("");
    setRequesterEmail("");
    setComment("");
    setFiles([]);
  };

  const handleSubmit = async () => {
    // Validate form
    const validation = authorizationSchema.safeParse({
      numero,
      requesterName,
      requesterEmail,
      comment,
    });

    if (!validation.success) {
      validation.error.errors.forEach(err => toast.error(err.message));
      return;
    }

    if (files.length === 0) {
      toast.error("Veuillez fournir au moins un justificatif");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload files to storage
      const documentUrls: string[] = [];
      const timestamp = Date.now();

      for (const file of files) {
        const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = `requests/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("authorization-documents")
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`Erreur upload: ${uploadError.message}`);
        }

        documentUrls.push(filePath);
      }

      // 2. Create authorization request in database
      const { data: authRequest, error: dbError } = await supabase
        .from("number_authorizations")
        .insert({
          numero: numero.replace(/\s/g, ""),
          requester_name: requesterName,
          requester_email: requesterEmail,
          document_urls: documentUrls,
          comment: comment || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Send notification email
      const { error: emailError } = await supabase.functions.invoke("send-authorization-email", {
        body: {
          authorizationId: authRequest.id,
          numero,
          requesterName,
          requesterEmail,
          documentUrls,
          comment,
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        // Don't fail the whole request if email fails
        toast.warning("Demande enregistrée mais l'email n'a pas pu être envoyé");
      }

      toast.success("Demande d'autorisation envoyée avec succès");
      setDialogOpen(false);
      resetForm();
      fetchRequests();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Autorisation des numéros</h1>
          <p className="text-muted-foreground">
            Demandez l'autorisation d'utiliser vos propres numéros de téléphone
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <FileText className="w-4 h-4" />
              Demande d'approbation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader className="bg-primary text-primary-foreground -m-6 mb-4 p-6 rounded-t-lg">
              <DialogTitle className="text-lg">Demande d'approbation</DialogTitle>
              <DialogDescription className="text-primary-foreground/80">
                Fournissez les justificatifs prouvant que le numéro vous appartient
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="numero">Numéro d'affichage *</Label>
                <Input
                  id="numero"
                  placeholder="+33 1 23 45 67 89"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Votre nom *</Label>
                  <Input
                    id="name"
                    placeholder="Nom complet"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Votre email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemple.com"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="files">Importer les justificatifs * (PDF ou images)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="files"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    multiple
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                </div>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                        <span className="truncate flex-1">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-destructive h-6 px-2"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Formats acceptés: PDF, JPEG, PNG, WebP. Max 10MB par fichier.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Commentaire (optionnel)</Label>
                <Textarea
                  id="comment"
                  placeholder="Informations complémentaires..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Envoyer la demande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs and Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending">En attente</TabsTrigger>
                <TabsTrigger value="approved">Validés</TabsTrigger>
                <TabsTrigger value="rejected">Refusés</TabsTrigger>
                <TabsTrigger value="all">Historique</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[200px]"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchRequests}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Demandes d'autorisation
            <Badge variant="outline" className="ml-2">
              {filteredRequests.length} demande(s)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mb-4 opacity-50" />
              <p>Aucune demande trouvée</p>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Numéro</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => {
                    const status = statusConfig[request.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono font-medium">
                          {request.numero}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.requester_name}</div>
                            <div className="text-xs text-muted-foreground">{request.requester_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Autorisation</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {request.document_urls.length} fichier(s)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(request.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NumberAuthorization;
