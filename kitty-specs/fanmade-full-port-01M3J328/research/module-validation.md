# Module validation matrix

All twelve creation and save/resume cases are in `tests/fanmade-compat/SaveCompatibility.spec.ts`.
The complete target server suite executes all files below. These cells distinguish unit actions,
production/reset flows, and scoring assertions; they do not claim every mechanic combination.

| Module | Representative action | Generation/production/reset | Scoring |
|---|---|---|---|
| `sillyfication` | `tests/cards/sillyfication/AriAdore.spec.ts` | `tests/cards/sillyfication/CostIndex.spec.ts` | `tests/cards/sillyfication/AriAdore.spec.ts` |
| `betterMars` | `tests/cards/betterMars/Replacements.spec.ts` | `tests/fanmade-compat/ModuleLifecycle.spec.ts` | `tests/fanmade-compat/ModuleLifecycle.spec.ts` |
| `customCards` | `tests/cards/DataDrivenCard.spec.ts` | `tests/fanmade-compat/ModuleLifecycle.spec.ts` | `tests/fanmade-compat/ModuleLifecycle.spec.ts` |
| `conglomerates` | `tests/cards/conglomerates/teamActions/DonationAction.spec.ts` | `tests/conglomerates/ConglomeratesExpansion.spec.ts` | `tests/conglomerates/ConglomeratesTeamScore.spec.ts` |
| `corporateBetterments` | `tests/cards/corporatebetterments/WildBoars.spec.ts` | `tests/fanmade-compat/ModuleLifecycle.spec.ts` | `tests/cards/corporatebetterments/WildBoars.spec.ts` |
| `idesOfMars` | `tests/cards/idesofmars/Amphibians.spec.ts` | `tests/cards/idesofmars/Backstabbing.spec.ts` | `tests/cards/idesofmars/Amphibians.spec.ts` |
| `robAntilles` | `tests/cards/robantilles/AlgorithmicTrading.spec.ts` | `tests/cards/robantilles/GreatFaceOfCydonia.spec.ts` | `tests/cards/robantilles/DogsInSpace.spec.ts` |
| `moreParties` | `tests/turmoil/parties/ScientistsMoreParties.spec.ts` | `tests/turmoil/PartySwap.spec.ts` | `tests/fanmade-compat/ModuleLifecycle.spec.ts` |
| `venusPhase2` | `tests/cards/venusPhase2/CloudCityStandardProject.spec.ts` | `tests/fanmade-compat/ModuleLifecycle.spec.ts` | `tests/venusPhase2/VenusPhase2Expansion.spec.ts` |
| `industries` | `tests/cards/industries/SteelIndustryStandardProject.spec.ts` | `tests/fanmade-compat/ModuleLifecycle.spec.ts` | `tests/fanmade-compat/ModuleLifecycle.spec.ts` |
| `highOrbit` | `tests/cards/highOrbit/HighOrbitAcquisition.spec.ts` | `tests/HighOrbitMarket.spec.ts` | `tests/cards/highOrbit/Observatory.spec.ts` |
| `solaris` | `tests/cards/solaris/GalaxyDefenders.spec.ts` | `tests/cards/solaris/AntiFraudInvestigation.spec.ts` | `tests/cards/solaris/GalaxyDefenders.spec.ts` |

High Orbit uses its start-generation hook directly; Conglomerates uses production reset; Ides of Mars and More Parties exercise Turmoil end-generation. The other transition cells run a real generation boundary. New lifecycle cases cover production payouts, persisted card VP, Industries no-extra-tile-VP and new-party leadership VP after reload.
