import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js"

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const MAX_TAB_NAME_LENGTH = 120

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const parsePdfAttachment = (pdfBase64: string) => {
  const match = pdfBase64.match(/^data:application\/pdf(?:;[^;,]+=[^;,]+)*;base64,([A-Za-z0-9+/=\r\n]+)$/i)

  if (!match) {
    return { error: "Invalid pdfBase64 format. Expected a base64-encoded PDF data URI." }
  }

  const [, rawBase64Content] = match
  const base64Content = rawBase64Content.replace(/\s+/g, "")
  const paddingLength = (base64Content.match(/=*$/)?.[0]?.length ?? 0)
  const estimatedBytes = Math.floor((base64Content.length * 3) / 4) - paddingLength

  if (estimatedBytes <= 0) {
    return { error: "PDF attachment is empty." }
  }

  if (estimatedBytes > MAX_ATTACHMENT_BYTES) {
    return { error: `PDF attachment exceeds ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB limit.` }
  }

  return { base64Content }
}

serve(async (req) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5177",
    "https://absstem.com",
   "https://returnoninvestmentmoduleforabsstem-nlukze3ex.vercel.app"
  ]

  const origin = req.headers.get("origin") || ""

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
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
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const userEmail = user.email || "N/A"

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, phone, company_name")
      .eq("id", user.id)
      .single()

    const userName = profile?.name || "N/A"
    const userPhone = profile?.phone || "Not provided"
    const userCompany = profile?.company_name || "N/A"

    let body
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const { pdfBase64, tabName } = body

    if (typeof pdfBase64 !== "string" || !pdfBase64.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required field: pdfBase64" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (typeof tabName !== "string" || !tabName.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required field: tabName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (tabName.length > MAX_TAB_NAME_LENGTH) {
      return new Response(
        JSON.stringify({ error: "tabName is too long" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const parsedAttachment = parsePdfAttachment(pdfBase64.trim())

    if ("error" in parsedAttachment) {
      return new Response(
        JSON.stringify({ error: parsedAttachment.error }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const safeUserEmail = escapeHtml(userEmail)
    const safeUserName = escapeHtml(userName)
    const safeUserPhone = escapeHtml(userPhone)
    const safeUserCompany = escapeHtml(userCompany)
    const safeTabName = escapeHtml(tabName.trim())

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
        subject: `PDF Download Alert - ${safeTabName}`,
        htmlContent: `
          <h2>New PDF Download</h2>
          <p><strong>Email:</strong> ${safeUserEmail}</p>
          <p><strong>Name:</strong> ${safeUserName}</p>
          <p><strong>Phone:</strong> ${safeUserPhone}</p>
          <p><strong>Company:</strong> ${safeUserCompany}</p>
          <p><strong>Calculation Type:</strong> ${safeTabName}</p>
          <p>This user has downloaded the PDF.</p>
        `,
        attachment: [
          {
            content: parsedAttachment.base64Content,
            name: "calculation.pdf",
          },
        ],
      }),
    })

    if (!brevoRes.ok) {
      const err = await brevoRes.text()
      console.error("Brevo error:", err)
      return new Response(
        JSON.stringify({ error: "Email failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
