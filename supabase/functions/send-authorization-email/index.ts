import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthorizationEmailRequest {
  authorizationId: string;
  numero: string;
  requesterName: string;
  requesterEmail: string;
  documentUrls: string[];
  comment?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { authorizationId, numero, requesterName, requesterEmail, documentUrls, comment }: AuthorizationEmailRequest = await req.json();

    console.log(`Processing authorization request ${authorizationId} for ${numero}`);

    // Generate signed URLs for attachments (valid 24h)
    const attachmentLinks = await Promise.all(
      documentUrls.map(async (url, index) => {
        const filePath = url.split("/").slice(-2).join("/");
        const { data, error } = await supabase.storage
          .from("authorization-documents")
          .createSignedUrl(filePath, 86400); // 24h
        
        if (error) {
          console.error(`Error creating signed URL for ${filePath}:`, error);
          return null;
        }
        return { name: `Document_${index + 1}`, url: data.signedUrl };
      })
    );

    const validLinks = attachmentLinks.filter(Boolean);

    const documentLinksHtml = validLinks.length > 0
      ? `<h3>Documents justificatifs:</h3>
         <ul>
           ${validLinks.map(doc => `<li><a href="${doc!.url}" target="_blank">${doc!.name}</a> (lien valide 24h)</li>`).join("")}
         </ul>`
      : "<p>Aucun document fourni</p>";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0d2847, #1a4a7c); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
          .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .label { font-weight: bold; color: #0d2847; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          a { color: #1a4a7c; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Nouvelle demande d'autorisation</h1>
            <p>DATA VOIP SOLUTIONS</p>
          </div>
          <div class="content">
            <p>Une nouvelle demande d'autorisation de numéro a été soumise.</p>
            
            <div class="info-row">
              <span class="label">ID de la demande:</span><br>
              ${authorizationId}
            </div>
            
            <div class="info-row">
              <span class="label">Numéro à autoriser:</span><br>
              ${numero}
            </div>
            
            <div class="info-row">
              <span class="label">Demandeur:</span><br>
              ${requesterName}<br>
              <a href="mailto:${requesterEmail}">${requesterEmail}</a>
            </div>
            
            ${comment ? `
            <div class="info-row">
              <span class="label">Commentaire:</span><br>
              ${comment}
            </div>
            ` : ""}
            
            ${documentLinksHtml}
            
            <div class="footer">
              <p>Cet email a été envoyé automatiquement par le système DATA VOIP SOLUTIONS.</p>
              <p>Date de la demande: ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "DATA VOIP SOLUTIONS <onboarding@resend.dev>",
      to: ["compta@dvsconnect.com"],
      subject: `[Autorisation] Demande pour le numéro ${numero}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending authorization email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
