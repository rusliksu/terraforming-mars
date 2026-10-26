# Referenced base changes

The issue reference below identifies a merged base PR, rather than additional mission scope. This compatibility check preserves the native implementation and its prompt identity.

| issue | verdict | evidence_ref | scope | wp |
|---|---|---|---|---|
| #241 | verified-already-fixed | Base c0e17f9949acdec548ba460f7bc4d59227ff986c; owned merge cd8a80da7590f79b45bb569344cec0f08b6a166b; tests/client/wrybit/shell/AppInputRefresh.spec.ts checks exact native promptId through optional/classic payment; wp04-native-cycle2-retry.xml: 12917 passed, 3 skipped, 0 failures/errors | Native stale-input protection retained across UI presentations | WP04 |

The documented Markdown matrix format is used because the installed issue-verdict command cannot resolve this owned linked-checkout mission (mission_not_found). No lifecycle event or SDK policy was edited to bypass a guard.
