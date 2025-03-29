# Monitor de ESP32

Uma ferramenta simples para monitorar o status de dispositivos ESP32 na sua rede local.

![Monitor ESP32](https://i.imgur.com/xGVV5aA.png)

## O que este monitor faz:

- Verifica se seus dispositivos ESP32 estão online usando ping
- Monitora múltiplos dispositivos ao mesmo tempo
- Interface web fácil de usar
- Detalhes completos do status de cada dispositivo
- Verificação automática a cada 30 segundos

## Requisitos

- Windows 7/10/11
- [Node.js](https://nodejs.org/) (versão LTS recomendada)

## Instalação Rápida

1. **Baixe os arquivos** para uma pasta no seu computador
2. **instale o npm** Dê `npm i`  par intalar o package.json
3. **Dê um duplo clique** em `iniciar-monitor.bat` ou `npm start`
4. **Abra seu navegador** e acesse http://localhost:3000

## Guia de Uso

### Adicionar um ESP32

1. No formulário "Adicionar Novo Dispositivo":
   - Digite um nome para identificar o dispositivo
   - Digite o endereço IP do dispositivo (exemplo: 192.168.2.169)
   - Clique em "Adicionar"

### Verificar Status

- **Verificar um dispositivo**: Clique no botão "Verificar" ao lado do dispositivo
- **Verificar todos**: Clique no botão "Verificar Todos" no topo da lista

### Ver Detalhes

1. Clique em qualquer dispositivo na lista
2. A tela de detalhes mostrará:
   - Status atual (online/offline)
   - Tempo de ping
   - Última vez visto online
   - Informações de rede
3. Para voltar à lista, clique em "← Voltar para lista"

### Remover um Dispositivo

- Clique no botão "Remover" ao lado do dispositivo que deseja excluir

## Solução de Problemas

### O monitor não inicia

- Verifique se o Node.js está instalado corretamente
- Tente fechar e abrir novamente o prompt de comando
- Verifique se a porta 3000 não está sendo usada por outro programa

### Dispositivo sempre aparece offline

- Verifique se o dispositivo está ligado e conectado à rede
- Confirme se o IP está correto
- Teste manualmente com ping no prompt de comando: `ping 192.168.2.169`
- Verifique se o computador e o ESP32 estão na mesma rede

## Observações

- Os dispositivos adicionados ficam salvos permanentemente
- A verificação acontece automaticamente a cada 30 segundos
- O monitor considera o dispositivo online se responder ao ping