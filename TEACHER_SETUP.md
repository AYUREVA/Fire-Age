# Подготовка шаблона преподавателем

## Один раз перед курсом

1. Создать пустой репозиторий на GitHub, например `game-dev-starter`.
2. Загрузить содержимое этой папки.
3. Выполнить локально:

```bash
npm install
npm run build
```

4. Закоммитить `package-lock.json`.
5. Push в `main`.
6. GitHub: **Settings → Pages → Source → GitHub Actions**.
7. Дождаться зелёного workflow `Deploy to GitHub Pages`.
8. GitHub: **Settings → General → Template repository** — включить.

После этого студент нажимает **Use this template → Create a new repository** и получает собственную копию без fork-связи.

## Перед первой практикой

Попросить студентов заранее установить:

- Node.js 22 LTS;
- Git;
- VS Code;
- создать GitHub-аккаунт;
- по возможности активировать GitHub Education / Copilot Student.

На паре иметь запасной вариант AI: Copilot Free или другой бесплатный агент.
