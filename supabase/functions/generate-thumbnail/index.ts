import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ThumbnailRequest {
  photoId: string;
  imageUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Require a valid Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { photoId, imageUrl }: ThumbnailRequest = await req.json();

    if (!photoId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing photoId or imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow fetching from this project's own Supabase storage (SSRF prevention)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const allowedHostname = new URL(supabaseUrl).hostname;

    let parsedImageUrl: URL;
    try {
      parsedImageUrl = new URL(imageUrl);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid imageUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsedImageUrl.hostname !== allowedHostname) {
      return new Response(JSON.stringify({ error: "imageUrl must point to project storage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the photoId exists in the DB before processing
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("id")
      .eq("id", photoId)
      .maybeSingle();

    if (photoError || !photo) {
      return new Response(JSON.stringify({ error: "Photo not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image");
    }

    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();

    const canvas = new OffscreenCanvas(800, 600);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    const imageBitmap = await createImageBitmap(new Blob([arrayBuffer]));

    const aspectRatio = imageBitmap.width / imageBitmap.height;
    let targetWidth = 800;
    let targetHeight = 600;

    if (aspectRatio > targetWidth / targetHeight) {
      targetHeight = targetWidth / aspectRatio;
    } else {
      targetWidth = targetHeight * aspectRatio;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

    const thumbnailBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 });

    const originalPath = imageUrl.split("/").pop()?.split("?")[0] || "";
    const thumbnailPath = `thumbnails/${originalPath}`;

    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/photos/${thumbnailPath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "image/jpeg",
        },
        body: thumbnailBlob,
      }
    );

    if (!uploadResponse.ok) throw new Error("Failed to upload thumbnail");

    const thumbnailUrl = `${supabaseUrl}/storage/v1/object/public/photos/${thumbnailPath}`;

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/photos?id=eq.${photoId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ thumbnail_url: thumbnailUrl }),
      }
    );

    if (!updateResponse.ok) throw new Error("Failed to update photo record");

    return new Response(
      JSON.stringify({ success: true, thumbnailUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate thumbnail" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
