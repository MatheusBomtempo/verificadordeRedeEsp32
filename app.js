// Monitor de ESP32 com interface simplificada
// Este script garantidamente permite adicionar dispositivos ESP32

const express = require('express');
const ping = require('ping');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

// Configuração do aplicativo
const app = express();
const PORT = 3000;

// Ativar parser para JSON e formulários
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Arquivo para armazenar os dispositivos
const DEVICES_FILE = 'esp32_devices.json';

// Array para armazenar os dispositivos ESP32
let esp32Devices = [];

// Objeto para armazenar o status de todos os dispositivos
let deviceStatuses = {};

// Função para salvar dispositivos no arquivo
function saveDevicesToFile() {
  try {
    fs.writeFileSync(DEVICES_FILE, JSON.stringify(esp32Devices, null, 2));
    console.log('Dispositivos salvos no arquivo');
  } catch (error) {
    console.error('Erro ao salvar dispositivos no arquivo:', error);
  }
}

// Função para carregar dispositivos do arquivo
function loadDevicesFromFile() {
  try {
    if (fs.existsSync(DEVICES_FILE)) {
      const data = fs.readFileSync(DEVICES_FILE, 'utf8');
      esp32Devices = JSON.parse(data);
      console.log(`${esp32Devices.length} dispositivos carregados do arquivo`);
      
      // Inicializar o status para cada dispositivo
      esp32Devices.forEach(device => {
        deviceStatuses[device.id] = {
          online: false,
          lastSeen: null,
          pingMs: null,
          lastChecked: new Date().toISOString(),
          pingStatus: false,
          serviceStatus: false
        };
      });
    } else {
      console.log('Arquivo de dispositivos não encontrado. Iniciando com lista vazia.');
      esp32Devices = [];
    }
  } catch (error) {
    console.error('Erro ao carregar dispositivos do arquivo:', error);
    esp32Devices = [];
  }
}

// Função para verificar ping
async function checkPing(ipAddress) {
  try {
    const result = await ping.promise.probe(ipAddress, {
      timeout: 2,
      extra: ['-n', '1'],
    });
    
    return {
      isAlive: result.alive,
      pingTime: result.time
    };
  } catch (error) {
    console.error(`Erro ao executar ping para ${ipAddress}:`, error);
    return { isAlive: false, pingTime: null };
  }
}

