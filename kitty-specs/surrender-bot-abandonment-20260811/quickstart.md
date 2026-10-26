# Проверяемый сценарий

1. Создать локальную трехместную игру с WGT.
2. На первом action prompt проверить текст `Surrender and start bot`, открыть
   confirmation с явным сообщением о боте и подтвердить.
3. Проверить, что тот же player ID присутствует в surrender-state и активен в
   bot manager, но отсутствует в `botPlayerIds`.
4. Довести поколение до solar/WGT и убедиться, что prompt выполняет бот.
5. Перезапустить сервер на сохраненной игре и проверить автоматический resume.
6. Завершить fixture с одним `completed`, одним `surrendered`, одним `left` и
   проверить места 1/2/3 и leave только у `left`.
7. Выполнить action/step, раскрывающий hidden information, и проверить, что оба
   Undo пути показывают browser confirmation, а Cancel не выполняет откат.
8. Запустить focused server tests, `npm run build:tests`, lint затронутых файлов
   и production build.
9. После merge в `main` выполнить staging deploy только из clean exact
   `origin/main`, затем Playwright smoke без console errors.

Текущую prod-игру и ELO при этом не менять.
