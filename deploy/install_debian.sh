#!/usr/bin/env bash
# Instala o GDashboard em servidor Linux (Debian/Ubuntu, incluindo proot).
# Uso: bash deploy/install_debian.sh

set -e

PORT="${PORT:-8080}"
BASE_PATH="${BASE_PATH:-/gdashboard}"
NODE_MAJOR="${NODE_MAJOR:-20}"

echo "==> Atualizando sistema..."
apt-get update
apt-get install -y git curl ca-certificates build-essential python3

echo "==> Verificando Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo "  -> node ausente; instalando Node $NODE_MAJOR via NodeSource..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

NODE_VER="$(node -v)"
echo "  -> node $NODE_VER / npm $([ -x "$(command -v npm)" ] && npm -v || echo ausente)"
if ! command -v npm >/dev/null 2>&1; then
  apt-get install -y npm
fi

echo "==> Clonando/atualizando o projeto..."
if [ ! -d "$HOME/gdashboard" ]; then
  git clone https://github.com/martinirp/gdashboard.git "$HOME/gdashboard"
else
  (cd "$HOME/gdashboard" && git pull)
fi

echo "==> Instalando dependencias da API..."
cd "$HOME/gdashboard/api"
if ! npm install; then
  echo "==> build do sqlite3 falhou; forçando rebuild..."
  npm rebuild sqlite3
  npm install
fi

echo "==> Credencial de login:"
printf "Usuario [admin]: "
read -r AUTH_USER
[ -z "$AUTH_USER" ] && AUTH_USER=admin
printf "Senha: "
stty -echo 2>/dev/null || true
read -r AUTH_PASS
stty echo 2>/dev/null || true
printf "\n"
if [ -z "$AUTH_PASS" ]; then
  echo "!! Senha vazia nao permitida."
  exit 1
fi

{
  echo "PORT='$PORT'"
  echo "BASE_PATH='$BASE_PATH'"
  echo "AUTH_USER='$AUTH_USER'"
  echo "AUTH_PASS='$AUTH_PASS'"
} > "$HOME/.gdashboard_env"
chmod 600 "$HOME/.gdashboard_env"
echo "==> Configuracao salva em ~/.gdashboard_env"

echo "==> Instalando/batendo processo com nohup..."
RUN_DIR="$HOME/gdashboard/api"
pkill -f "gdashboard/api/src/index.js" 2>/dev/null || true
sleep 1
(
  cd "$RUN_DIR"
  nohup sh -c '. "$HOME/.gdashboard_env"; exec env PORT="$PORT" BASE_PATH="$BASE_PATH" AUTH_USER="$AUTH_USER" AUTH_PASS="$AUTH_PASS" node src/index.js' \
    >> "$HOME/gdashboard.log" 2>&1 &
)
sleep 3

echo "==> Status:"
if curl -fsS -o /dev/null "http://localhost:${PORT}${BASE_PATH:-}" 2>/dev/null; then
  echo "  OK  http://localhost:${PORT}${BASE_PATH:-}"
  echo "  Logs: tail -f ~/gdashboard.log"
  echo "  Parar: pkill -f gdashboard/api/src/index.js"
  echo "  Reabrir ao iniciar o sistema: adicione o comando acima ao ~/.bashrc ou use o systemd."
else
  echo "  !! Nao respondeu ainda. Veja: tail -n 50 ~/gdashboard.log"
fi