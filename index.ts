import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
// Utility function to categorize date/time
function ytDateToDay(ytDate) {
  if (!ytDate) return 'descartar';
  const startTime = new Date(ytDate);
  const now = new Date();
  // Adjust reference time to 3:00 AM
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(3, 0, 0, 0);
  const today = new Date(now);
  today.setHours(3, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(3, 0, 0, 0);
  if (startTime >= today && startTime < tomorrow) {
    return 'hoje';
  } else if (startTime < today && startTime >= yesterday) {
    return 'ontem';
  }
  return 'descartar';
}
Deno.serve(async (req)=>{
  // Environment variables should be set via Supabase secrets
  const CLIENT_ID = Deno.env.get('TWITCH_CLIENT_ID');
  const CLIENT_SECRET = Deno.env.get("TWITCH_CLIENT_SECRET");
  const NEKOWEB_TOKEN = Deno.env.get("NEKOWEB_TOKEN");
  const NEKOWEB_URL = "vtubeschedule.nekoweb.org/data/lives_twitch.json";
  if (!CLIENT_ID || !CLIENT_SECRET || !NEKOWEB_TOKEN || !NEKOWEB_URL) {
    return new Response(JSON.stringify({
      error: 'A Secret Key is missing'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  // Fetch channel configurations 
  const { data: channels, error: channelError } = await supabase.from('canais_twitch').select('*');
  if (channelError || !channels) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch channels',
      details: channelError
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  interface LiveItem {
    id: string;
    title: string;
    channel_title: string;
    thumb: string;
    live: string;
    start: string;
    tags: any[];
    profile_picture: string;
  }
  
  interface Lives {
    ontem: LiveItem[];
    hoje: LiveItem[];
  }
  // Initialize lives structure
  const lives: Lives = {
    ontem: [],
    hoje: [],
  };

  // Get token
  const tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`
  });
  const tokenData = await tokenResponse.json();
  const token = tokenData.access_token;

  // Aggregate all channels IDs
  const user_ids = channels.map((channel)=>channel.channel_id).join('&user_id=');

  // Get channels streaming
  const streamsResponse = await fetch(`https://api.twitch.tv/helix/streams?user_id=${user_ids}&first=100`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id': CLIENT_ID
    }
  });
  const streamsData = await streamsResponse.json();

  const streamsDataArray = streamsData.data;

  for (const stream of streamsDataArray) {
    try {
        const title = stream.title;
        const thumbUrl = stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720');
        const channelTitle = stream.user_name;
        const videoId = "https://www.twitch.tv/" + stream.user_login;

        // Encontra o canal correspondente no array CANAIS
        let channel_info: any = null;
        for (const channel of channels) {
        if (channel.channel_title === channelTitle) {
            channel_info = channel;
            break;
        }
        }

        // Extrai profile_pic e tags do canal encontrado
        let profile_picture = "";
        let tags_array: any[] = [];
        if (channel_info) {
        profile_picture = channel_info.profile_picture || "";
        tags_array = channel_info.tags || [];
        }

        // Verifica se está ao vivo
        const liveStatus = "live";
        const startTime = stream.started_at;
        const day = ytDateToDay(startTime);

        if (day !== 'descartar') {
            lives[day].push({
                id: videoId,
                title: title,
                channel_title: channelTitle,
                thumb: thumbUrl,
                live: liveStatus,
                start: startTime,
                tags: tags_array,
                profile_picture: profile_picture
            });
        }
    } catch (error) {
      console.error(`Error processing channel ${stream.user_name}:`, error);
    }
  }
  // Send to Nekoweb
  const formData = new FormData();
  formData.append('pathname', NEKOWEB_URL);
  formData.append('content', JSON.stringify(lives, null, 2));
  const upload = await fetch("https://nekoweb.org/api/files/edit", {
    method: "POST",
    headers: {
      "Authorization": `${NEKOWEB_TOKEN}`
    },
    body: formData
  });
  if (!upload.ok) {
    console.error("Failed to store lives:", await upload.text());
    return new Response(JSON.stringify({
      error: 'Failed to fetch nekoweb',
      details: await upload.text()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  return new Response(JSON.stringify(lives, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Connection': 'close'
    }
  });
});
