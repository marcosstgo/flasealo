import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ValidateUploadRequest {
  eventId: string;
  uploaderName: string;
  fileHash: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { eventId, uploaderName, fileHash }: ValidateUploadRequest = await req.json();

    if (!eventId || !uploaderName) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          allowed: false
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: limitsCheck, error: limitsError } = await supabase
      .rpc('check_upload_limits', {
        p_event_id: eventId,
        p_uploader_name: uploaderName,
      });

    if (limitsError) {
      console.error('Error checking limits:', limitsError);
      return new Response(
        JSON.stringify({
          error: 'Failed to check upload limits',
          allowed: false
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!limitsCheck.allowed) {
      return new Response(
        JSON.stringify(limitsCheck),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (fileHash) {
      const { data: isDuplicate, error: hashError } = await supabase
        .rpc('check_duplicate_photo', {
          p_event_id: eventId,
          p_file_hash: fileHash,
        });

      if (hashError) {
        console.error('Error checking duplicate:', hashError);
      } else if (isDuplicate) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: 'duplicate_file',
            message: 'Esta foto ya fue subida anteriormente',
          }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        ...limitsCheck,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        allowed: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
