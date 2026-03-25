const fs = require('fs');
const path = require('path');


function clearCache() {
const cacheDir = path.join(__dirname, '..', 'public', 'cache');

try {
if (!fs.existsSync(cacheDir)) {
console.log('Diretório cache não encontrado:', cacheDir);
return;
}

const files = fs.readdirSync(cacheDir);
const jpgFiles = files.filter(file => file.endsWith('.jpg'));

if (jpgFiles.length === 0) {
console.log('Nenhum arquivo .jpg encontrado para deletar.');
return;
}

console.log(`Deletando ${jpgFiles.length} arquivos .jpg...`);

jpgFiles.forEach(file => {
const filePath = path.join(cacheDir, file);
try {
fs.unlinkSync(filePath);
// console.log('Deletado:', file);
} catch (error) {
console.error('Erro ao deletar', file, ':', error.message);
}
});

console.log('Cache limpo com sucesso!');
} catch (error) {
console.error('Erro ao limpar cache:', error.message);
}
}

clearCache();
