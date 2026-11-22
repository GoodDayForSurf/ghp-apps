#!/data/data/com.termux/files/usr/bin/bash

PORT=80

# не даём телефону усыпить процесс
termux-wake-lock

# запускаем сервер в фоне
node server.js &
NODE_PID=$!

# при выходе (Ctrl+C) останавливаем сервер и снимаем wake-lock
trap 'kill $NODE_PID 2>/dev/null; termux-wake-unlock; echo "Остановлено."' EXIT

# даём серверу секунду на старт
sleep 1

# запускаем туннель и выделяем ссылку
cloudflared tunnel --url http://127.0.0.1:$PORT 2>&1 | while IFS= read -r line; do
  echo "$line"
  if [[ $line =~ (https://[a-z0-9-]+\.trycloudflare\.com) ]]; then
    echo ""
    echo ">>> ССЫЛКА НА ИГРУ: ${BASH_REMATCH[1]}"
    echo ""
  fi
done
