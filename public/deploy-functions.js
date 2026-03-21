#!/usr/bin/env node
// ============================================================
// Elle Make — Script de Deploy das Edge Functions
// ============================================================
// USO:
//   1. Salve este arquivo na raiz do projeto
//   2. Execute: node deploy-functions.js
//
// PRE-REQUISITOS:
//   - Node.js instalado  
//   - Supabase CLI: npm install -g supabase
//   - Projeto linkado: npx supabase link --project-ref osgkokctbwkcadrgteva
// ============================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_REF = 'osgkokctbwkcadrgteva';
const SOURCE_PROJECT_URL = 'https://xinkvwlhctwgdfwixzxf.supabase.co';
const SOURCE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpbmt2d2xoY3R3Z2Rmd2l4enhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Mzk4MjUsImV4cCI6MjA4NzIxNTgyNX0.NJOPu81iPsjAyvmT-d5KAuOSr7Uwqz6hmYn5Qp8gcQg';

// All function names to deploy
const FUNCTION_NAMES = [
  'beauty-consultant',
  'ai-content-generator', 
  'seo-report',
  'sitemap',
  'whatsapp-notifications',
  'melhor-envio-shipping',
  'mercadopago-payment',
  'cart-recovery',
  'catalog-drive-import',
  'catalog-consultant',
  'marketplace-mercadolivre',
  'marketplace-amazon',
  'marketplace-shopee',
  'marketplace-tiktokshop',
  'migrate-data',
  'migrate-storage',
  'export-auth-users',
];

// Config.toml content
const CONFIG_TOML = `project_id = "${PROJECT_REF}"

${FUNCTION_NAMES.map(name => `[functions.${name}]\nverify_jwt = false`).join('\n\n')}
`;

console.log('\n========================================');
console.log('  Elle Make - Deploy Edge Functions');
console.log('========================================\n');

// Step 1: Check if function files exist locally
const baseDir = path.join('supabase', 'functions');
let missingFunctions = [];
let existingFunctions = [];

for (const name of FUNCTION_NAMES) {
  const filePath = path.join(baseDir, name, 'index.ts');
  if (fs.existsSync(filePath)) {
    existingFunctions.push(name);
  } else {
    missingFunctions.push(name);
  }
}

console.log(`Funcoes encontradas: ${existingFunctions.length}/${FUNCTION_NAMES.length}`);
if (missingFunctions.length > 0) {
  console.log(`Funcoes faltando: ${missingFunctions.join(', ')}`);
}

// Step 2: If functions are missing, try to download from the Lovable preview
if (missingFunctions.length > 0) {
  console.log('\nBaixando funcoes faltantes do projeto Lovable...\n');
  
  // The functions source code is served via the Lovable preview as static files
  // But they're not accessible that way. Instead, we need another approach.
  // Let's check if the user has the repo cloned via git
  
  let hasGitFiles = false;
  try {
    // Check if git remote points to a valid repo
    const remote = execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (remote) {
      console.log(`Repositorio Git: ${remote}`);
      console.log('Tentando restaurar arquivos via git...');
      try {
        execSync('git checkout -- supabase/functions/', { encoding: 'utf8', stdio: 'inherit' });
        hasGitFiles = true;
        console.log('[OK] Arquivos restaurados via git!\n');
      } catch (e) {
        console.log('[AVISO] git checkout falhou - arquivos podem nao estar no repositorio local\n');
      }
    }
  } catch (e) {
    // No git
  }

  if (!hasGitFiles) {
    console.log('\n=============================================');
    console.log('  ACAO NECESSARIA: Conectar ao GitHub');
    console.log('=============================================');
    console.log('');
    console.log('Os arquivos das Edge Functions nao estao no');
    console.log('diretorio local. Para resolve-los:');
    console.log('');
    console.log('1. No Lovable, va em Settings > GitHub > Connect');
    console.log('2. Clone o repositorio:');
    console.log('   git clone https://github.com/SEU_USUARIO/SEU_REPO.git');
    console.log('3. Execute este script dentro do repo clonado');
    console.log('');
    console.log('Funcoes que ja existem serao deployadas agora.');
    console.log('=============================================\n');
  }
  
  // Re-check after git checkout
  existingFunctions = [];
  for (const name of FUNCTION_NAMES) {
    const filePath = path.join(baseDir, name, 'index.ts');
    if (fs.existsSync(filePath)) {
      existingFunctions.push(name);
    }
  }
}

if (existingFunctions.length === 0) {
  console.log('\n[ERRO] Nenhuma funcao encontrada para deploy.');
  console.log('Conecte o projeto ao GitHub e clone o repositorio primeiro.\n');
  process.exit(1);
}

// Step 3: Write config.toml
const configPath = path.join('supabase', 'config.toml');
fs.mkdirSync('supabase', { recursive: true });
fs.writeFileSync(configPath, CONFIG_TOML, 'utf8');
console.log(`[OK] ${configPath} atualizado`);

// Step 4: Link project (if not already linked)
console.log(`\nLinkando projeto ${PROJECT_REF}...`);
try {
  execSync(`npx supabase link --project-ref ${PROJECT_REF}`, { 
    encoding: 'utf8', 
    stdio: 'inherit',
    timeout: 30000 
  });
  console.log('[OK] Projeto linkado!\n');
} catch (e) {
  console.log('[AVISO] Link pode ja existir, continuando...\n');
}

// Step 5: Deploy each function
console.log('========================================');
console.log('  Deployando Edge Functions');
console.log('========================================\n');

let deployed = 0;
let failed = 0;
const errors = [];

for (const name of existingFunctions) {
  process.stdout.write(`Deployando ${name}... `);
  try {
    execSync(`npx supabase functions deploy ${name} --project-ref ${PROJECT_REF}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });
    console.log('\x1b[32m[OK]\x1b[0m');
    deployed++;
  } catch (e) {
    console.log('\x1b[31m[ERRO]\x1b[0m');
    const errMsg = e.stderr || e.message || String(e);
    errors.push({ name, error: errMsg.substring(0, 200) });
    failed++;
  }
}

// Step 6: Summary
console.log('\n========================================');
console.log('  Resultado Final');
console.log('========================================');
console.log(`  Deployados: ${deployed}`);
console.log(`  Falhas: ${failed}`);
console.log(`  Total: ${existingFunctions.length}/${FUNCTION_NAMES.length}`);

if (errors.length > 0) {
  console.log('\n  Erros:');
  for (const err of errors) {
    console.log(`  - ${err.name}: ${err.error}`);
  }
}

if (FUNCTION_NAMES.length - existingFunctions.length > 0) {
  console.log(`\n  Funcoes nao encontradas (${FUNCTION_NAMES.length - existingFunctions.length}):`);
  for (const name of FUNCTION_NAMES) {
    if (!existingFunctions.includes(name)) {
      console.log(`  - ${name}`);
    }
  }
}

console.log('========================================\n');

if (deployed > 0) {
  console.log('Proximo passo: Configure os secrets no projeto destino.');
  console.log('Veja: public/migration-secrets-guide.md\n');
}
