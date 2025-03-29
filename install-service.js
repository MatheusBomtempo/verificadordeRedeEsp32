// Script para instalação do monitor como serviço Windows
// Requer: npm install node-windows -g

const Service = require('node-windows').Service;
const path = require('path');

// Criar um novo objeto de serviço
const svc = new Service({
  name: 'ESP32 Multi-Monitor',
  description: 'Monitor para múltiplos dispositivos ESP32',
  script: path.join(__dirname, 'app.js'),
  nodeOptions: [],
  // Outras opções:
  // workingDirectory: '...',
  // allowServiceLogon: true
});

// Listen para eventos
svc.on('install', function() {
  console.log('Serviço instalado com sucesso!');
  console.log('Iniciando serviço...');
  svc.start();
});

svc.on('start', function() {
  console.log('Serviço iniciado!');
  console.log('\nPara acessar o monitor, abra seu navegador e vá para:');
  console.log('http://localhost:3000');
});

svc.on('alreadyinstalled', function() {
  console.log('O serviço já está instalado.');
});

svc.on('error', function(err) {
  console.error('Erro durante a instalação do serviço:', err);
  console.log('\nÉ necessário instalar node-windows:');
  console.log('npm install -g node-windows');
});

// Instalar o serviço
console.log('Instalando o serviço ESP32 Multi-Monitor...');
svc.install();