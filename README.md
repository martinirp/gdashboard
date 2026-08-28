# GDashboard

Dashboard de monitoramento de guildas de Tibia com alerta de **masslog**.

- Login protegido (token 24h)
- Rastreia guildas (online/offline, tempo de sessão)
- Alerta de masslog: dispara quando **X jogadores conectam em N minutos** (ignora quem já estava online)
- Som + notificação no navegador e (opcional) webhook do Discord
- API e frontend rodam em **um processo só**

## Rodando local

```bash
npm install
npm start
```

Abra `http://localhost:4000` — login padrão: `admin` / `admin`.

## Variáveis de ambiente

| Variável   | Default | Descrição                                    |
|------------|---------|----------------------------------------------|
| `PORT`     | `4000`  | Porta do servidor                            |
| `BASE_PATH`| ``      | Prefixo da URL (ex: `/gdashboard`)           |
| `AUTH_USER`| `admin` | Usuário do login                             |
| `AUTH_PASS`| `admin` | Senha do login (troque!)                     |

## Deploy no Termux (Android)

```bash
pkg update && pkg upgrade
pkg install git nodejs-lts python binutils make
git clone https://github.com/martinirp/gdashboard.git
cd gdashboard/api
npm install

# rodar (ajuste AUTH_PASS!)
PORT=8080 BASE_PATH=/gdashboard AUTH_USER=admin AUTH_PASS='SUASENHA' node src/index.js
```

Disponível em `http://SEU-IP:8080/gdashboard`.

Para manter rodando em segundo plano e sobreviver a fechamentos:

```bash
pkg install termux-services
sv-enable gdashboard  # configure antes o init do serviço
```

ou, no modo simples:

```bash
mkdir -p ~/bin gdashboard
nohup bash -c 'cd ~/gdashboard/api && PORT=8080 BASE_PATH=/gdashboard node src/index.js' > ~/gdashboard.log 2>&1 &
```

> Dica: se a instalação do `sqlite3` falhar ao compilar, instale o pacote `build-essential` e rode `npm rebuild sqlite3`.

## Extra

O banco `api/database.sqlite` e `node_modules` **não** são versionados (`.gitignore`).

Para adicionar outra guild ao rastreamento:

```bash
curl -X POST http://localhost:8080/gdashboard/api/tracking/guild \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"guildName":"Nome da Guild"}'
```