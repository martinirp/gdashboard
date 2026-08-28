# Tibia Scraper API

Uma API REST completa e rápida construída em Node.js com Express e Cheerio para extrair e processar dados públicos do site oficial do Tibia. 

O diferencial desta API é o seu **sistema inteligente de monitoramento em tempo real (Tracking)**, que permite contornar a limitação do site do Tibia e descobrir o tempo exato em que os jogadores de uma Guilda efetuaram login, calculando a duração online em minutos.

---

## 🚀 Como Executar Localmente

### 1. Requisitos
- Node.js instalado (v14+)
- NPM ou Yarn

### 2. Instalação
Clone ou baixe este repositório e rode o comando abaixo no terminal dentro da pasta `api` para instalar as dependências:
```bash
npm install
```

### 3. Rodando o Servidor
Para desenvolvimento (utilizando Nodemon, que reinicia o servidor ao salvar mudanças):
```bash
npm run dev
```
Para produção:
```bash
npm start
```
O servidor será iniciado em `http://localhost:3000`.

---

## 📖 Documentação dos Endpoints

A API possui 5 endpoints principais. Todas as requisições e respostas são no formato `JSON`.

### 1. Listar Guildas por Mundo
Retorna a lista completa de todas as guildas ativas e em formação de um servidor específico.

- **URL:** `/api/guilds/:world`
- **Método:** `GET`
- **Exemplo de Uso:** `http://localhost:3000/api/guilds/Antica`
- **Resposta de Sucesso:**
  ```json
  {
    "success": true,
    "world": "Antica",
    "guilds": [
      {
        "name": "Abeyance",
        "description": "Abeyance is a Sorcerer-only guild...",
        "logoUrl": "https://static.tibia.com/images/guildlogos/Abeyance.gif"
      }
    ]
  }
  ```

### 2. Detalhes da Guilda (Com Tempo Online)
Retorna os dados detalhados de uma Guilda, incluindo todos os seus membros, ranking, vocação, e informações exatas de **tempo online** e **hora do login** para guildas rastreadas.

- **URL:** `/api/guilds/:world/:guildName`
- **Método:** `GET`
- **Exemplo de Uso:** `http://localhost:3000/api/guilds/Quelibra/Insanity`
- **Resposta de Sucesso:**
  ```json
  {
    "success": true,
    "world": "Quelibra",
    "guild": {
      "guildName": "Insanity",
      "players": [
        {
          "rank": "Leader",
          "name": "Jogador Exemplo",
          "title": "the Great",
          "vocation": "Elite Knight",
          "level": 500,
          "joiningDate": "Nov 04 2025",
          "status": "online",
          "isOnline": true,
          "loginTime": "2026-06-11T21:00:24.091Z",
          "onlineDurationMinutes": 15
        }
      ]
    }
  }
  ```

### 3. Iniciar Rastreamento (Tracking) de uma Guilda
Inicia o processo invisível em segundo plano. O servidor consultará a guilda no site oficial do Tibia a cada `1 minuto`, comparando os resultados com um banco de dados interno (SQLite). Isso permite que a API registre exatamente que horas um jogador logou.

> **Importante:** Devido a sistemas de proteção contra DDoS do Tibia, recomendamos monitorar apenas as guildas essenciais.

- **URL:** `/api/tracking/guild`
- **Método:** `POST`
- **Body JSON:**
  ```json
  {
    "guildName": "United"
  }
  ```
- **Resposta de Sucesso:**
  ```json
  {
    "success": true,
    "message": "Guild United is now being tracked. Initial sync started."
  }
  ```

### 4. Atalho Específico (United - Ferobra)
Um endpoint otimizado e rápido para buscar diretamente os dados e os mais de 2.600 jogadores da Guilda `United` do servidor `Ferobra`.

- **URL:** `/api/united`
- **Método:** `GET`
- **Exemplo de Uso:** `http://localhost:3000/api/united`
- **Retorno:** Possui o mesmo formato de resposta do endpoint de detalhes da guilda (Item 2).

### 5. Estatísticas de Mortes (Kill Statistics)
Busca a tabela de dados PVE e PVP de um servidor do último dia e da última semana (Monstros e Jogadores Mortos).

- **URL:** `/api/killstatistics/:world`
- **Método:** `GET`
- **Exemplo de Uso:** `http://localhost:3000/api/killstatistics/Ferobra`
- **Resposta de Sucesso:**
  ```json
  {
    "success": true,
    "data": {
      "world": "Ferobra",
      "statistics": [
        {
          "race": "(elemental forces)",
          "lastDay": {
            "killedPlayers": 4,
            "killedByPlayers": 0
          },
          "lastWeek": {
            "killedPlayers": 28,
            "killedByPlayers": 0
          }
        },
        {
          "race": "players",
          "lastDay": {
            "killedPlayers": 12,
            "killedByPlayers": 12
          },
          "lastWeek": {
            "killedPlayers": 85,
            "killedByPlayers": 85
          }
        }
      ]
    }
  }
  ```

---

## 🛠️ Tecnologias Utilizadas
- **Node.js + Express**: Para o servidor HTTP RESTful.
- **Axios**: Para simular o navegador e efetuar requisições ao site oficial do Tibia sem bloqueios.
- **Cheerio**: Ferramenta rápida baseada em jQuery para fazer parsing do HTML e raspagem de dados (Scraping).
- **SQLite3**: Banco de dados relacional leve guardado em arquivo local para persistir dados das sessões dos players sem depender de banco externo.
- **Node-Cron**: Agendador de tarefas em background, essencial para o motor do Tracker em tempo real.