// Função para atualizar o status de um dispositivo específico
async function updateDeviceStatus(device) {
  try {
    const { id, ip } = device;
    
    // Verifica status por ping
    const { isAlive, pingTime } = await checkPing(ip);
    
    // Consideramos o dispositivo online apenas com base no ping
    const isOnline = isAlive;
    
    // Inicializa o objeto de status se não existir
    if (!deviceStatuses[id]) {
      deviceStatuses[id] = {
        online: false,
        lastSeen: null,
        pingMs: null,
        lastChecked: new Date().toISOString(),
        pingStatus: false
      };
    }
    
    // Atualiza os valores
    const now = new Date();
    deviceStatuses[id].online = isOnline;
    deviceStatuses[id].pingMs = pingTime;
    deviceStatuses[id].lastChecked = now.toISOString();
    deviceStatuses[id].pingStatus = isAlive;
    
    if (isOnline) {
      deviceStatuses[id].lastSeen = now.toISOString();
    }
    
    console.log(`Dispositivo ${device.name} (${ip}): ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
  }
}

// Função para atualizar todos os dispositivos
async function updateAllDevices() {
  for (const device of esp32Devices) {
    await updateDeviceStatus(device);
  }
}

// Configuração de rotas API
app.get('/api/devices', (req, res) => {
  const devicesWithStatus = esp32Devices.map(device => {
    return {
      ...device,
      status: deviceStatuses[device.id] || {
        online: false,
        lastSeen: null,
        pingMs: null,
        lastChecked: new Date().toISOString(),
        pingStatus: false
      }
    };
  });
  
  res.json(devicesWithStatus);
});

app.post('/api/device', (req, res) => {
  const { name, ip } = req.body;
  
  if (!name || !ip) {
    return res.status(400).json({ error: 'Nome e IP são obrigatórios' });
  }
  
  // Verificar se o dispositivo já existe
  const existingDevice = esp32Devices.find(d => d.ip === ip);
  if (existingDevice) {
    return res.status(400).json({ error: 'Um dispositivo com este IP já existe' });
  }
  
  // Criar novo dispositivo
  const newDevice = {
    id: Date.now().toString(),
    name,
    ip,
    dateAdded: new Date().toISOString()
  };
  
  // Adicionar ao array
  esp32Devices.push(newDevice);
  
  // Salvar no arquivo
  saveDevicesToFile();
  
  // Verificar status imediatamente
  updateDeviceStatus(newDevice);
  
  // Retornar o novo dispositivo
  res.status(201).json(newDevice);
});

app.delete('/api/device/:id', (req, res) => {
  const deviceId = req.params.id;
  
  // Verificar se o dispositivo existe
  const deviceIndex = esp32Devices.findIndex(d => d.id === deviceId);
  if (deviceIndex === -1) {
    return res.status(404).json({ error: 'Dispositivo não encontrado' });
  }
  
  // Remover do array
  esp32Devices.splice(deviceIndex, 1);
  
  // Remover status
  delete deviceStatuses[deviceId];
  
  // Salvar no arquivo
  saveDevicesToFile();
  
  // Retornar sucesso
  res.json({ success: true });
});

app.post('/api/check-all', async (req, res) => {
  await updateAllDevices();
  res.json({ success: true, message: 'Verificação de todos os dispositivos realizada' });
});

// Página HTML principal embutida
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monitor de ESP32</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
          }
          h1, h2 {
              color: #333;
          }
          .container {
              max-width: 1200px;
              margin: 0 auto;
          }
          .card {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              padding: 20px;
              margin-bottom: 20px;
          }
          .button {
              background-color: #4CAF50;
              color: white;
              border: none;
              padding: 10px 15px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              margin-right: 10px;
          }
          .button-blue {
              background-color: #2196F3;
          }
          .button-red {
              background-color: #f44336;
          }
          .form-group {
              margin-bottom: 15px;
          }
          .form-group label {
              display: block;
              margin-bottom: 5px;
              font-weight: bold;
          }
          .form-group input {
              width: 100%;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 16px;
          }
          .device-list {
              margin-top: 20px;
          }
          .device-item {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              padding: 15px;
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              cursor: pointer;
              transition: transform 0.2s;
          }
          .device-item:hover {
              transform: translateY(-3px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          }
          .device-info {
              flex-grow: 1;
          }
          .device-name {
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 5px;
          }
          .device-ip {
              color: #666;
              margin-bottom: 5px;
          }
          .status-indicator {
              display: inline-block;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              margin-right: 8px;
          }
          .online {
              background-color: #4CAF50;
          }
          .offline {
              background-color: #F44336;
          }
          .controls {
              display: flex;
              justify-content: flex-end;
              gap: 8px;
          }
          .loading {
              display: inline-block;
              width: 20px;
              height: 20px;
              border: 3px solid rgba(0,0,0,0.1);
              border-radius: 50%;
              border-top-color: #007BFF;
              animation: spin 1s ease-in-out infinite;
              margin-left: 10px;
          }
          @keyframes spin {
              to { transform: rotate(360deg); }
          }
          #main-view, #detail-view {
              transition: opacity 0.3s;
          }
          .detail-card {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              padding: 20px;
              margin-bottom: 20px;
          }
          .detail-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
          }
          .detail-name {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
          }
          .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #eee;
          }
          .detail-label {
              font-weight: bold;
              color: #555;
          }
          .back-button {
              display: flex;
              align-items: center;
              background-color: #f0f0f0;
              border: none;
              padding: 8px 15px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              margin-bottom: 15px;
          }
          .back-button:hover {
              background-color: #e0e0e0;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div id="main-view">
              <h1>Monitor de ESP32</h1>
              
              <div class="card">
                  <h2>Adicionar Novo Dispositivo</h2>
                  <form id="add-form">
                      <div class="form-group">
                          <label for="device-name">Nome do Dispositivo:</label>
                          <input type="text" id="device-name" required placeholder="Ex: ESP32 RFID">
                      </div>
                      <div class="form-group">
                          <label for="device-ip">Endereço IP:</label>
                          <input type="text" id="device-ip" required placeholder="Ex: 192.168.2.169">
                      </div>
                      <button type="submit" class="button">Adicionar</button>
                  </form>
              </div>
              
              <div class="card">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                      <h2>Dispositivos</h2>
                      <button id="check-all" class="button">Verificar Todos</button>
                  </div>
                  <div id="devices-container" class="device-list">
                      <div id="loading" style="text-align: center; padding: 20px;">
                          <div class="loading"></div>
                          <p>Carregando dispositivos...</p>
                      </div>
                  </div>
              </div>
          </div>
          
          <div id="detail-view" style="display: none;">
              <button id="back-button" class="back-button">
                  &larr; Voltar para lista
              </button>
              
              <div class="detail-card">
                  <div class="detail-header">
                      <h2 id="detail-device-name" class="detail-name">Nome do Dispositivo</h2>
                      <div id="detail-status" class="status-text">
                          <span class="status-indicator offline"></span>
                          Offline
                      </div>
                  </div>
                  
                  <div class="detail-content">
                      <div class="detail-row">
                          <span class="detail-label">Endereço IP:</span>
                          <span id="detail-ip">-</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Status:</span>
                          <span id="detail-online-status">-</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Ping:</span>
                          <span id="detail-ping">-</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Último check:</span>
                          <span id="detail-last-checked">-</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Visto por último:</span>
                          <span id="detail-last-seen">-</span>
                      </div>
                      <div class="detail-row">
                          <span class="detail-label">Adicionado em:</span>
                          <span id="detail-date-added">-</span>
                      </div>
                  </div>
                  
                  <div style="margin-top: 20px;">
                      <button id="detail-check-button" class="button">Verificar Agora</button>
                  </div>
              </div>
              
              <div class="detail-card">
                  <h2>Informações de Rede</h2>
                  <div class="detail-row">
                      <span class="detail-label">Resposta Ping:</span>
                      <span id="detail-ping-status">-</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Latência média:</span>
                      <span id="detail-avg-ping">-</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Uptime estimado:</span>
                      <span id="detail-uptime">-</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Monitorando desde:</span>
                      <span id="detail-monitoring-since">-</span>
                  </div>
              </div>
          </div>
      </div>

      <script>
          // Estado da aplicação
          let devicesList = [];
          let currentDeviceId = null;
          
          // Formatação de data e tempo
          function formatDateTime(dateString) {
              if (!dateString) return 'Nunca';
              const date = new Date(dateString);
              return date.toLocaleString('pt-BR');
          }
          
          function timeAgo(dateString) {
              if (!dateString) return 'Nunca';
              
              const date = new Date(dateString);
              const now = new Date();
              const diff = Math.floor((now - date) / 1000); // diferença em segundos
              
              if (diff < 60) return \`\${diff} segundos atrás\`;
              if (diff < 3600) return \`\${Math.floor(diff / 60)} minutos atrás\`;
              if (diff < 86400) return \`\${Math.floor(diff / 3600)} horas atrás\`;
              return \`\${Math.floor(diff / 86400)} dias atrás\`;
          }
          
          // Calcular tempo estimado de atividade
          function calculateUptime(lastSeen, dateAdded) {
              if (!lastSeen) return 'Desconhecido';
              
              const lastSeenDate = new Date(lastSeen);
              const addedDate = new Date(dateAdded);
              const now = new Date();
              
              // Se nunca foi visto online, retorna "Desconhecido"
              if (lastSeen === 'Nunca') return 'Desconhecido';
              
              // Calcula o tempo desde que foi adicionado em horas
              const hoursMonitoring = Math.floor((now - addedDate) / (1000 * 60 * 60));
              
              // Tempo desde o último avistamento em horas
              const hoursSinceLastSeen = Math.floor((now - lastSeenDate) / (1000 * 60 * 60));
              
              // Se foi visto recentemente (nas últimas 2 horas), consideramos que está online desde que foi adicionado
              if (hoursSinceLastSeen <= 2) {
                  return \`Aproximadamente \${hoursMonitoring} horas\`;
              }
              
              // Caso contrário, estimamos com base no último avistamento
              return \`Pelo menos \${hoursSinceLastSeen} horas\`;
          }
          
          // Funções para manipular os dispositivos
          function loadDevices() {
              const devicesContainer = document.getElementById('devices-container');
              devicesContainer.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="loading"></div><p>Carregando dispositivos...</p></div>';
              
              fetch('/api/devices')
                  .then(response => response.json())
                  .then(devices => {
                      devicesList = devices;
                      
                      if (devices.length === 0) {
                          devicesContainer.innerHTML = '<p style="text-align: center;">Nenhum dispositivo adicionado.</p>';
                          return;
                      }
                      
                      let html = '';
                      devices.forEach(device => {
                          const status = device.status;
                          const isOnline = status.online;
                          
                          html += \`
                              <div class="device-item" data-id="\${device.id}">
                                  <div class="device-info" data-id="\${device.id}">
                                      <div class="device-name">
                                          <span class="status-indicator \${isOnline ? 'online' : 'offline'}"></span>
                                          \${device.name}
                                      </div>
                                      <div class="device-ip">IP: \${device.ip}</div>
                                      <div>Status: \${isOnline ? 'Online' : 'Offline'}</div>
                                      <div>Ping: \${status.pingMs ? status.pingMs + ' ms' : 'N/A'}</div>
                                  </div>
                                  <div class="controls">
                                      <button class="button check-button" data-id="\${device.id}">Verificar</button>
                                      <button class="button button-red delete-button" data-id="\${device.id}">Remover</button>
                                  </div>
                              </div>
                          \`;
                      });
                      
                      devicesContainer.innerHTML = html;
                      
                      // Adicionar event listeners
                      document.querySelectorAll('.device-info').forEach(info => {
                          info.addEventListener('click', function() {
                              const deviceId = this.getAttribute('data-id');
                              showDeviceDetails(deviceId);
                          });
                      });
                      
                      document.querySelectorAll('.check-button').forEach(button => {
                          button.addEventListener('click', function(e) {
                              e.stopPropagation(); // Impedir que o clique propague para o item pai
                              const deviceId = this.getAttribute('data-id');
                              checkDevice(deviceId);
                          });
                      });
                      
                      document.querySelectorAll('.delete-button').forEach(button => {
                          button.addEventListener('click', function(e) {
                              e.stopPropagation(); // Impedir que o clique propague para o item pai
                              const deviceId = this.getAttribute('data-id');
                              if (confirm('Tem certeza que deseja remover este dispositivo?')) {
                                  deleteDevice(deviceId);
                              }
                          });
                      });
                  })
                  .catch(error => {
                      console.error('Erro ao carregar dispositivos:', error);
                      devicesContainer.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar dispositivos.</p>';
                  });
          }
          
          function showDeviceDetails(deviceId) {
              currentDeviceId = deviceId;
              
              // Ocultar tela principal e mostrar tela de detalhes
              document.getElementById('main-view').style.display = 'none';
              document.getElementById('detail-view').style.display = 'block';
              
              // Buscar informações do dispositivo
              loadDeviceDetails(deviceId);
          }
          
          function loadDeviceDetails(deviceId) {
              fetch(\`/api/device/\${deviceId}\`)
                  .then(response => {
                      if (!response.ok) {
                          throw new Error('Dispositivo não encontrado');
                      }
                      return response.json();
                  })
                  .then(data => {
                      const { device, status } = data;
                      
                      // Atualizar informações básicas
                      document.getElementById('detail-device-name').textContent = device.name;
                      document.getElementById('detail-ip').textContent = device.ip;
                      document.getElementById('detail-online-status').textContent = status.online ? 'Online' : 'Offline';
                      document.getElementById('detail-ping').textContent = status.pingMs ? \`\${status.pingMs} ms\` : 'N/A';
                      document.getElementById('detail-last-checked').textContent = formatDateTime(status.lastChecked);
                      document.getElementById('detail-last-seen').textContent = status.lastSeen ? timeAgo(status.lastSeen) : 'Nunca';
                      document.getElementById('detail-date-added').textContent = formatDateTime(device.dateAdded);
                      
                      // Atualizar indicador de status
                      const statusIndicator = document.getElementById('detail-status');
                      statusIndicator.innerHTML = \`
                          <span class="status-indicator \${status.online ? 'online' : 'offline'}"></span>
                          \${status.online ? 'Online' : 'Offline'}
                      \`;
                      
                      // Atualizar informações adicionais de rede
                      document.getElementById('detail-ping-status').textContent = status.pingStatus ? 'Sim' : 'Não';
                      document.getElementById('detail-avg-ping').textContent = status.pingMs ? \`\${status.pingMs} ms\` : 'N/A';
                      document.getElementById('detail-uptime').textContent = calculateUptime(status.lastSeen, device.dateAdded);
                      document.getElementById('detail-monitoring-since').textContent = formatDateTime(device.dateAdded);
                      
                      // Configurar botão de check
                      const checkButton = document.getElementById('detail-check-button');
                      checkButton.onclick = function() {
                          checkDeviceFromDetails(deviceId);
                      };
                  })
                  .catch(error => {
                      alert('Erro ao carregar detalhes do dispositivo: ' + error.message);
                      backToList();
                  });
          }
          
          function backToList() {
              // Ocultar tela de detalhes e mostrar tela principal
              document.getElementById('detail-view').style.display = 'none';
              document.getElementById('main-view').style.display = 'block';
              currentDeviceId = null;
          }
          
          function addDevice(name, ip) {
              fetch('/api/device', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ name, ip })
              })
              .then(response => {
                  if (!response.ok) {
                      return response.json().then(data => {
                          throw new Error(data.error || 'Erro ao adicionar dispositivo');
                      });
                  }
                  return response.json();
              })
              .then(data => {
                  loadDevices();
                  document.getElementById('device-name').value = '';
                  document.getElementById('device-ip').value = '';
                  alert('Dispositivo adicionado com sucesso!');
              })
              .catch(error => {
                  alert(error.message);
              });
          }
          
          function checkDevice(id) {
              const deviceItem = document.querySelector(\`.device-item[data-id="\${id}"]\`);
              const checkBtn = deviceItem.querySelector('.check-button');
              
              checkBtn.disabled = true;
              checkBtn.innerHTML = '<div class="loading" style="width: 12px; height: 12px; margin: 0;"></div>';
              
              fetch(\`/api/device/\${id}/check\`, {
                  method: 'POST'
              })
              .then(response => response.json())
              .then(data => {
                  loadDevices();
              })
              .catch(error => {
                  checkBtn.disabled = false;
                  checkBtn.textContent = 'Verificar';
                  alert('Erro ao verificar dispositivo');
              });
          }
          
          function checkDeviceFromDetails(id) {
              const checkBtn = document.getElementById('detail-check-button');
              
              checkBtn.disabled = true;
              checkBtn.innerHTML = '<div class="loading" style="width: 12px; height: 12px; margin: 0;"></div> Verificando';
              
              fetch(\`/api/device/\${id}/check\`, {
                  method: 'POST'
              })
              .then(response => response.json())
              .then(data => {
                  loadDeviceDetails(id);
                  checkBtn.disabled = false;
                  checkBtn.textContent = 'Verificar Agora';
              })
              .catch(error => {
                  checkBtn.disabled = false;
                  checkBtn.textContent = 'Verificar Agora';
                  alert('Erro ao verificar dispositivo');
              });
          }
          
          function checkAllDevices() {
              const checkAllBtn = document.getElementById('check-all');
              
              checkAllBtn.disabled = true;
              checkAllBtn.innerHTML = '<div class="loading" style="width: 12px; height: 12px; margin: 0;"></div> Verificando';
              
              fetch('/api/check-all', {
                  method: 'POST'
              })
              .then(response => response.json())
              .then(data => {
                  loadDevices();
                  
                  // Se estiver na tela de detalhes, atualizar os detalhes também
                  if (currentDeviceId) {
                      loadDeviceDetails(currentDeviceId);
                  }
                  
                  checkAllBtn.disabled = false;
                  checkAllBtn.textContent = 'Verificar Todos';
              })
              .catch(error => {
                  checkAllBtn.disabled = false;
                  checkAllBtn.textContent = 'Verificar Todos';
                  alert('Erro ao verificar dispositivos');
              });
          }
          
          function deleteDevice(id) {
              fetch(\`/api/device/\${id}\`, {
                  method: 'DELETE'
              })
              .then(response => response.json())
              .then(data => {
                  // Se estiver visualizando o dispositivo que foi removido, voltar para a lista
                  if (currentDeviceId === id) {
                      backToList();
                  }
                  
                  loadDevices();
              })
              .catch(error => {
                  alert('Erro ao remover dispositivo');
              });
          }
          
          // Event listeners
          document.getElementById('add-form').addEventListener('submit', function(e) {
              e.preventDefault();
              const name = document.getElementById('device-name').value.trim();
              const ip = document.getElementById('device-ip').value.trim();
              
              if (!name || !ip) {
                  alert('Nome e IP são obrigatórios');
                  return;
              }
              
              addDevice(name, ip);
          });
          
          document.getElementById('check-all').addEventListener('click', checkAllDevices);
          document.getElementById('back-button').addEventListener('click', backToList);
          
          // Inicialização
          document.addEventListener('DOMContentLoaded', function() {
              loadDevices();
              
              // Atualizar a cada minuto
              setInterval(function() {
                  if (currentDeviceId) {
                      loadDeviceDetails(currentDeviceId);
                  } else {
                      loadDevices();
                  }
              }, 60000);
          });
      </script>
  </body>
  </html>
  `);
});

// Adicionar rota para verificar um dispositivo específico
app.post('/api/device/:id/check', async (req, res) => {
  const deviceId = req.params.id;
  const device = esp32Devices.find(d => d.id === deviceId);
  
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo não encontrado' });
  }
  
  await updateDeviceStatus(device);
  
  res.json({ 
    success: true, 
    message: 'Dispositivo verificado', 
    device, 
    status: deviceStatuses[device.id] 
  });
});

// Função para verificar informações de rede adicionais
app.get('/api/device/:id', (req, res) => {
  const deviceId = req.params.id;
  const device = esp32Devices.find(d => d.id === deviceId);
  
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo não encontrado' });
  }
  
  res.json({ 
    device, 
    status: deviceStatuses[device.id] || {
      online: false,
      lastSeen: null,
      pingMs: null,
      lastChecked: new Date().toISOString(),
      pingStatus: false
    } 
  });
});

// Carregar dispositivos do arquivo
loadDevicesFromFile();

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Monitor de ESP32 iniciado em http://localhost:${PORT}`);
  
  // Iniciar o monitoramento periódico de todos os dispositivos
  updateAllDevices();
  setInterval(updateAllDevices, 30000); // Verifica a cada 30 segundos
});