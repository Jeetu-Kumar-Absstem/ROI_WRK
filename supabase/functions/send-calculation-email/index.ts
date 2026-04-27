import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js"


const corsHeaders = {
  // for using local hosted frontend during development, allow all origins
  "Access-Control-Allow-Origin": "*",
  // for production, replace the above line 
  // "Access-Control-Allow-Origin": https://absstem.com,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}


serve(async (req) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
  
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")
    const BREVO_FROM_EMAIL = Deno.env.get("BREVO_FROM_EMAIL")
    const BREVO_TO_EMAIL = Deno.env.get("BREVO_TO_EMAIL")

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase configuration")
    }

    if (!BREVO_API_KEY || !BREVO_FROM_EMAIL || !BREVO_TO_EMAIL) {
      throw new Error("Missing email (Brevo) configuration")
    }

  
    const authHeader = req.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: corsHeaders }
      )
    }

   
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // ✅ Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      )
    }

    const userEmail = user.email

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, phone, company_name")
      .eq("id", user.id)
      .single()

    const userName = profile?.name || "N/A"
    const userPhone = profile?.phone || "Not provided"
    const userCompany = profile?.company_name || "N/A"

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { pdfBase64, tabName } = body

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "Missing required field: pdfBase64" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (!tabName) {
      return new Response(
        JSON.stringify({ error: "Missing required field: tabName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Send email via Brevo
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: BREVO_FROM_EMAIL,
        },
        to: [{ email: BREVO_TO_EMAIL }],
        subject: `📥 PDF Download Alert - ${tabName}`,
        htmlContent: `
          <h2>New PDF Download</h2>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Name:</strong> ${userName}</p>
          <p><strong>Phone:</strong> ${userPhone}</p>
          <p><strong>Company:</strong> ${userCompany}</p>
          <p><strong>Calculation Type:</strong> ${tabName}</p>
          <p>This user has downloaded the PDF.</p>
        `,
        attachment: [
          {
            content: pdfBase64.replace(/^data:.*;base64,/, ""),
            name: "calculation.pdf",
          },
        ],
      }),
    })

    if (!brevoRes.ok) {
      const err = await brevoRes.text()
      console.error("Brevo error:", err)
      return new Response(
        JSON.stringify({ error: "Email failed", details: err }),
        { status: 500, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (err) {
    console.error("Function error:", err)
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})