#!/bin/bash

set -e

# === CONFIGURAÇÕES ===
API_KEY="${YT_API_KEY}"  # ou exporte YT_API_KEY no terminal
CANAIS=("UUtw23QbVNGCLt_pD968tKSA" "UU8Yx-nFRnmjd4hwvMpmCgEg" "UUHjrqtWTAaGTS9YOOgsTAYQ" "UU7WOUQJ3hwdcocHvyaYMvsQ" "UUHXErfSb_-xot_8vjruOXTg" "UUaXYbTUAYN4GK2guDpxN0w")
DATA_DIR="data"

mkdir -p "$DATA_DIR"

# Inicia o arquivo JSON
echo '{"ontem":[],"hoje":[],"amanha":[],"depois":[]}' > "$DATA_DIR/lives.json"

# Converte data/hora do YouTube para timestamp
yt_date_to_day() {
  local ytdate=$1
  if [ "$ytdate" == "null" ]; then  # Se não for live, descarta
    echo "descartar"
    return
  fi
  local timestamp=$(date -d "$ytdate" +%s)

  local ontem=$(date -d "yesterday 00:00" +%s)
  local hoje=$(date -d "00:00" +%s)
  local amanha=$(date -d "tomorrow 00:00" +%s)
  local depois=$(date -d "2 days 00:00" +%s)
  local limite=$(date -d "3 days 00:00" +%s)

  if [ "$timestamp" -ge "$hoje" ] && [ "$timestamp" -lt "$amanha" ]; then
    echo "hoje"
  elif [ "$timestamp" -ge "$amanha" ] && [ "$timestamp" -lt "$depois" ]; then
    echo "amanha"
  elif [ "$timestamp" -lt "$hoje" ] && [ "$timestamp" -ge "$ontem" ]; then
    echo "ontem"
  elif [ "$timestamp" -ge "$depois" ] && [ "$timestamp" -lt "$limite" ]; then
    echo "depois"
  else
    echo "descartar"
  fi
}

for canal in "${CANAIS[@]}"; do
  echo "🔍 Buscando vídeos do canal $canal"

  resp=$(curl -s "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status&maxResults=25&playlistId=$canal&key=$API_KEY")

  videoIds=$(echo "$resp" | jq -c '.items[]' | jq -r '.snippet.resourceId.videoId' | tr '\n' ',')
  resp2=$(curl -s "https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=$videoIds&key=$API_KEY")

  echo "$resp2" | jq -c '.items[]' | while read -r item; do
    title=$(echo "$item" | jq -r '.snippet.title')
    thumb_url=$(echo "$item" | jq -r '.snippet.thumbnails.medium.url')
    channel_title=$(echo "$item" | jq -r '.snippet.channelTitle')
    video_id=$(echo "$item" | jq -r '.id')

    # Verifica se está ao vivo
    live_status=$(echo "$item" | jq -r '.snippet.liveBroadcastContent')
    start_time=$(echo "$item" | jq -r '.liveStreamingDetails.scheduledStartTime')

    dia=$(yt_date_to_day "$start_time")

    if [ "$dia" != "descartar" ]; then
      # Adiciona ao JSON
      jq --arg dia "$dia" --arg id "$video_id" --arg title "$title" --arg channel_title "$channel_title" --arg thumb_url "$thumb_url" --arg live_status "$live_status" --arg start_time "$start_time" \
         '.[$dia] += [{"id": $id, "title": $title, "channel_title": $channel_title, "thumb": $thumb_url, "live": $live_status, "start": $start_time}]' "$DATA_DIR/lives.json" > tmp.$$.json && mv tmp.$$.json "$DATA_DIR/lives.json"

      echo "✔️ [$dia] $title ($start_time) $live_status"
    fi
  done
done

echo "✅ Lives atualizadas em $DATA_DIR/lives.json"
