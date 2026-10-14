# Если ничего не работает

Иди сверху вниз. Не начинай переустанавливать Windows.

## 1. Проверить Node.js

```bash
node --version
npm --version
```

Для этого проекта нужен Node.js **>= 20.19**. Рекомендуется Node.js 22 LTS.

Если команда `node` не найдена — установи Node.js и перезапусти терминал / VS Code.

## 2. Проверить Git

```bash
git --version
```

Если команда не найдена — установи Git.

## 3. Зависимости

В корне проекта:

```bash
npm install
```

Должна появиться папка `node_modules`.

Если установка сломалась непонятным образом:

### Windows PowerShell

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

### macOS / Linux

```bash
rm -rf node_modules package-lock.json
npm install
```

После успешной установки **закоммить новый `package-lock.json`**.

## 4. Запуск

```bash
npm run dev
```

Открой адрес, который напечатал Vite.

Если порт 5173 занят — это нормально: Vite автоматически выберет другой.

## 5. Белый / пустой экран

Открой DevTools браузера:

- Windows/Linux: `F12` или `Ctrl+Shift+I`
- macOS: `Cmd+Option+I`

Перейди в **Console** и прочитай первую красную ошибку.

Не присылай AI фразу «не работает». Пришли ему **точный текст ошибки**.

## 6. TypeScript

```bash
npm run typecheck
```

Исправляй ошибки сверху вниз.

## 7. Проверка финальной сборки

```bash
npm run build
```

Если dev-режим работает, а build нет — ориентируйся на сообщение этой команды.

## 8. GitHub Pages не публикуется

Проверь:

1. код находится в ветке `main`;
2. **Settings → Pages → Source = GitHub Actions**;
3. во вкладке **Actions** workflow не красный;
4. если он красный — открой упавший шаг и читай первую реальную ошибку.

## 9. Всё сломано после большого AI-изменения

Посмотри diff:

```bash
git diff
```

Если до изменения был commit, можно вернуть отдельный файл:

```bash
git restore path/to/file
```

Или отменить все незакоммиченные изменения:

```bash
git restore .
```

**Не выполняй команды сброса Git, если не понимаешь, какие изменения потеряешь.**

## 10. Что отправить преподавателю / AI при проблеме

Минимум:

- что пытался сделать;
- какая команда была запущена;
- полный текст первой ошибки;
- `node --version`;
- что уже пробовал.
