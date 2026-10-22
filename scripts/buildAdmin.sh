#!/usr/bin/env bash
# Build estático de admin (rama actual + cambios sin commitear) para servirlo en localhost:3000 desde los tests.
set -euo pipefail

ADMIN_DIR="$(cd "$(dirname "$0")/../../admin" && pwd)"
ADMIN_NODE_VERSION="${ADMIN_NODE_VERSION:-16.2.0}"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    echo "❌ No se encontró nvm en $NVM_DIR (admin necesita Node $ADMIN_NODE_VERSION: react-scripts 4 no buildea en Node 17+)" >&2
    exit 1
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

cd "$ADMIN_DIR"
nvm use "$ADMIN_NODE_VERSION" >/dev/null

if [ ! -d node_modules ]; then
    echo "📦 admin sin node_modules, instalando..."
    npm install
fi

RAMA="$(git branch --show-current 2>/dev/null || echo "?")"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "?")"
SUCIO=""
if [ -n "$(git status --porcelain -- src 2>/dev/null)" ]; then
    SUCIO=" + cambios sin commitear en src/"
fi
echo "🔨 Buildeando admin desde $RAMA ($COMMIT)$SUCIO con Node $(node -v)..."

# .env.production pisa a .env en el build y apunta a producción: las variables de entorno le ganan a ambos.
REACT_APP_AUTH0_CACHE=localstorage \
REACT_APP_URL=http://localhost:3000/ \
REACT_APP_CALLBACK_URL=http://localhost:3000/callback \
    npm run build

cat > build/polko-build.json <<EOF
{ "rama": "$RAMA", "commit": "$COMMIT", "sucio": $([ -n "$SUCIO" ] && echo true || echo false), "fecha": "$(date -u +%Y-%m-%dT%H:%M:%SZ)" }
EOF
echo "✅ Build de admin listo en $ADMIN_DIR/build ($RAMA @ $COMMIT)"
