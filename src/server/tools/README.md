# Terraforming-mars maintenance tools

Tool directory is for specific scripts for project maintenance.

Before use them build the project `npm run build`

... then run any of compilled scripts from build directory `node <path-to-the-toolname>.js`

For example check_locales.ts tool can be run like this: `node build/src/server/tools/check_locales.js`

It is possible to run these tools "directly" by using ts-node package

1. Install ts-node on your machine `npm install -g ts-node`
2. Run the script `ts-node src/server/tools/check_locales.ts`

## Check locales tool

#### Check locales tool compares localizations and shows missing translations.

How to run: `node build/src/server/tools/check_locales.js`

Result will be something like this:
```
"Select a Mars First bonus.": "es,nl,ru"
"Gain 1 M€ for each building tag you have": "es,nl,ru"
...
```
The languages in quotes are missing that translation. (In this case, Spanish, Dutch, and Russian are missing the translation.)


#### If you want to see warnings for given locale only use --locales switch

`node build/src/server/tools/check_locales.js --locales cn,ru`

as result you will see the warnings for Chinese and Russian languages only.

## Export game

### Usage

```
npm run build
sh src/server/tools/export_game.sh <heroku-app-name>  <game id | player id | spectator id>
```

or

```
heroku pg:credentials:url --app <heroku-app-name>
POSTGRES_HOST=<postges:...> node build/src/tools/export_game.js <game id | player id | spectator id>
```

### Description
This tool extracts the entire history of a game from a database and stores it in the local filesystem database.

If you plan to extract from the local SQLite database, have no environment variables. If you're extracting
from PostgreSQL, use the `POSTGRES_HOST` environment variable. You cannot export from a local filesystem database.
You might as well then just run `cp -R`

(Read https://github.com/terraforming-mars/terraforming-mars/wiki/Databases#maintenance
to get advice on setting up your `POSTGRES_HOST` environment variable.)

## Export completed games

### Usage

Fast bulk export for analytics. This reads `game_results`, `completed_game`, and the latest
saved `games` row to produce a normalized dataset of finished games with names, corp, VP, place,
generation, map, timestamps, and spectator id.

```
npm run build:server
node build/src/server/tools/export_completed_games.js --output artifacts/completed-games.jsonl --format jsonl
```

When `POSTGRES_HOST` is set, the tool reads PostgreSQL. Otherwise it reads the local SQLite
database from `db/game.db` or `TM_DB_PATH`.

Options:

- `--output <path>`: output file, default `artifacts/completed-games.jsonl`
- `--format json|jsonl`: output format, default inferred from extension
- `--limit <n>`: cap the number of exported rows
- `--since <unix-seconds|ISO-date>`: only export games completed after the given timestamp
- `--server-name <name>`: label written into exported rows

### Heroku wrapper

On Windows, use the PowerShell wrapper. It resolves the Heroku Postgres URL and runs the bulk export:

```powershell
.\scripts\export_tm_heroku_completed_games.ps1 -App <heroku-app-name> -Output artifacts\completed-games.jsonl -Format jsonl
```

Example with a time filter:

```powershell
.\scripts\export_tm_heroku_completed_games.ps1 -App <heroku-app-name> -Since 2026-01-01
```

### Suggested pipeline

1. Run `export_completed_games.js` to create the fast metadata dataset for all completed games.
2. Do exploratory analytics from the exported JSON/JSONL: corp win rates, VP spread, gen length, map splits, player filters.
3. For the subset of suspicious or interesting games, run `export_game.js` with specific `gameId`/`spectatorId` to pull full save history and logs for deep analysis.

## Analyze MA

Starts a local web server that you can use to get results of MA synergy. To run,

```sh
npm run build:server
node build/src/server/tools/analyze_ma.js
```

And then point your browser to http://localhost:8081

Warning: this is a fragile tool, and it might fail or hide errors.
