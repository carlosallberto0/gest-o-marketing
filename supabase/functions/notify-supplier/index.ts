import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifySupplierRequest {
  serviceOrderId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { serviceOrderId }: NotifySupplierRequest = await req.json();

    console.log("Fetching service order:", serviceOrderId);

    // Fetch service order with supplier and outdoor details
    const { data: serviceOrder, error: orderError } = await supabase
      .from("service_orders")
      .select(`
        *,
        supplier:suppliers(name, email, phone, address),
        outdoor:outdoors(code, location, width, height, pdv:pdvs(name, address, city, state))
      `)
      .eq("id", serviceOrderId)
      .single();

    if (orderError || !serviceOrder) {
      console.error("Error fetching service order:", orderError);
      return new Response(
        JSON.stringify({ error: "Service order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all items for this service order
    const { data: orderItems, error: itemsError } = await supabase
      .from("service_order_items")
      .select(`
        *,
        outdoor:outdoors(code, location, width, height, photo_url, pdv:pdvs(name, address, city, state)),
        maintenance_request:maintenance_requests(reason, observations)
      `)
      .eq("service_order_id", serviceOrderId);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    const supplier = serviceOrder.supplier;
    if (!supplier?.email) {
      console.error("Supplier email not found");
      return new Response(
        JSON.stringify({ error: "Supplier email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending email to supplier:", supplier.email);

    // Build the outdoor list for the email
    const outdoorsList = orderItems && orderItems.length > 0
      ? orderItems.map((item, index) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: 600;">${index + 1}. ${item.outdoor?.code || 'N/A'}</td>
          <td style="padding: 12px;">${item.outdoor?.pdv?.name || 'N/A'}</td>
          <td style="padding: 12px;">${item.outdoor?.pdv?.city || 'N/A'}/${item.outdoor?.pdv?.state || 'N/A'}</td>
          <td style="padding: 12px;">${item.outdoor?.width || 0}m x ${item.outdoor?.height || 0}m</td>
        </tr>
        ${item.maintenance_request?.reason ? `
        <tr style="background-color: #f9fafb;">
          <td colspan="4" style="padding: 12px;">
            <strong>Motivo:</strong> ${item.maintenance_request.reason}
            ${item.maintenance_request.observations ? `<br/><strong>Obs:</strong> ${item.maintenance_request.observations}` : ''}
          </td>
        </tr>
        ` : ''}
      `).join('')
      : `
        <tr>
          <td style="padding: 12px; font-weight: 600;">1. ${serviceOrder.outdoor?.code || 'N/A'}</td>
          <td style="padding: 12px;">${serviceOrder.outdoor?.pdv?.name || 'N/A'}</td>
          <td style="padding: 12px;">${serviceOrder.outdoor?.pdv?.city || 'N/A'}/${serviceOrder.outdoor?.pdv?.state || 'N/A'}</td>
          <td style="padding: 12px;">${serviceOrder.outdoor?.width || 0}m x ${serviceOrder.outdoor?.height || 0}m</td>
        </tr>
      `;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Nova Ordem de Serviço</h1>
              <p style="color: #bfdbfe; margin: 10px 0 0; font-size: 16px;">${serviceOrder.number}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
              <p style="color: #374151; margin: 0 0 20px;">
                Olá <strong>${supplier.name}</strong>,
              </p>
              <p style="color: #374151; margin: 0 0 20px;">
                Uma nova ordem de serviço foi gerada para sua empresa. Confira os detalhes abaixo:
              </p>
              
              <!-- Order Info -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #111827;">Informações da Ordem</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Número:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600;">${serviceOrder.number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Tipo:</td>
                    <td style="padding: 8px 0; color: #111827;">${serviceOrder.type === 'maintenance' ? 'Manutenção' : serviceOrder.type === 'installation' ? 'Instalação' : serviceOrder.type === 'removal' ? 'Remoção' : 'Substituição'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Valor Total:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 600;">R$ ${Number(serviceOrder.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Outdoors List -->
              <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #111827;">Outdoors para Manutenção</h3>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #f3f4f6;">
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Outdoor</th>
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">PDV</th>
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Cidade</th>
                      <th style="padding: 12px; text-align: left; color: #374151; font-weight: 600;">Dimensões</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${outdoorsList}
                  </tbody>
                </table>
              </div>
              
              <!-- Description -->
              ${serviceOrder.description ? `
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px; color: #92400e;">Descrição / Observações</h4>
                <p style="margin: 0; color: #78350f;">${serviceOrder.description}</p>
              </div>
              ` : ''}
              
              <!-- Call to Action -->
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6b7280; margin-bottom: 15px;">
                  Por favor, entre em contato para confirmar o recebimento desta ordem.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                SR Off Trade Marketing
              </p>
              <p style="color: #9ca3af; margin: 10px 0 0; font-size: 12px;">
                Este é um email automático, por favor não responda diretamente.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "SR Off Trade <onboarding@resend.dev>",
      to: [supplier.email],
      subject: `Nova Ordem de Serviço - ${serviceOrder.number}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        emailId: emailResponse.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-supplier function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
