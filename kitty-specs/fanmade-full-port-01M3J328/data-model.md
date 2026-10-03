# Data and compatibility boundaries

| Boundary | Required behavior |
|---|---|
| Expansion registry / NewGameConfig / GameOptions | Add source flags with disabled defaults; preserve target options and validation. |
| Card registries / tag and resource unions / render models | Stable source IDs, expansion dependency checks, no leakage of replacements into disabled games. |
| Game / Player / deferred input queue | Preserve target replay, surrender, sequencing and logger behavior while adding fan effects. |
| SerializedGame / SerializedPlayer | New fields optional on old input; rebuild added state correctly; retain target-only fields and pending choices. |
| Parties / PoliticalAgendas | Actual in-play parties, saved policy/tag state, Moon compatibility and Chairman/PartyLeaders semantics. |
| Custom boards/cards and libraries | Transfer source codecs and validation; adapt routes to target request/auth conventions, never copy live library data. |
| Server model / Vue input and board UI | Expose additive data and usable controls; retain target layout and interaction improvements. |
| Advisor / SmartBot consumers | Existing configurations retain contracts; unsupported new capabilities are identified explicitly, not falsely scored. |

No production schema migration or live-game import is authorized. Validation uses synthetic fixtures or authorized isolated copies. New-game configuration controls future game selection; persisted rules belong to the individual game for its full lifetime.
