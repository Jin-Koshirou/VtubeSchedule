const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.YT_API_KEY;
const CSV_FILE = path.join(__dirname, '../public/canais_rows.csv');
const OUTPUT_FILE = path.join(__dirname, '../public/canais_rows.csv');

if (!API_KEY) {
  console.error('Erro: YT_API_KEY não encontrada. Defina a variável de ambiente.');
  process.exit(1);
}

function makeHttpsRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  const rows = [];
  
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
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }
  
  return { headers, rows };
}

function arrayToCSV(headers, rows) {
  let csv = headers.join(',') + '\n';
  
  rows.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || '';
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    });
    csv += values.join(',') + '\n';
  });
  
  return csv;
}

async function fetchChannelStatistics(channelIds) {
  const batchSize = 50;
  const results = {};
  
  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const url = `https://youtube.googleapis.com/youtube/v3/channels?part=statistics&id=${ids}&maxResults=50&key=${API_KEY}`;
    
    try {
      console.log(`Buscando estatísticas para ${batch.length} canais...`);
      const response = await makeHttpsRequest(url);
      
      if (response.items) {
        response.items.forEach(item => {
          const channelId = item.id;
          const viewCount = item.statistics?.viewCount || '0';
          results[channelId] = viewCount;
          console.log(`Canal ${channelId}: ${viewCount} visualizações`);
        });
      }
      
      if (response.error) {
        console.error('Erro na API:', response.error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Erro ao buscar estatísticas para o lote ${i}-${i + batchSize}:`, error.message);
    }
  }
  
  return results;
}

async function main() {
  try {
    console.log('Lendo arquivo CSV...');
    const csvData = fs.readFileSync(CSV_FILE, 'utf8');
    const { headers, rows } = parseCSV(csvData);
    
    if (!headers.includes('channel_id')) {
      console.error('Coluna channel_id não encontrada no CSV');
      process.exit(1);
    }
    
    const channelIds = rows.map(row => row.channel_id).filter(id => id);
    console.log(`Encontrados ${channelIds.length} canais para processar`);
    
    const statistics = await fetchChannelStatistics(channelIds);
    
    let updatedHeaders = [...headers];
    if (!headers.includes('view_count')) {
      updatedHeaders.push('view_count');
    }
    
    const updatedRows = rows.map(row => ({
      ...row,
      view_count: statistics[row.channel_id] || '0'
    }));
    
    const updatedCSV = arrayToCSV(updatedHeaders, updatedRows);
    
    fs.writeFileSync(OUTPUT_FILE, updatedCSV, 'utf8');
    console.log(`Arquivo CSV atualizado com sucesso! ${Object.keys(statistics).length} canais processados.`);
    console.log(`Total de canais no CSV: ${updatedRows.length}`);
    
  } catch (error) {
    console.error('Erro durante a execução:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchChannelStatistics, parseCSV, arrayToCSV };
