#!/bin/bash

echo "🚀 Iniciando GDashboard (API + frontend em um processo)..."
echo "   Porta: ${PORT:-4000} | Base path: ${BASE_PATH:-/}"

cd api && npm start

trap "exit" INT
wait