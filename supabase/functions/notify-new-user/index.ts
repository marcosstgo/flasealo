import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_EMAIL = 'hello@marcossantiago.com'
const ADMIN_URL = 'https://flashealo.com/admin'

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const userId = payload.record?.user_id

    if (!userId) {
      return new Response('No user_id in payload', { status: 400 })
    }

    // Get the new user's email from auth.users
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !user) {
      console.error('Error fetching user:', error)
      return new Response('User not found', { status: 404 })
    }

    const userEmail = user.email || 'Email desconocido'
    const registeredAt = new Date(user.created_at).toLocaleString('es-PR', {
      timeZone: 'America/Puerto_Rico',
      dateStyle: 'long',
      timeStyle: 'short',
    })

    // Send email via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('RESEND_API_KEY not set')
      return new Response('Email service not configured', { status: 500 })
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Flashealo <onboarding@resend.dev>',
        to: ADMIN_EMAIL,
        subject: `Nuevo usuario en Flashealo: ${userEmail}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #111; margin-bottom: 8px;">Nuevo usuario registrado</h2>
            <p style="color: #555; margin-bottom: 24px;">Alguien se acaba de registrar en Flashealo y está esperando que le des acceso para crear eventos.</p>

            <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${userEmail}</p>
              <p style="margin: 0; color: #888; font-size: 14px;">Registrado: ${registeredAt}</p>
            </div>

            <a href="${ADMIN_URL}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
              Ir al panel de admin
            </a>

            <p style="color: #aaa; font-size: 12px; margin-top: 32px;">Flashealo — flashealo.com</p>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.text()
      console.error('Resend error:', err)
      return new Response('Failed to send email', { status: 500 })
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response('Internal error', { status: 500 })
  }
})
