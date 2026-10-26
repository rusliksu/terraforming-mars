# Контракт исходящего события ошибок

## Публичная граница внутри сервера

```text
capture(error: unknown, context: ErrorDiagnosticContext): void
```

`ErrorDiagnosticContext` требует `boundary` и допускает только дополнительные `method`, `route`, `gameId`, `playerId`, `gameplayInput`. Общий request/response/route context не принимается; process-level caller передаёт `{boundary: 'process'}`.

## Предусловия отправки

- `SENTRY_DSN` задан непустым значением;
- `SENTRY_ENVIRONMENT` точно равно `staging`;
- build head является валидной hex Git revision;
- ошибка классифицирована caller-границей как неожиданная.

## Постусловия

- один вызов формирует не более одного события;
- все доступные разрешённые поля context присутствуют после фильтрации;
- denylist ключей и перечисленные credential/header/cookie/query/IP сигнатуры применены до SDK и повторно в `beforeSend`; неизвестная свободная строка без поддерживаемой сигнатуры не входит в гарантию распознавания;
- gameplay input сначала детерминированно JSON-сериализован и измерен через `Buffer.byteLength(..., 'utf8')`; итоговое `request.data` не превышает 65 536 байт, а truncation wrapper является валидным JSON-объектом с `truncated`, `originalBytes` и UTF-8-безопасным preview;
- метод не бросает исключение, не меняет HTTP-ответ и не ожидает сетевую доставку;
- при невыполнении предусловий внешнего эффекта нет.

## Классификация

- исходные `AppError`, `InputError` и malformed JSON: ожидаемые, `capture` не вызывается;
- неожиданная undo-ошибка: capture до её преобразования в ожидаемый `InputError`;
- стандартный `Error`: type, message и full call stack сохраняются после secret-redaction;
- иное значение: нейтральный error type/message без сериализации исходного объекта.

## Совместимость

Публичные HTTP-контракты Terraforming Mars, формат сохранённой игры и схема БД не меняются.
