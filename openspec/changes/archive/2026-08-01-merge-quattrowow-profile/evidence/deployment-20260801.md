# Развёртывание и prod-пересчёт 2026-08-01

## Release

- Task commit: `afb599aa0495c705ffd020b6d117fb72946da07f`
- Staging artifact SHA-256: `36647f7c9550ee515ff623a1cdf9bfb29546e6a927d9f924eb7c59cb0fd96159`
- Staging release: `/home/openclaw/tm-runtime/staging/releases/20260801124114-afb599aa0495c705ffd020b6d117fb72946da07f-local`
- Prod release: `/home/openclaw/tm-runtime/prod/releases/20260801124838-afb599aa0495c705ffd020b6d117fb72946da07f-20260801104836-3175012-4f7db1d1df9a335ede7227724e75ded0`
- До переключения prod указывал на `/home/openclaw/tm-runtime/prod/releases/20260727095827-d9853c3c49f30649a3a6ef8ab1c1cf26e59543ee`.
- Manifest prod подтверждает тот же `gitSha` и `artifactSha256`, что и проверенный staging artifact.

## Защищённое окно и rollback

- Перед изменением остановлен `tm-sync-elo.timer`, завершён oneshot и занят `/tmp/tm-sync-elo.lock`.
- Live-game gate выполнен перед подготовкой и непосредственно перед публичным переключением: `realtime=0`.
- Исходный SHA-256 `elo-data.json`: `d8024e685b7e1d15ab3e57770d7f444abffb15718d2bb68237fbacc4b25cf93d` — тот же hash, на котором выполнена репетиция.
- Backup с контрольными суммами: `/home/openclaw/backups/tm/quattrowow-profile-merge-20260801T104742Z`.
- Rollback: вернуть предыдущий release symlink и восстановить JSON из указанного backup, затем перезапустить `tm-server`, `tm-elo` и `tm-sync-elo.timer`.

## Результат пересчёта

- Игр до/после: `359 / 359`.
- Профилей до/после: `40 / 38`.
- Единственный канонический профиль: `Quattrowow`, placement ELO `1484`, VP ELO `1500`, `10` игр.
- `александр` и `саша` отсутствуют и в агрегате игроков, и в строках результатов.
- `Nuke` остался отдельным профилем: placement ELO `1561`, `31` игра.
- Количество, порядок и спортивная проекция игр (имя после канонизации, место, VP, корпорация) не изменились.
- Повторный sync оставил `elo-data.json` и `data.json` побитово неизменными. `stats.json` и `solo-records.json` семантически неизменны; штатно меняется только `generatedAt`.
- `tm-sync-elo.timer` возвращён в `active`; последующий oneshot завершился с `Result=success`, `ExecMainStatus=0`.

## Проверки

- Полный server test suite: `7327 passing`.
- `npm run lint:server`: без ошибок.
- `npm run build`: успешно; только два существующих webpack size warning.
- Strict OpenSpec validation: `Change 'merge-quattrowow-profile' is valid`.
- Playwright на точном staging и prod release: таблица `38 players | 359 games`, профиль `Quattrowow` с `10 ELO games`, CSS-цвет `#f574bb`, старые имена отсутствуют, browser console errors/warnings отсутствуют.
- Prod API `gfb80e36623be`: фаза `end`, игроки `Quattrowow/pink`, `Вангер/vanger`, `Борис/green`.
- `tm-server`, `tm-elo`, `tm-sync-elo` после переключения не дали записей уровня warning и выше.
- Внешний URL с HOSTKEY отвечает ожидаемым access-gate `403`; поэтому JSON/API проверены через внутренние prod endpoints, а UI — через точные prod release-файлы и live shared JSON без чтения credentials.
