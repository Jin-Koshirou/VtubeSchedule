import { execSync } from 'child_process';
import fs from 'fs';


function executeCommand(command, description) {
console.log(`\n🔄 ${description}...`);
try {
execSync(command, { stdio: 'inherit' });
console.log(`✅ ${description} concluído com sucesso!`);
return true;
} catch (error) {
console.error(`❌ Erro ao executar ${description}:`, error.message);
return false;
}
}

async function buildVideo() {
console.log('🚀 Iniciando processo de build do vídeo...');

const commands = [
{
cmd: 'node scripts/fetch-agenda.js',
desc: '[Buscando agenda de lives]'
},
{
cmd: 'node scripts/cache-thumb.js',
desc: '[Baixando thumbnails em cache]'
},
{
cmd: 'npx remotion render remotion/index.ts agenda-hoje out/agenda-hoje.mp4 --codec=h264 --concurrency=2',
desc: '[Renderizando vídeo]'
},
{
cmd: 'node scripts/clear-cache.cjs',
desc: '[Limpando cache de imagens]'
}
];

for (let i = 0; i < commands.length; i++) {
const { cmd, desc } = commands[i];
const success = executeCommand(cmd, desc);
if (!success) {
console.log('\n⚠️  Processo interrompido devido a erro.');
process.exit(1);
}

// Verificar se há itens suficientes após o fetch-agenda.js
if (i === 0) {
try {
const agendaData = JSON.parse(fs.readFileSync('agenda.json', 'utf8'));
const realItems = agendaData.filter(item => item.id !== 'placeholder');
if (realItems.length < 7) {
console.log(`\n⚠️  Apenas ${realItems.length} itens encontrados. Mínimo necessário: 7.`);
console.log('🛑 Processo finalizado sem gerar vídeo.');
process.exit(0);
}
} catch (error) {
console.error('❌ Erro ao ler agenda.json:', error.message);
process.exit(1);
}
}
}

console.log('\n🎉 Processo concluído com sucesso!');
console.log('📹 Vídeo salvo em: out/agenda-hoje.mp4');
}

buildVideo().catch(error => {
console.error('Erro fatal:', error);
process.exit(1);
});
