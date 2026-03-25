import fs from 'fs';

const agendaData = JSON.parse(fs.readFileSync('agenda.json', 'utf8'));
const realItems = agendaData.filter(item => item.id !== 'placeholder');
if (realItems.length < 7) {
  console.log(`\n⚠️  Apenas ${realItems.length} itens encontrados. Mínimo necessário: 7.`);
  console.log('🛑 Processo finalizado sem enviar vídeo.');
  process.exit(0);
}

// Substitua pelo seu Token de API real e IDs dos canais de destino
const API_TOKEN = process.env.BUFFER_API_TOKEN;
const TIKTOK_CHANNEL_ID = process.env.TIKTOK_CHANNEL_ID;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const VIDEO_URL = process.env.VIDEO_URL;
//organizationId: "6527f76cf8b88875efce7fcd",
// O endpoint oficial do GraphQL do Buffer
const GRAPHQL_ENDPOINT = 'https://api.buffer.com';

// 1. A Estrutura da Mutação (Query)
const createPostMutation = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post {
          id
          status
          text
          assets {
            id
            type
          }
        }
      }
      ... on MutationError {
        message
      }
    }
  }
`;

// 2. Configurando o payload (Input) para o TikTok
const tiktokPayload = {
  channelId: TIKTOK_CHANNEL_ID,
  schedulingType: "automatic", // Publicação direta, sem ser apenas um lembrete no app
  mode: "shareNow", // Pode usar "addToQueue" se preferir enfileirar
  text: "Confira nosso novo conteúdo! #tiktok #viral",
  assets: {
    videos:[{
      url: VIDEO_URL // URL pública do vídeo
    }]
  },
  metadata: {
    tiktok: {
      title: "Título que aparecerá no TikTok"
    }
  }
};

// 3. Configurando o payload (Input) para o YouTube Shorts
const youtubePayload = {
  channelId: YOUTUBE_CHANNEL_ID,
  schedulingType: "automatic",
  mode: "shareNow",
  text: "Agenda de lives VTuber 🎥\nVeja quem vai streamar hoje 👀\nhttps://vtubeschedule.nekoweb.org",
  assets: {
    videos:[{
      url: VIDEO_URL
    }]
  },
  metadata: {
    youtube: {
      title: "VTUBERS AO VIVO【VtubeSchedule】#vtuber #vtuberlive #vtuberbr",
      privacy: "private",       // Opções: public, unlisted, private
      categoryId: "24",       // ID da categoria do vídeo. Ex: 22 -> People & Blogs, 20 -> Gaming, 10 -> Music
      madeForKids: false,     // Requerido pelo YouTube (Lei COPPA)
      notifySubscribers: false // Se deve disparar notificação aos inscritos
    }
  }
};

// 4. Função auxiliar para disparar a requisição
async function postToBuffer(payload, platformName) {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({
        query: createPostMutation,
        variables: { input: payload }
      }),
    });

    const data = await response.json();
    console.log(`\n=== Resposta do ${platformName} ===`);
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error(`Erro ao postar no ${platformName}:`, error);
  }
}

// 5. Executando as postagens
async function publishShorts() {
  console.log("Iniciando publicação paralela...");
  
  // Como são canais diferentes, rodamos as requisições em paralelo usando Promise.all
  await Promise.all([
    // postToBuffer(tiktokPayload, "TikTok"),
    postToBuffer(youtubePayload, "YouTube Shorts")
  ]);
  
  console.log("\nProcesso finalizado!");
}

publishShorts();