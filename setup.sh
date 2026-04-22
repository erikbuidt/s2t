#!/usr/bin/env bash
set -e

echo "🔧  s2t Setup Script"
echo "════════════════════"

# 1. Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌  Node.js not found. Install from https://nodejs.org or via nvm."
  exit 1
fi
echo "✅  Node.js $(node -v)"

# 2. Install npm packages
echo "📦  Installing Node.js dependencies..."
npm install --ignore-scripts
echo "✅  npm packages installed"

# 3. Check ffmpeg
if command -v ffmpeg &> /dev/null; then
  echo "✅  ffmpeg found: $(ffmpeg -version 2>&1 | head -1)"
else
  echo ""
  echo "⚠️   ffmpeg not found. yt-dlp needs ffmpeg to convert audio formats."
  echo "    Install with:"
  echo "      brew install ffmpeg    (Homebrew)"
  echo "      sudo apt install ffmpeg  (Ubuntu/Debian)"
  echo ""
fi

# 4. Check yt-dlp
if command -v yt-dlp &> /dev/null; then
  echo "✅  yt-dlp found: $(yt-dlp --version)"
else
  # Try pip install
  echo "📦  Installing yt-dlp via pip..."
  python3 -m pip install yt-dlp --quiet 2>&1 || true

  # Check common locations
  YTDLP_PATH=""
  for p in \
    "$HOME/Library/Python/3.9/bin/yt-dlp" \
    "$HOME/Library/Python/3.10/bin/yt-dlp" \
    "$HOME/Library/Python/3.11/bin/yt-dlp" \
    "$HOME/Library/Python/3.12/bin/yt-dlp" \
    "/usr/local/bin/yt-dlp" \
    "/opt/homebrew/bin/yt-dlp"; do
    if [ -f "$p" ]; then
      YTDLP_PATH="$p"
      break
    fi
  done

  if [ -n "$YTDLP_PATH" ]; then
    echo "✅  yt-dlp installed at: $YTDLP_PATH"
  else
    echo "❌  yt-dlp could not be installed. Please install manually:"
    echo "    pip3 install yt-dlp"
  fi
fi

# 5. Check .env
if [ ! -f ".env" ] || grep -q "your_gemini_api_key_here" ".env"; then
  echo ""
  echo "⚠️   Please set your Gemini API key in .env:"
  echo "    GEMINI_API_KEY=your_key_here"
  echo "    Get a free key at: https://aistudio.google.com/app/apikey"
else
  echo "✅  .env configured"
fi

echo ""
echo "🎉  Setup complete! Run with:"
echo "    npx ts-node src/fb-s2t.ts <facebook-video-url> [transcript|summary|both]"
