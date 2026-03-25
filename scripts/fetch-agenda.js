import fs from "fs";
import path from "path";

function sampleSize(array, size) {
  const shuffled = [...array]; // Create a copy to avoid modifying the original array
  let i = array.length;
  let temp, rand;

  while (i !== 0) {
    rand = Math.floor(Math.random() * i);
    i--;
    // Swap the elements
    temp = shuffled[i];
    shuffled[i] = shuffled[rand];
    shuffled[rand] = temp;
  }

  // Return the first 'size' elements of the shuffled array
  return shuffled.slice(0, size);
}

function arrayRotate(arr, n) {
  for (let i = 0; i < n; i++) {
    arr.push(arr.shift());
  }
  return arr;
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  const channelViewMap = {};
  
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length >= headers.length) {
      const channelId = values[2]; // channel_title
      const viewCount = values[headers.length - 1] || '0'; // view_count (última coluna)
      channelViewMap[channelId] = parseInt(viewCount) || 0;
    }
  }
  
  return channelViewMap;
}

async function fetchVTuberSchedule() {
    const url = 'https://vtubeschedule.nekoweb.org/data/lives.json';

    try {
        const response = await fetch(url);

        // Check if the request was successful (status 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.hoje;
    } catch (error) {
        console.error("Could not fetch data:", error);
    }
}

// Call the function
let agenda = await fetchVTuberSchedule();

// Ler CSV para obter view_count dos canais
const csvPath = path.resolve('public/canais_rows.csv');
const csvData = fs.readFileSync(csvPath, 'utf8');
const channelViewMap = parseCSV(csvData);

const placeholder = {
  "id": "placeholder",
  "title": "vtubeschedule.nekoweb.org",
  "channel_title": "vtubeschedule",
  "thumb": "logo.png",
  "live": "none",
  "start": "",
  "tags": [],
  "profile_picture": ""
}

const MAX_LENGTH = 7

const now = new Date();
const hours = now.getUTCHours();
const formattedHours = hours.toString().padStart(2, '0');
const targetTime = `${formattedHours}:00:00.000Z`;
const beginning = new Date(`${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}-${now.getUTCDate().toString().padStart(2, '0')}T${targetTime}`);

agenda = agenda.filter(item => new Date(item.start) >= beginning);

// drop channel_title duplicated
const seen = new Set();
agenda = agenda.filter(item => {
  if (seen.has(item.channel_title)) {
    return false;
  }
  seen.add(item.channel_title);
  return true;
});

// Separar itens antes das 17:00 em pt-BR
const cutoffTime = new Date();
cutoffTime.setHours(17, 0, 0, 0);

const before17 = agenda.filter(item => new Date(item.start) < cutoffTime);
const after17 = agenda.filter(item => new Date(item.start) >= cutoffTime);

// Função de ordenação pelo maior view_count (considerando horário local como critério de desempate)
function sortByViewCountAndTime(a, b) {
  const viewCountA = channelViewMap[a.channel_title] || 0;
  const viewCountB = channelViewMap[b.channel_title] || 0;
  
  if (viewCountB !== viewCountA) {
    return viewCountB - viewCountA; // Maior view_count primeiro
  }
  
  // Desempate por horário local
  const localA = new Date(a.start);
  localA.setHours(localA.getHours() - 3);
  const localB = new Date(b.start);
  localB.setHours(localB.getHours() - 3);
  return localA - localB;
}

// Ordenar before17 e after17 usando a função de ordenação
before17.sort(sortByViewCountAndTime);
after17.sort(sortByViewCountAndTime);

// Adicionar itens aleatórios se necessário para atingir MAX_LENGTH
let finalAgenda = [...before17];

if (finalAgenda.length < MAX_LENGTH) {
  const remainingSlots = MAX_LENGTH - finalAgenda.length;
  const additionalItems = after17.length > remainingSlots 
    ? after17.slice(0, remainingSlots)  //sampleSize(after17, remainingSlots)
    : after17;
  
  finalAgenda = [...finalAgenda, ...additionalItems];
}
else {
  // finalAgenda = sampleSize(finalAgenda, MAX_LENGTH);
  finalAgenda = finalAgenda.slice(0, MAX_LENGTH);
}

// Ordenar pelo maior view_count (considerando horário local como critério de desempate)
finalAgenda.sort(sortByViewCountAndTime);

// Preencher com placeholders se ainda não atingir MAX_LENGTH
for (let i = finalAgenda.length; i < MAX_LENGTH; i++) {
  finalAgenda.push(placeholder);
}

agenda = finalAgenda;

// agenda = arrayRotate(agenda, 1)

fs.writeFileSync("agenda.json", JSON.stringify(agenda, null, 2));
