#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME=${1:-"my-new-project"}
TARGET_DIR=${2:-"../$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')"}

if [ -e "$TARGET_DIR" ]; then
  echo "❌ Target already exists: $TARGET_DIR"
  exit 1
fi

echo "🚀 Creating new project: $PROJECT_NAME"

cp -R . "$TARGET_DIR"
cd "$TARGET_DIR"

rm -rf .git
rm -f .DS_Store
find . -name '.DS_Store' -delete

git init -b main >/dev/null

NEW_NAME=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
NEW_NAME_PASCAL=$(echo "$PROJECT_NAME" | sed -E 's/(^|[ -])([a-zA-Z]) /\U\2/g; s/(^|[ -])([a-zA-Z])/\U\2/g; s/[ -]//g')

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o -name "*.env*" -o -name "Makefile" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -exec sed -i.bak \
    -e "s/typescript-fullstack-template/$NEW_NAME/g" \
    -e "s/TypeScript Fullstack Template/$NEW_NAME_PASCAL/g" {} +

find . -name '*.bak' -delete

cp .env.example .env
if grep -q '^APP_NAME=' .env; then
  sed -i.bak "s/^APP_NAME=.*/APP_NAME=$NEW_NAME_PASCAL/" .env
  rm -f .env.bak
fi

echo ""
echo "✅ Project '$PROJECT_NAME' created at: $TARGET_DIR"
echo ""
echo "📋 Next steps:"
echo "  1. cd $TARGET_DIR"
echo "  2. Cập nhật .env với credentials thực"
echo "  3. pnpm install"
echo "  4. make docker-up"
echo "  5. make db-migrate && make db-seed"
echo "  6. make dev"
