#!/data/data/com.termux/files/usr/bin/sh
# Instala o GDashboard no Termux e o configura como serviço permanente.
# Uso: bash deploy/install_termux.sh

set -e

PORT="${PORT:-8090}"
BASE_PATH="${BASE_PATH:-/gdashboard}"

echo "==> Atualizando pacotes..."
pkg update -y
pkg install -y git nodejs-lts python binutils make

echo "==> Clonando/atualizando o projeto..."
if [ ! -d "$HOME/gdashboard" ]; then
  git clone https://github.com/martinirp/gdashboard.git "$HOME/gdashboard"
else
  (cd "$HOME/gdashboard" && git pull)
fi

echo "==> Instalando dependencias da API..."
cd "$HOME/gdashboard/api"
if ! npm install; then
  echo "==> build do sqlite3 falhou; tentando com build-essential..."
  pkg install -y build-essential
  npm rebuild sqlite3
  npm install
fi

echo "==> Credencial de login:"
printf "Usuario [admin]: "
read AUTH_USER
[ -z "$AUTH_USER" ] && AUTH_USER=admin
printf "Senha: "
stty -echo
read AUTH_PASS
stty echo
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

echo "==> Criando servico do termux-services..."
pkg install -y termux-services
SVC_DIR="$PREFIX/var/service"
mkdir -p "$SVC_DIR/gdashboard/log"

cat > "$SVC_DIR/gdashboard/run" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
exec 2>&1
. \$HOME/.gdashboard_env
cd \$HOME/gdashboard/api
exec env PORT="\$PORT" BASE_PATH="\$BASE_PATH" AUTH_USER="\$AUTH_USER" AUTH_PASS="\$AUTH_PASS" node src/index.js
EOF
chmod +x "$SVC_DIR/gdashboard/run"

cat > "$SVC_DIR/gdashboard/log/run" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
mkdir -p \$HOME/.termux/services/logs/gdashboard
exec svlogd \$HOME/.termux/services/logs/gdashboard
EOF
chmod +x "$SVC_DIR/gdashboard/log/run"

echo "==> Ativando e iniciando..."
sv-enable gdashboard || true
sleep 3
sv status gdashboard || true

echo
echo "Pronto! Se o IP publico do aparelho estiver na porta 8090, acesse:"
echo "  http://SEU-IP-PUBLICO:8090${BASE_PATH:-}"
echo "Logs: ~/.termux/services/logs/gdashboard/"
