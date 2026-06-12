<template>
        <div id="create-game" class="create-game">
            <h1><span v-i18n>{{ constants.APP_NAME }}</span> — <span v-i18n>Create New Game</span></h1>
            <div class="changelog"><a :href="wikiUrls.changelog" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank"><u v-i18n>Read our changelog to get the latest updates.</u></a></div>
            <div class="discord-invite" v-if="playersCount===1">
              (<span v-i18n>Looking for people to play with</span>? <a :href="constants.DISCORD_INVITE" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank"><u v-i18n>Join us on Discord</u></a>.)
            </div>
            <div class="create-game-form create-game-panel create-game--block">

                <div class="create-game-options">
                    <div class="create-game-page-container">
                        <div class="create-game-page-column">
                            <h4 v-i18n>№ of Players</h4>
                            <div v-for="pCount in [1,2,3,4,5,6]" v-bind:key="pCount">
                              <input type="radio" :value="pCount" name="playersCount" v-model="playersCount" :id="pCount+'-radio'">
                              <label :for="pCount+'-radio'">
                                  {{ getPlayersCountText(pCount) }}
                              </label>
                            </div>
                        </div>

                        <div class="create-game-page-column">
                            <h4 v-i18n>Expansions</h4>

                            <input type="checkbox" name="allOfficialExpansions" id="allOfficialExpansions-checkbox" v-model="allOfficialExpansions">
                            <label for="allOfficialExpansions-checkbox">
                                <span v-i18n>All</span>
                            </label>

                            <input type="checkbox" name="corporateEra" id="corporateEra-checkbox" v-model="expansions.corpera">
                            <label for="corporateEra-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-CE"></div>
                                <span v-i18n>Corporate Era</span>
                            </label>

                            <input type="checkbox" name="prelude" id="prelude-checkbox" v-model="expansions.prelude">
                            <label for="prelude-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-prelude"></div>
                                <span v-i18n>Prelude</span>
                            </label>

                            <input type="checkbox" name="prelude2" id="prelude2-checkbox" v-model="expansions.prelude2">
                            <label for="prelude2-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-prelude2"></div>
                                <span v-i18n>Prelude 2</span>
                            </label>

                            <input type="checkbox" name="venusNext" id="venusNext-checkbox" v-model="expansions.venus">
                            <label for="venusNext-checkbox" class="expansion-button">
                            <div class="create-game-expansion-icon expansion-icon-venus"></div>
                                <span v-i18n>Venus Next</span>
                            </label>

                            <input type="checkbox" name="colonies" id="colonies-checkbox" v-model="expansions.colonies">
                            <label for="colonies-checkbox" class="expansion-button">
                            <div class="create-game-expansion-icon expansion-icon-colony"></div>
                                <span v-i18n>Colonies</span>
                            </label>

                            <input type="checkbox" name="turmoil" id="turmoil-checkbox" v-model="expansions.turmoil">
                            <label for="turmoil-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-turmoil"></div>
                                <span v-i18n>Turmoil</span>
                            </label>

                            <input type="checkbox" name="promo" id="promo-checkbox" v-model="expansions.promo">
                            <label for="promo-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-promo"></div>
                                <span v-i18n>Promos</span>&nbsp;<a :href="wikiUrls.promo" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <div class="create-game-subsection-label" v-i18n>Fan-made</div>

                            <input type="checkbox" name="ares" id="ares-checkbox" v-model="expansions.ares">
                            <label for="ares-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-ares"></div>
                                <span v-i18n>Ares</span>&nbsp;<a :href="wikiUrls.ares" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <template v-if="expansions.ares">
                                <input type="checkbox" v-model="aresExtremeVariant" id="aresExtremeVariantVariant-checkbox">
                                <label for="aresExtremeVariantVariant-checkbox">
                                    <div class="create-game-expansion-icon expansion-icon-ares"></div>
                                    <span v-i18n>Extreme</span> &nbsp;<a :href="wikiUrls.aresExtreme" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                                </label>
                            </template>

                            <input type="checkbox" name="community" id="communityCards-checkbox" v-model="expansions.community">
                            <label for="communityCards-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-community"></div>
                                <span v-i18n>Community</span>&nbsp;<a :href="wikiUrls.community" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <input type="checkbox" name="themoon" id="themoon-checkbox" v-model="expansions.moon">
                            <label for="themoon-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-themoon"></div>
                                <span v-i18n>The Moon</span>&nbsp;<a :href="wikiUrls.moon" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <template v-if="expansions.moon">
                              <input type="checkbox" v-model="requiresMoonTrackCompletion" id="requiresMoonTrackCompletion-checkbox">
                              <label for="requiresMoonTrackCompletion-checkbox">
                                  <span v-i18n>Mandatory Moon Terraforming</span>
                              </label>

                              <input type="checkbox" v-model="moonStandardProjectVariant" id="moonStandardProjectVariant2-checkbox">
                              <label for="moonStandardProjectVariant2-checkbox">
                                  <span v-i18n>Standard Project Variant #2</span>&nbsp;<a :href="wikiUrls.moonStandardProjectVariant" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                              </label>

                              <input type="checkbox" v-model="moonStandardProjectVariant1" id="moonStandardProjectVariant1-checkbox">
                              <label for="moonStandardProjectVariant1-checkbox">
                                  <span v-i18n>Standard Project Variant #1</span>&nbsp;<a :href="wikiUrls.moonStandardProjectVariant" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                              </label>
                            </template>

                            <template v-if="expansions.turmoil">
                                <input type="checkbox" name="politicalAgendas" id="politicalAgendas-checkbox" v-on:change="politicalAgendasExtensionToggle()">
                                <label for="politicalAgendas-checkbox" class="expansion-button">
                                    <div class="create-game-expansion-icon expansion-icon-agendas"></div>
                                    <span v-i18n>Agendas</span>&nbsp;<a href="https://www.notion.so/Political-Agendas-8c6b0b018a884692be29b3ef44b340a9" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                                </label>

                                <div class="create-game-page-column-row" v-if="isPoliticalAgendasExtensionEnabled()">
                                    <div>
                                    <input type="radio" name="agendaStyle" v-model="politicalAgendasExtension" :value="getPoliticalAgendasExtensionAgendaStyle('random')" id="randomAgendaStyle-radio">
                                    <label class="label-agendaStyle agendaStyle-random" for="randomAgendaStyle-radio">
                                        <span class="agendas-text" v-i18n>{{ getPoliticalAgendasExtensionAgendaStyle('random') }}</span>
                                    </label>
                                    </div>

                                    <div>
                                    <input type="radio" name="agendaStyle" v-model="politicalAgendasExtension" :value="getPoliticalAgendasExtensionAgendaStyle('chairman')" id="chairmanAgendaStyle-radio">
                                    <label class="label-agendaStyle agendaStyle-chairman" for="chairmanAgendaStyle-radio">
                                        <span class="agendas-text" v-i18n>{{ getPoliticalAgendasExtensionAgendaStyle('chairman') }}</span>
                                    </label>
                                    </div>
                                </div>
                            </template>

                            <input type="checkbox" name="pathfinders" id="pathfinders-checkbox" v-model="expansions.pathfinders">
                            <label for="pathfinders-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-pathfinders"></div>
                                <span v-i18n>Pathfinders</span>&nbsp;<a :href="wikiUrls.pathfinders" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <template v-if="expansions.venus">
                                <input type="checkbox" v-model="altVenusBoard" id="altVenusBoard-checkbox">
                                <label for="altVenusBoard-checkbox">
                                    <span v-i18n>Alt. Venus Board</span> &nbsp;<a :href="wikiUrls.alternativeVenusBoard" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                                </label>
                            </template>

                            <input type="checkbox" name="ceo" id="ceo-checkbox" v-model="expansions.ceo">
                            <label for="ceo-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-ceo"></div>
                                <span v-i18n>CEOs</span>&nbsp;<a :href="wikiUrls.ceo" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <input type="checkbox" name="starwars" id="starwars-checkbox" v-model="expansions.starwars">
                            <label for="starwars-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-starwars"></div>
                                <span v-i18n>Star Wars</span><span> </span>&nbsp;<a :href="wikiUrls.starwars" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <input type="checkbox" name="ceo" id="underworld-checkbox" v-model="expansions.underworld">
                            <label for="underworld-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-underworld"></div>
                                <span v-i18n>Underworld 2</span><span></span>&nbsp;<a :href="wikiUrls.underworld" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <input type="checkbox" name="deltaProject" id="deltaProject-checkbox" v-model="expansions.deltaProject">
                            <label for="deltaProject-checkbox" class="expansion-button">
                                <div class="create-game-expansion-icon expansion-icon-deltaProject"></div>
                                <span v-i18n>Delta Project</span>&nbsp;<span title="Alpha — work in progress">(&#945;)</span><span></span>&nbsp;<a :href="wikiUrls.deltaProject" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>
                        </div>

                        <div class="create-game-page-column">
                            <h4 v-i18n>Board</h4>

                            <div v-for="boardName in boards" v-bind:key="boardName">
                              <div v-if="boardName==='utopia planitia'" class="create-game-subsection-label" v-i18n>Fan-made</div>
                              <input type="radio" :value="boardName" name="board" v-model="board" :id="boardName+'-checkbox'">
                              <label :for="boardName+'-checkbox'" class="expansion-button">
                                  <span :class="getBoardColorClass(boardName)">&#x2B22;</span>
                                  <span class="capitalized" v-i18n>{{ boardName }}</span>
                                  <template v-if="boardName !== RandomBoardOption.OFFICIAL && boardName !== RandomBoardOption.ALL">
                                    &nbsp;<a :href="boardHref(boardName)" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                                  </template>
                              </label>
                            </div>
                        </div>

                        <div class="create-game-page-column">
                            <h4 v-i18n>Options</h4>

                            <label for="startingCorpNum-checkbox">
                            <input type="number" class="create-game-corporations-count" value="2" min="1" :max="6" v-model="startingCorporations" id="startingCorpNum-checkbox">
                                <span v-i18n>Starting Corporations</span>
                            </label>

                            <template v-if="expansions.prelude">
                              <label for="startingPreludeENum-checkbox">
                              <div class="create-game-expansion-icon expansion-icon-prelude"></div>
                              <input type="number" class="create-game-corporations-count" value="4" min="4" :max="8" v-model="startingPreludes" id="startingPreludeNum-checkbox">
                                  <span v-i18n>Starting Preludes</span>
                              </label>
                            </template>

                            <template v-if="expansions.ceo">
                              <label for="startingCEONum-checkbox">
                              <div class="create-game-expansion-icon expansion-icon-ceo"></div>
                              <input type="number" class="create-game-corporations-count" value="3" min="1" :max="6" v-model="startingCeos" id="startingCEONum-checkbox">
                                  <span v-i18n>Starting CEOs</span>
                              </label>
                            </template>

                            <input type="checkbox" v-model="solarPhaseOption" id="WGT-checkbox" disabled>
                            <label for="WGT-checkbox">
                                <span v-i18n>World Government Terraforming</span>&nbsp;<a :href="wikiUrls.worldGovernmentTerraforming" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <template v-if="playersCount === 1">
                            <input type="checkbox" v-model="soloTR" id="soloTR-checkbox">
                            <label for="soloTR-checkbox">
                                <span v-i18n>63 TR solo mode</span>&nbsp;<a :href="wikiUrls.trSoloMode" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>
                            </template>

                            <!-- <input type="checkbox" v-model="beginnerOption" id="beginnerOption-checkbox">
                            <label for="beginnerOption-checkbox">
                                <span v-i18n>Beginner Options</span>
                            </label> -->

                            <input type="checkbox" v-model="undoOption" id="undo-checkbox">
                            <label for="undo-checkbox">
                                <span v-i18n>Allow undo</span>&nbsp;<a :href="wikiUrls.allowUndo" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>
                            <div v-if="undoOption">
                              <span v-i18n>Undo is now in best effort support.</span>
                              <a href="https://github.com/terraforming-mars/terraforming-mars/discussions/7647" target="_blank">&#9432;</a>
                              <br/>
                              <span v-i18n>No effort will be spent to fix it.</span>
                            </div>
                            <input type="checkbox" v-model="showTimers" id="timer-checkbox">
                            <label for="timer-checkbox">
                                <span v-i18n>Show timers</span>
                            </label>

                            <input type="checkbox" v-model="escapeVelocityMode" id="escapevelocity-checkbox">
                            <label for="escapevelocity-checkbox">
                                <div class="create-game-expansion-icon expansion-icon-escape-velocity"></div>
                                <span v-i18n>Escape Velocity</span>&nbsp;<a :href="wikiUrls.escapeVelocity" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <label for="escapeThreshold-checkbox" v-show="escapeVelocityMode">
                              <span v-i18n>After</span><span>&nbsp;</span>
                              <input type="number" class="create-game-corporations-count" value="30" step="5" min="0" :max="180" v-model="escapeVelocityThreshold" id="escapeThreshold-checkbox">
                              <span v-i18n>min</span>
                            </label>

                            <label for="escapeBonusSeconds-checkbox" v-show="escapeVelocityMode">
                              <span v-i18n>Plus</span><span>&nbsp;</span>
                              <input type="number" class="create-game-corporations-count" value="2" step="1" min="1" :max="10" v-model="escapeVelocityBonusSeconds" id="escapeBonusSeconds-checkbox">
                              <span v-i18n>seconds per action</span>
                            </label>

                            <label for="escapePeriod-checkbox" v-show="escapeVelocityMode">
                              <span v-i18n>Reduce</span><span>&nbsp;</span>
                              <input type="number" class="create-game-corporations-count" value="1" min="1" :max="10" v-model="escapeVelocityPenalty" id="escapePeriod-checkbox">
                              <span v-i18n>VP every</span><span>&nbsp;</span>
                              <input type="number" class="create-game-corporations-count" value="2" min="1" :max="10" v-model="escapeVelocityPeriod" id="escapePeriod-checkbox">
                              <span v-i18n>min</span>
                            </label>

                            <template v-if="expansions.prelude">
                              <input type="checkbox" v-model="twoCorpsVariant" id="twoCorps-checkbox">
                              <label for="twoCorps-checkbox" title="Always gain the Merger Prelude card (will be given post-draft)">
                                    <div class="create-game-expansion-icon expansion-icon-prelude"></div>
                                    <span v-i18n>Merger</span>&nbsp;<a :href="wikiUrls.merger" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                              </label>
                            </template>

                            <input type="checkbox" v-model="shuffleMapOption" id="shuffleMap-checkbox">
                            <label for="shuffleMap-checkbox">
                                    <span v-i18n>Randomize board tiles</span>&nbsp;<a :href="wikiUrls.randomizeBoardTiles" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <input type="checkbox" v-model="seededGame" id="seeded-checkbox">
                            <label for="seeded-checkbox">
                                <span v-i18n>Set Predefined Game</span>&nbsp;<a :href="wikiUrls.setPredefinedGame" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <div v-if="seededGame">
                                <input type="text" name="clonedGamedId" v-model="clonedGameId" />
                            </div>

                            <div class="create-game-subsection-label" v-i18n>Knightbyte server settings</div>

                            <input type="checkbox" v-model="privateHands" id="privateHands-checkbox">
                            <label for="privateHands-checkbox">
                                <span v-i18n>Private hands</span>
                            </label>

                            <input type="checkbox" v-model="noEloGame" id="noEloGame-checkbox">
                            <label for="noEloGame-checkbox">
                                <span v-i18n>Training game (no ELO)</span>
                            </label>

                            <input type="checkbox" v-model="turnBasedGame" id="turnBasedGame-checkbox">
                            <label for="turnBasedGame-checkbox">
                                <span v-i18n>Async game (Telegram)</span>
                            </label>
                            <div v-if="turnBasedGame" class="create-game-telegram-banner">
                              <span class="create-game-telegram-banner-label">Telegram notifications:</span>
                              <a href="https://t.me/tm_knightbyte_bot" target="_blank" rel="noopener noreferrer">@tm_knightbyte_bot</a>
                              <span>send <code>/start</code> there, then paste your numeric Chat ID below</span>
                            </div>

                            <input type="checkbox" v-model="botGame" id="botGame-checkbox">
                            <label for="botGame-checkbox">
                                <span v-i18n>Bot players</span>
                            </label>

                            <div class="create-game-subsection-label" v-i18n>Filter</div>

                            <input type="checkbox" v-model="showCorporationList" id="customCorps-checkbox">
                            <label for="customCorps-checkbox">
                                <span v-i18n>Custom Corporation list</span>
                                <span v-if="customCorporations.length">&nbsp;({{ customCorporations.length }})</span>
                            </label>

                            <template v-if="expansions.prelude">
                              <input type="checkbox" v-model="showPreludesList" id="customPreludes-checkbox">
                              <label for="customPreludes-checkbox">
                                  <span v-i18n>Custom Preludes list</span>
                                  <span v-if="customPreludes.length">&nbsp;({{ customPreludes.length }})</span>
                              </label>
                            </template>

                            <template v-if="expansions.ceo">
                            <input type="checkbox" v-model="showCeosList" id="customCeos-checkbox">
                              <label for="customCeos-checkbox">
                                  <span v-i18n>Custom CEOs list</span>
                                  <span v-if="customCeos.length">&nbsp;({{ customCeos.length }})</span>
                              </label>
                            </template>

                            <input type="checkbox" v-model="showBannedCards" id="bannedCards-checkbox">
                            <label for="bannedCards-checkbox">
                                <span v-i18n>Exclude some cards</span>
                            </label>

                            <input type="checkbox" v-model="showIncludedCards" id="includedCards-checkbox">
                            <label for="includedCards-checkbox">
                                <span v-i18n>Include some cards</span>
                            </label>

                            <template v-if="expansions.colonies">
                                <input type="checkbox" v-model="showColoniesList" id="customColonies-checkbox">
                                <label for="customColonies-checkbox">
                                    <span v-i18n>Custom Colonies list</span>
                                  <span v-if="customColonies.length">&nbsp;({{ customColonies.length }})</span>
                                </label>
                            </template>

                            <template v-if="expansions.turmoil">
                                <input type="checkbox" v-model="removeNegativeGlobalEventsOption" id="removeNegativeEvent-checkbox">
                                <label for="removeNegativeEvent-checkbox">
                                    <span v-i18n>Remove negative Global Events</span>&nbsp;<a :href="wikiUrls.removeNegativeGlobalEvents" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                                </label>
                            </template>

                        </div>

                        <div class="create-game-page-column" v-if="playersCount > 1">
                            <h4 v-i18n>Multiplayer Options</h4>

                            <div class="create-game-page-column-row">
                                <div>
                                <input type="checkbox" name="draftVariant" v-model="draftVariant" id="draft-checkbox">
                                <label for="draft-checkbox">
                                    <span v-i18n>Draft variant</span>
                                </label>
                                </div>

                                <div>
                                <input type="checkbox" name="initialDraft" v-model="initialDraft" id="initialDraft-checkbox">
                                <label for="initialDraft-checkbox">
                                    <span v-i18n>Initial Draft variant</span>&nbsp;<a :href="wikiUrls.initialDraft" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                                </label>
                                </div>
                            </div>
                            <div class="create-game-page-column-row" v-if="initialDraft">
                              <div>
                                <input type="checkbox" name="initialDraftOneWay" v-model="initialDraftOneWay" id="initialDraftOneWay-checkbox">
                                <label for="initialDraftOneWay-checkbox" title="Experimental: deal 10 project cards at once and pass in one direction.">
                                  <span v-i18n>10-card one-way initial draft (experimental)</span>
                                </label>
                              </div>

                              <div v-if="expansions.prelude">
                                <input type="checkbox" name="preludeDraft" v-model="preludeDraftVariant" id="preludeDraft-checkbox">
                                <label for="preludeDraft-checkbox">
                                  <span v-i18n>Prelude Draft</span>
                                </label>
                              </div>

                              <div v-if="expansions.ceo">
                                <input type="checkbox" name="ceosDraft" v-model="ceosDraftVariant" id="ceosDraft-checkbox">
                                <label for="ceosDraft-checkbox">
                                  <span v-i18n>CEO Draft</span>
                                </label>
                              </div>
                            </div>

                            <input type="checkbox" v-model="randomFirstPlayer" id="randomFirstPlayer-checkbox">
                            <label for="randomFirstPlayer-checkbox">
                                <span v-i18n>Random first player</span>
                            </label>

                            <input type="checkbox" name="randomMAToggle" id="randomMA-checkbox" v-on:change="randomMAToggle()">
                            <label for="randomMA-checkbox">
                                <span v-i18n>Random Milestones/Awards</span>&nbsp;<a :href="wikiUrls.randomMilestonesAndAwards" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <div class="create-game-page-column-row" v-if="isRandomMAEnabled()">
                                <div>
                                <input type="radio" name="randomMAOption" v-model="randomMA" :value="getRandomMaOptionType('limited')" id="limitedRandomMA-radio">
                                <label class="label-randomMAOption" for="limitedRandomMA-radio">
                                    <span v-i18n>{{ getRandomMaOptionType('limited') }}</span>
                                </label>
                                </div>

                                <div>
                                <input type="radio" name="randomMAOption" v-model="randomMA" :value="getRandomMaOptionType('full')" id="unlimitedRandomMA-radio">
                                <label class="label-randomMAOption" for="unlimitedRandomMA-radio">
                                    <span v-i18n>{{ getRandomMaOptionType('full') }}</span>
                                </label>
                                </div>
                                <div>
                                  <input type="checkbox" name="modularMA" v-model="modularMA" id="modularMA-checkbox">
                                   <label for="modularMA-checkbox">
                                    <span v-i18n>Official Random α</span>
                                  </label>
                                </div>
                            </div>

                            <div v-if="modularMA">
                              The new Milestones and Awards are still in active development.<br/>
                              Please don't report anything unless it breaks the game.<br/>
                              These are <b>always fully random</b>.
                            </div>
                            <template v-if="expansions.venus">
                                <input type="checkbox" v-model="requiresVenusTrackCompletion" id="requiresVenusTrackCompletion-checkbox">
                                <label for="requiresVenusTrackCompletion-checkbox">
                                    <span v-i18n>Mandatory Venus Terraforming</span> &nbsp;<a :href="wikiUrls.venusTerraforming" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                                </label>
                            </template>

                            <template v-if="randomMA !== RandomMAOptionType.NONE">
                              <input type="checkbox" v-model="includeFanMA" id="fanMA-checkbox">
                              <label for="fanMA-checkbox">
                                  <span v-i18n>Include fan Milestones/Awards</span>
                              </label>
                            </template>

                            <input type="checkbox" name="showOtherPlayersVP" v-model="showOtherPlayersVP" id="realTimeVP-checkbox">
                            <label for="realTimeVP-checkbox">
                                <span v-i18n>Show real-time VP</span>&nbsp;<a :href="wikiUrls.showRealtimeVP" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>

                            <input type="checkbox" v-model="fastModeOption" id="fastMode-checkbox">
                            <label for="fastMode-checkbox">
                                <span v-i18n>Fast mode</span>&nbsp;<a :href="wikiUrls.fastMode" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                            </label>
                        </div>

                        <div class="create-game-players-cont">
                            <div class="container">
                                <div class="columns">
                                  <template v-for="(newPlayer, index) in getPlayers()" v-bind:key="index">
                                    <div>
                                      <div :class="'form-group col6 create-game-player '+getPlayerContainerColorClass(newPlayer.color)">
                                          <div class="create-game-profile-picker" @click.stop>
                                              <input
                                                class="form-input form-inline create-game-player-name"
                                                :class="{'is-open': isPlayerProfilePickerOpen(index)}"
                                                :placeholder="getPlayerNamePlaceholder(index)"
                                                autocomplete="off"
                                                ref="playerProfileNameInput"
                                                v-model="newPlayer.name"
                                                @focus="openPlayerProfilePicker(newPlayer, index, $event)"
                                                @click.stop="openPlayerProfilePicker(newPlayer, index, $event)"
                                                @input="updatePlayerProfileAutocomplete(newPlayer, $event)"
                                                @keydown.enter.stop.prevent="applyFirstFilteredPlayerProfile(newPlayer)"
                                                @keydown.esc.stop.prevent="closePlayerProfilePicker"
                                                @keydown.stop />
                                              <div
                                                v-if="isPlayerProfilePickerOpen(index)"
                                                class="create-game-profile-menu"
                                                :style="getPlayerProfileMenuStyle()">
                                                  <div class="create-game-profile-option-list">
                                                    <button
                                                      type="button"
                                                      class="create-game-profile-option create-game-profile-option-custom"
                                                      @click="applyCustomNickFromPicker(newPlayer)">
                                                        <span class="create-game-profile-avatar create-game-profile-avatar--empty">Aa</span>
                                                        <span class="create-game-profile-option-main">
                                                          <span class="create-game-profile-option-name">Custom nick</span>
                                                          <span class="create-game-profile-option-meta">{{ getCustomNickMeta() }}</span>
                                                        </span>
                                                    </button>
                                                    <button
                                                      v-for="profile in getFilteredAvailablePlayerProfiles(newPlayer)"
                                                      :key="profile.id"
                                                      type="button"
                                                      :class="getPlayerProfileOptionClasses(profile)"
                                                      @click="applyPlayerProfileFromPicker(newPlayer, profile)">
                                                        <span :class="['create-game-profile-avatar', ...getPlayerProfileAvatarClasses(profile)]">{{ getPlayerProfileInitials(profile) }}</span>
                                                        <span class="create-game-profile-option-main">
                                                          <span class="create-game-profile-option-name player-name">{{ profile.name }}</span>
                                                          <span class="create-game-profile-option-meta">{{ formatPlayerProfileMeta(profile) }}</span>
                                                        </span>
                                                        <span class="create-game-profile-color-swatch" :title="getColorTitle(profile.preferredColor)">
                                                          <span :class="'create-game-colorbox '+getPlayerCubeColorClass(profile.preferredColor)"></span>
                                                        </span>
                                                    </button>
                                                    <div v-if="getFilteredAvailablePlayerProfiles(newPlayer).length === 0" class="create-game-profile-empty">No matching players</div>
                                                  </div>
                                              </div>
                                          </div>
                                          <div class="create-game-page-color-row">
                                              <template v-for="color in DEFAULT_PLAYER_COLORS" v-bind:key="color">
                                                <div>
                                                  <input type="radio" :value="color" :name="'playerColor' + (index + 1)" :checked="newPlayer.color === color" :id="'radioBox' + color + (index + 1)" @change="applyDefaultPlayerColor(newPlayer, color)">
                                                  <label :for="'radioBox' + color + (index + 1)" :title="getColorTitle(color)">
                                                      <div :class="'create-game-colorbox '+getPlayerCubeColorClass(color)"></div>
                                                  </label>
                                                </div>
                                              </template>
                                          </div>
                                          <div>
                                              <!-- <template v-if="beginnerOption"> -->
                                                  <label v-if="isBeginnerToggleEnabled()" class="form-switch form-inline create-game-beginner-option-label">
                                                      <input type="checkbox" v-model="newPlayer.beginner">
                                                      <i class="form-icon"></i> <span v-i18n>Beginner?</span>&nbsp;<a :href="wikiUrls.beginnerCorporation" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                                                  </label>
                                                  <label v-if="botGame" class="form-switch form-inline" style="margin-top: 8px;">
                                                      <input type="checkbox" v-model="newPlayer.isBot">
                                                      <i class="form-icon"></i> <span>Bot</span>
                                                  </label>

                                                  <label class="form-label">
                                                      <input type="number" class="form-input form-inline player-handicap" value="0" min="0" :max="10" v-model.number="newPlayer.handicap" />
                                                      <i class="form-icon"></i><span v-i18n>TR Boost</span>&nbsp;<a :href="wikiUrls.trBoost" class="tooltip" v-i18n data-tooltip="Link opens in a new tab/window" target="_blank">&#9432;</a>
                                                  </label>
                                              <!-- </template> -->
                                              <div v-if="turnBasedGame" class="create-game-telegram-row">
                                                  <label class="form-label create-game-telegram-label" :for="'telegramId' + (index + 1)">Telegram ID</label>
                                                  <input
                                                    :id="'telegramId' + (index + 1)"
                                                    type="text"
                                                    :class="['form-input', 'form-inline', 'create-game-telegram-input', {'is-error': getTelegramIdError(newPlayer.telegramID) !== ''}]"
                                                    inputmode="numeric"
                                                    autocomplete="off"
                                                    placeholder="Telegram ID"
                                                    v-model="newPlayer.telegramID"
                                                    @blur="newPlayer.telegramID = normalizeTelegramId(newPlayer.telegramID)"
                                                  />
                                                  <div v-if="getTelegramIdError(newPlayer.telegramID) !== ''" class="form-input-hint create-game-telegram-error">
                                                    {{ getTelegramIdError(newPlayer.telegramID) }}
                                                  </div>
                                              </div>

                                              <label class="form-radio form-inline" v-if="!randomFirstPlayer">
                                                  <input type="radio" name="firstIndex" :value="index + 1" v-model="firstIndex">
                                                  <i class="form-icon"></i> <span v-i18n>Goes First?</span>
                                              </label>
                                          </div>
                                      </div>
                                    </div>
                                  </template>
                                </div>
                            </div>
                        </div>

                        <div class="create-game-action">
                            <AppButton title="Create game" size="big" @click="createGame"/>

                            <label>
                                <div class="btn btn-primary btn-action btn-lg"><i class="icon icon-upload"></i></div>
                                <input style="display: none" type="file" accept=".json" id="settings-file" ref="file" v-on:change="uploadSettings()"/>
                            </label>

                            <label>
                                <div v-on:click="downloadSettings()" class="btn btn-primary btn-action btn-lg"><i class="icon icon-download"></i></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>


            <CorporationsFilter
                ref="corporationsFilter"
                v-show="showCorporationList"
                v-if="showCorporationList"
                v-on:corporation-list-changed="updateCustomCorporations"
                v-bind:expansions="expansions"
                v-bind:selected="customCorporations"
                @close="showCorporationList = false"
            ></CorporationsFilter>

            <PreludesFilter
                ref="preludesFilter"
                v-show="showPreludesList"
                v-if="showPreludesList"
                v-on:prelude-list-changed="updateCustomPreludes"
                v-bind:expansions="expansions"
                v-bind:selected="customPreludes"
                @close="showPreludesList = false"
            ></PreludesFilter>

            <ColoniesFilter
                ref="coloniesFilter"
                v-show="showColoniesList"
                v-if="showColoniesList"
                v-on:colonies-list-changed="updateCustomColonies"
                v-bind:expansions="expansions"
                v-bind:selected="customColonies"
                @close="showColoniesList = false"
            ></ColoniesFilter>

            <CeosFilter
                ref="ceosFilter"
                v-show="showCeosList"
                v-if="showCeosList"
                v-on:ceo-list-changed="updateCustomCeos"
                v-bind:expansions="expansions"
                v-bind:selected="customCeos"
                @close="showCeosList = false"
            ></CeosFilter>

            <div class="create-game--block" v-if="showBannedCards">
              <CardsFilter
                  ref="cardsFilter"
                  v-on:cards-list-changed="updateBannedCards"
                  :title="'Cards to exclude from the game'"
                  :hint="'Start typing the card name to exclude'"
              ></CardsFilter>
            </div>

            <div class="create-game--block" v-if="showIncludedCards">
              <CardsFilter
                  ref="cardsFilter2"
                  v-on:cards-list-changed="updateIncludedCards"
                  :title="'Cards to include in the game'"
                  :hint="'Start typing the card name to include'"
              ></CardsFilter>
            </div>
          <preferences-icon></preferences-icon>
        </div>
</template>

<script lang="ts">
import * as constants from '@/common/constants';

import {defineComponent, nextTick} from 'vue';
import type {CSSProperties} from 'vue';
import {Color, DEFAULT_PLAYER_COLORS, getLockedPlayerName, LOCKED_PLAYER_IDENTITIES} from '@/common/Color';
import {
  buildPlayerProfilesFromEloPlayers,
  getPlayerProfileAvatarInitials,
  getPlayerProfileAvatarPattern,
  getPlayerProfileByName,
  PLAYER_PROFILES,
} from '@/common/PlayerProfiles';
import type {PlayerProfile} from '@/common/PlayerProfiles';
import {BoardName} from '@/common/boards/BoardName';
import {RandomBoardOption} from '@/common/boards/RandomBoardOption';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {Expansion, GameModule} from '@/common/cards/GameModule';
import CeosFilter from '@/client/components/create/CeosFilter.vue';
import CorporationsFilter from '@/client/components/create/CorporationsFilter.vue';
import PreludesFilter from '@/client/components/create/PreludesFilter.vue';
import {translateText, translateTextWithParams} from '@/client/directives/i18n';
import ColoniesFilter from '@/client/components/create/ColoniesFilter.vue';
import {ColonyName} from '@/common/colonies/ColonyName';
import {COMMUNITY_COLONY_NAMES, OFFICIAL_COLONY_NAMES, PATHFINDERS_COLONY_NAMES} from '@/common/colonies/AllColonies';
import CardsFilter from '@/client/components/create/CardsFilter.vue';
import AppButton from '@/client/components/common/AppButton.vue';
import {playerColorClass} from '@/common/utils/utils';
import {RandomMAOptionType} from '@/common/ma/RandomMAOptionType';
import {GameId, JSONObject} from '@/common/Types';
import {AgendaStyle} from '@/common/turmoil/Types';
import PreferencesIcon from '@/client/components/PreferencesIcon.vue';
import {byType, getCard, getCards} from '@/client/cards/ClientCardManifest';
import type {ClientCard} from '@/common/cards/ClientCard';
import {BoardNameType, NewGameConfig, NewPlayerModel} from '@/common/game/NewGameConfig';
import {vueRoot} from '@/client/components/vueRoot';
import {CreateGameModel} from './CreateGameModel';
import {paths} from '@/common/app/paths';
import {JSONProcessor} from './JSONProcessor';
import {defaultCreateGameModel} from './defaultCreateGameModel';
import {TemplateManager, GameTemplate} from './TemplateManager';
import {getColony} from '@/client/colonies/ClientColonyManifest';
import {RULEBOOK_URLS, WIKI, WIKI_URLS} from '@/client/utils/WikiLinks';
import {setDocumentTitle} from '@/client/utils/documentTitle';
import {ensureEloLoaded, sharedEloState} from '@/client/utils/elo';

const REVISED_COUNT_ALGORITHM = false;

const CUSTOM_CARD_MODULE_EXCEPTIONS = new Set<CardName>([
  CardName.LAKEFRONT_RESORTS,
  CardName.UTOPIA_INVEST,
]);

const CUSTOM_CARD_COMPATIBILITY_EXCEPTIONS: Partial<Record<CardName, ReadonlyArray<Expansion>>> = {
  [CardName.CREW_TRAINING]: ['moon'],
};

const DEFAULT_CUSTOM_CORPORATION_EXCLUSIONS = new Set<CardName>([
  CardName.MANUTECH,
  CardName.POINT_LUNA,
  CardName.VITOR,
]);

const DEFAULT_CUSTOM_COLONY_EXCLUSIONS = new Set<ColonyName>([
  ColonyName.PLUTO,
]);

function unique<T extends string>(items: ReadonlyArray<T>): Array<T> {
  return [...new Set(items)];
}

function mergeCustomSelectionWithExclusions<T extends string>(
  selected: ReadonlyArray<T>,
  selectable: ReadonlyArray<T>,
  exclusions: ReadonlyArray<T>,
): Array<T> {
  const selectedSet = new Set(selected);
  const excludedSet = new Set(exclusions);
  return selectable.filter((item) => selectedSet.has(item) || !excludedSet.has(item));
}

function getCustomSelectionExclusions<T extends string>(
  selectable: ReadonlyArray<T>,
  selected: ReadonlyArray<T>,
  existingExclusions: ReadonlyArray<T>,
): Array<T> {
  const selectableSet = new Set(selectable);
  const selectedSet = new Set(selected);
  return unique([
    ...existingExclusions.filter((item) => !selectableSet.has(item)),
    ...selectable.filter((item) => !selectedSet.has(item)),
  ]);
}

type Refs = {
  file: HTMLInputElement;
  templateFile: HTMLInputElement;
  cardsFilter: InstanceType<typeof CardsFilter>;
  cardsFilter2: InstanceType<typeof CardsFilter>;
  playerProfileNameInput?: HTMLInputElement | Array<HTMLInputElement>;
};

type PlayerProfileMenuPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

type FormModel = {
  preludeToggled: boolean;
  uploading: boolean;
  selectedTemplate: string;
  templates: Array<GameTemplate>;
  playerProfilePickerIndex: number | null;
  playerProfileSearch: string;
  playerProfileMenuPosition: PlayerProfileMenuPosition | null;
  customCorporationExclusions: Array<CardName>;
  customPreludesExclusions: Array<CardName>;
  customColonyExclusions: Array<ColonyName>;
};

export default defineComponent({
  name: 'CreateGameForm',
  data(): CreateGameModel & FormModel {
    return {
      ...defaultCreateGameModel(),
      preludeToggled: false,
      uploading: false,
      selectedTemplate: '',
      templates: TemplateManager.getTemplates(),
      playerProfilePickerIndex: null,
      playerProfileSearch: '',
      playerProfileMenuPosition: null,
      customCorporationExclusions: [...DEFAULT_CUSTOM_CORPORATION_EXCLUSIONS],
      customPreludesExclusions: [],
      customColonyExclusions: [...DEFAULT_CUSTOM_COLONY_EXCLUSIONS],
    };
  },
  components: {
    AppButton,
    CardsFilter,
    CeosFilter,
    ColoniesFilter,
    CorporationsFilter,
    PreludesFilter,
    PreferencesIcon,
  },
  watch: {
    allOfficialExpansions(value: boolean) {
      this.expansions.corpera = value;
      this.expansions.prelude = value;
      this.expansions.venus = value;
      this.expansions.colonies = value;
      this.expansions.turmoil = value;
      this.expansions.prelude2 = value;
      this.expansions.promo = value;
      this.syncSolarPhaseOptionToPlayerCount();
      this.syncCustomSelectionsWithExpansions();
    },
    'expansions.corpera': function(value: boolean) {
      this.handleExpansionChanged('corpera', value);
    },
    'expansions.venus': function(value: boolean) {
      this.handleExpansionChanged('venus', value);
    },
    'expansions.colonies': function(value: boolean) {
      this.handleExpansionChanged('colonies', value);
    },
    'expansions.turmoil': function(value: boolean) {
      if (value === false) {
        this.politicalAgendasExtension = 'Standard';
      }
      this.handleExpansionChanged('turmoil', value);
    },
    'expansions.promo': function(value: boolean) {
      this.handleExpansionChanged('promo', value);
    },
    'expansions.ares': function(value: boolean) {
      this.handleExpansionChanged('ares', value);
    },
    'expansions.community': function(value: boolean) {
      this.handleExpansionChanged('community', value);
    },
    'expansions.moon': function(value: boolean) {
      this.handleExpansionChanged('moon', value);
    },
    'expansions.pathfinders': function(value: boolean) {
      this.handleExpansionChanged('pathfinders', value);
    },
    'expansions.ceo': function(value: boolean) {
      this.handleExpansionChanged('ceo', value);
    },
    'expansions.starwars': function(value: boolean) {
      this.handleExpansionChanged('starwars', value);
    },
    'expansions.underworld': function(value: boolean) {
      this.handleExpansionChanged('underworld', value);
    },
    'expansions.deltaProject': function(value: boolean) {
      this.handleExpansionChanged('deltaProject', value);
    },
    initialDraft(value: boolean) {
      if (value === true && this.preludeDraftVariant === undefined) {
        this.preludeDraftVariant = true;
      }
      if (value === true && this.ceosDraftVariant === undefined) {
        this.ceosDraftVariant = true;
      }
      if (value === false) {
        this.initialDraftOneWay = false;
      }
    },
    showCorporationList(value: boolean) {
      if (value === true) {
        this.customCorporations = this.getDefaultCustomCorporations();
      }
    },
    showPreludesList(value: boolean) {
      if (value === true) {
        this.customPreludes = this.getDefaultCustomPreludes();
      }
    },
    showColoniesList(value: boolean) {
      if (value === true) {
        this.customColonies = this.getDefaultCustomColonies();
      }
    },
    'expansions.prelude': function(value: boolean) {
      if (value === true && this.preludeDraftVariant === undefined) {
        this.preludeDraftVariant = true;
      }
      this.handleExpansionChanged('prelude', value);
    },
    'expansions.prelude2': function(value: boolean) {
      if (value === true && this.preludeToggled === false && this.uploading === false) {
        this.expansions.prelude = true;
        this.preludeToggled = true;
      }
      this.handleExpansionChanged('prelude2', value);
    },
    playersCount(value: number) {
      if (value === 1) {
        this.expansions.corpera = true;
      }
      this.syncSolarPhaseOptionToPlayerCount(value);
      if (this.playerProfilePickerIndex !== null && this.playerProfilePickerIndex >= value) {
        this.closePlayerProfilePicker();
      }
    },
  },
  mounted() {
    setDocumentTitle('Create New Game');
    this.restoreLastSettings();
    void ensureEloLoaded();
    document.addEventListener('click', this.closePlayerProfilePickerFromDocument);
    window.addEventListener('resize', this.updatePlayerProfileMenuPosition);
    window.visualViewport?.addEventListener('resize', this.updatePlayerProfileMenuPosition);
    const urlParams = new URLSearchParams(window.location.search);
    const cloneId = urlParams.get('cloneGameId');
    if (cloneId) {
      void this.loadRematchSetup(cloneId as GameId);
    }
  },
  unmounted() {
    document.removeEventListener('click', this.closePlayerProfilePickerFromDocument);
    window.removeEventListener('resize', this.updatePlayerProfileMenuPosition);
    window.visualViewport?.removeEventListener('resize', this.updatePlayerProfileMenuPosition);
  },
  computed: {
    wikiUrls(): typeof RULEBOOK_URLS & typeof WIKI_URLS {
      return {...RULEBOOK_URLS, ...WIKI_URLS};
    },
    typedRefs(): Refs {
      return this.$refs as Refs;
    },
    RandomBoardOption(): typeof RandomBoardOption {
      return RandomBoardOption;
    },
    RandomMAOptionType(): typeof RandomMAOptionType {
      return RandomMAOptionType;
    },
    constants(): typeof constants {
      return constants;
    },
    DEFAULT_PLAYER_COLORS(): typeof DEFAULT_PLAYER_COLORS {
      return DEFAULT_PLAYER_COLORS;
    },
    boards() {
      return [
        BoardName.THARSIS,
        BoardName.HELLAS,
        BoardName.ELYSIUM,
        RandomBoardOption.OFFICIAL,
        BoardName.UTOPIA_PLANITIA,
        BoardName.VASTITAS_BOREALIS_NOVA,
        BoardName.TERRA_CIMMERIA_NOVA,
        BoardName.ARABIA_TERRA,
        BoardName.AMAZONIS,
        BoardName.TERRA_CIMMERIA,
        BoardName.VASTITAS_BOREALIS,
        BoardName.HOLLANDIA,
        RandomBoardOption.ALL,
      ];
    },
  },
  methods: {
    restoreLastSettings() {
      const lastSettings = TemplateManager.getLastSettings();
      if (lastSettings) {
        this.applySettings(lastSettings);
      }
    },
    applySettings(json: JSONObject) {
      const component: CreateGameModel = this;
      const refs = this.typedRefs;
      const root = vueRoot(this);
      try {
        this.uploading = true;
        const processor = new JSONProcessor(component);
        processor.applyJSON(json);
        nextTick(() => {
          try {
            if (component.showBannedCards && refs.cardsFilter) {
              refs.cardsFilter.selected = processor.bannedCards;
            }
            if (component.showIncludedCards && refs.cardsFilter2) {
              refs.cardsFilter2.selected = processor.includedCards;
            }
            if (!component.seededGame) {
              component.seed = Math.random();
            }
            this.rememberCustomSelectionExclusions();
            this.syncSolarPhaseOptionToPlayerCount();
            this.syncCustomSelectionsWithExpansions();
            this.uploading = false;
          } catch (e) {
            console.error('Error applying settings:', e);
            this.uploading = false;
          }
        });
      } catch (e) {
        root.showAlert('Load settings', 'Error: ' + e);
        this.uploading = false;
      }
    },
    async loadRematchSetup(gameId: GameId) {
      try {
        const response = await fetch(paths.API_CLONEABLEGAME + '?id=' + gameId + '&setup=true');
        if (!response.ok) {
          vueRoot(this).showAlert('Rematch', 'Could not load game setup for rematch.');
          return;
        }
        const gameData = await response.json();
        if (gameData.setup === undefined) {
          vueRoot(this).showAlert('Rematch', 'Could not load game setup for rematch.');
          return;
        }
        this.applySettings(gameData.setup);
        this.seededGame = false;
        this.clonedGameId = undefined;
      } catch (e) {
        vueRoot(this).showAlert('Rematch', 'Could not load game setup for rematch: ' + e);
      }
    },
    loadSelectedTemplate() {
      if (!this.selectedTemplate) {
        return;
      }
      const tmpl = TemplateManager.getTemplate(this.selectedTemplate);
      if (!tmpl) {
        return;
      }
      this.applySettings(tmpl.settings);
      vueRoot(this).showAlert('Template', 'Template "' + this.selectedTemplate + '" loaded.');
    },
    saveAsTemplate() {
      const name = prompt('Template name:', this.selectedTemplate || '');
      if (!name || name.trim() === '') {
        return;
      }
      const trimmed = name.trim();
      const existing = TemplateManager.getTemplate(trimmed);
      if (existing) {
        if (!confirm('Template "' + trimmed + '" already exists. Overwrite?')) {
          return;
        }
      }
      const settings = TemplateManager.serializeFormState(this);
      TemplateManager.saveTemplate(trimmed, settings);
      this.templates = TemplateManager.getTemplates();
      this.selectedTemplate = trimmed;
      vueRoot(this).showAlert('Template', 'Template "' + trimmed + '" saved.');
    },
    deleteSelectedTemplate() {
      if (!this.selectedTemplate) {
        return;
      }
      if (!confirm('Delete template "' + this.selectedTemplate + '"?')) {
        return;
      }
      TemplateManager.deleteTemplate(this.selectedTemplate);
      this.templates = TemplateManager.getTemplates();
      this.selectedTemplate = '';
    },
    exportSelectedTemplate() {
      if (!this.selectedTemplate) {
        return;
      }
      const tmpl = TemplateManager.getTemplate(this.selectedTemplate);
      if (!tmpl) {
        return;
      }
      const a = document.createElement('a');
      const blob = new Blob([JSON.stringify(tmpl.settings, undefined, 4)], {'type': 'application/json'});
      a.href = window.URL.createObjectURL(blob);
      a.download = 'tm_template_' + tmpl.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
      a.click();
    },
    triggerTemplateImport() {
      this.typedRefs.templateFile.click();
    },
    importTemplateFile() {
      const refs = this.typedRefs;
      const file = refs.templateFile.files !== null ? refs.templateFile.files[0] : undefined;
      if (!file) {
        return;
      }
      const reader = new FileReader();
      const root = vueRoot(this);
      reader.addEventListener('load', () => {
        try {
          const text = reader.result;
          if (typeof text !== 'string') {
            return;
          }
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            let imported = 0;
            for (const item of json) {
              if (item.name && item.settings) {
                TemplateManager.saveTemplate(item.name, item.settings);
                imported++;
              }
            }
            this.templates = TemplateManager.getTemplates();
            root.showAlert('Import', 'Imported ' + imported + ' template(s).');
          } else {
            const name = prompt('Name for imported template:', file.name.replace(/\.json$/i, ''));
            if (!name || name.trim() === '') {
              return;
            }
            TemplateManager.saveTemplate(name.trim(), json);
            this.templates = TemplateManager.getTemplates();
            this.selectedTemplate = name.trim();
            root.showAlert('Import', 'Template "' + name.trim() + '" imported.');
          }
        } catch (e) {
          root.showAlert('Import', 'Error parsing file: ' + e);
        }
        refs.templateFile.value = '';
      });
      reader.readAsText(file);
    },
    async downloadSettings() {
      const serializedData = await this.serializeSettings();

      if (serializedData) {
        const a = document.createElement('a');
        const blob = new Blob([serializedData], {'type': 'application/json'});
        a.href = window.URL.createObjectURL(blob);
        a.download = 'tm_settings.json';
        a.click();
      }
    },
    uploadSettings() {
      const refs = this.typedRefs;
      const file = refs.file.files !== null ? refs.file.files[0] : undefined;
      const reader = new FileReader();
      const component: CreateGameModel = this;
      const root = vueRoot(this);


      reader.addEventListener('load', () => {
        try {
          const readerResults = reader.result;
          const processor = new JSONProcessor(component);
          if (typeof(readerResults) === 'string') {
            this.uploading = true;
            const results = JSON.parse(readerResults);
            processor.applyJSON(results);

            nextTick(() => {
              try {
                if (component.showBannedCards) {
                  refs.cardsFilter.selected = processor.bannedCards;
                }
                if (component.showIncludedCards) {
                  refs.cardsFilter2.selected = processor.includedCards;
                }
                if (!component.seededGame) {
                  component.seed = Math.random();
                }
                this.rememberCustomSelectionExclusions();
                this.syncSolarPhaseOptionToPlayerCount();
                this.syncCustomSelectionsWithExpansions();
                this.uploading = false;
              } catch (e) {
                root.showAlert('Upload settings', 'Error reading JSON ' + e);
              }
            });
          }
          if (processor.warnings.length > 0) {
            root.showAlert('Upload settings', 'Settings loaded with these warnings: \n' + processor.warnings.join('\n'));
          } else {
            root.showAlert('Upload settings', 'Settings loaded.');
          }
        } catch (e) {
          root.showAlert('Upload settings', 'Error loading settings ' + e);
        }
      }, false);
      if (file) {
        if (/\.json$/i.test(file.name)) {
          reader.readAsText(file);
        }
      }
    },
    getPlayerNamePlaceholder(index: number): string {
      return translateTextWithParams('Player ${0} name', [String(index + 1)]);
    },
    applyDefaultPlayerColor(player: NewPlayerModel, color: Color) {
      const lockedName = getLockedPlayerName(player.color);
      if (lockedName !== undefined && player.name === lockedName) {
        player.name = '';
      }
      player.color = color;
    },
    getDefaultSolarPhaseOption(playersCount = this.playersCount): boolean {
      return playersCount <= 3;
    },
    syncSolarPhaseOptionToPlayerCount(playersCount = this.playersCount) {
      this.solarPhaseOption = this.getDefaultSolarPhaseOption(playersCount);
    },
    handleExpansionChanged(_expansion: Expansion, _enabled: boolean) {
      if (this.uploading) {
        return;
      }
      this.syncCustomSelectionsWithExpansions();
    },
    isModuleEnabled(module: GameModule): boolean {
      return module === 'base' || this.expansions[module];
    },
    isCardModuleAllowedForCustomSelection(card: ClientCard): boolean {
      return this.isModuleEnabled(card.module) || CUSTOM_CARD_MODULE_EXCEPTIONS.has(card.name);
    },
    isCardCompatibilityAllowedForCustomSelection(card: ClientCard): boolean {
      const ignored = new Set(CUSTOM_CARD_COMPATIBILITY_EXCEPTIONS[card.name] ?? []);
      return (card.compatibility ?? []).every((module) => {
        if (module === 'base' || ignored.has(module as Expansion)) {
          return true;
        }
        return this.isModuleEnabled(module);
      });
    },
    isCardAllowedForCustomSelection(card: ClientCard): boolean {
      return this.isCardModuleAllowedForCustomSelection(card) &&
        this.isCardCompatibilityAllowedForCustomSelection(card);
    },
    getSelectableCustomCorporations(): Array<CardName> {
      return getCards(byType(CardType.CORPORATION))
        .filter((card) => card.name !== CardName.BEGINNER_CORPORATION)
        .filter((card) => this.isCardAllowedForCustomSelection(card))
        .map((card) => card.name)
        .sort();
    },
    getSelectableCustomPreludes(): Array<CardName> {
      return getCards(byType(CardType.PRELUDE))
        .filter((card) => card.name !== CardName.DELTA_PROJECT)
        .filter((card) => this.isCardAllowedForCustomSelection(card))
        .map((card) => card.name)
        .sort();
    },
    getSelectableCustomColonies(): Array<ColonyName> {
      if (!this.expansions.colonies) {
        return [];
      }
      return [
        ...OFFICIAL_COLONY_NAMES,
        ...COMMUNITY_COLONY_NAMES,
        ...PATHFINDERS_COLONY_NAMES,
      ]
        .filter((colonyName) => {
          if ((PATHFINDERS_COLONY_NAMES as ReadonlyArray<ColonyName>).includes(colonyName) && !this.expansions.pathfinders) {
            return false;
          }
          if ((COMMUNITY_COLONY_NAMES as ReadonlyArray<ColonyName>).includes(colonyName) && !this.expansions.community) {
            return false;
          }
          const expansion = getColony(colonyName)?.expansion;
          return expansion === undefined || this.expansions[expansion];
        })
        .sort();
    },
    getDefaultCustomCorporations(): Array<CardName> {
      return mergeCustomSelectionWithExclusions(
        this.customCorporations,
        this.getSelectableCustomCorporations(),
        this.customCorporationExclusions,
      );
    },
    getDefaultCustomPreludes(): Array<CardName> {
      return mergeCustomSelectionWithExclusions(
        this.customPreludes,
        this.getSelectableCustomPreludes(),
        this.customPreludesExclusions,
      );
    },
    getDefaultCustomColonies(): Array<ColonyName> {
      return mergeCustomSelectionWithExclusions(
        this.customColonies,
        this.getSelectableCustomColonies(),
        this.customColonyExclusions,
      );
    },
    rememberCustomSelectionExclusions() {
      if (this.showCorporationList || this.customCorporations.length > 0) {
        this.customCorporationExclusions = getCustomSelectionExclusions(
          this.getSelectableCustomCorporations(),
          this.customCorporations,
          this.customCorporationExclusions,
        );
      }
      if (this.showPreludesList || this.customPreludes.length > 0) {
        this.customPreludesExclusions = getCustomSelectionExclusions(
          this.getSelectableCustomPreludes(),
          this.customPreludes,
          this.customPreludesExclusions,
        );
      }
      if (this.showColoniesList || this.customColonies.length > 0) {
        this.customColonyExclusions = getCustomSelectionExclusions(
          this.getSelectableCustomColonies(),
          this.customColonies,
          this.customColonyExclusions,
        );
      }
    },
    syncCustomSelectionsWithExpansions() {
      if (this.showCorporationList || this.customCorporations.length > 0) {
        this.customCorporations = this.getDefaultCustomCorporations();
      }
      if (this.showPreludesList || this.customPreludes.length > 0) {
        this.customPreludes = this.getDefaultCustomPreludes();
      }
      if (this.showColoniesList || this.customColonies.length > 0) {
        this.customColonies = this.getDefaultCustomColonies();
      }
    },
    getPlayerProfiles(): ReadonlyArray<PlayerProfile> {
      if (sharedEloState.loaded && Object.keys(sharedEloState.players).length > 0) {
        return buildPlayerProfilesFromEloPlayers(sharedEloState.players);
      }
      return PLAYER_PROFILES;
    },
    getSelectedPlayerProfile(player: NewPlayerModel): PlayerProfile | undefined {
      return getPlayerProfileByName(player.name, this.getPlayerProfiles());
    },
    getAvailablePlayerProfiles(player: NewPlayerModel): ReadonlyArray<PlayerProfile> {
      const playerProfiles = this.getPlayerProfiles();
      const takenProfileIds = new Set(this.getPlayers()
        .filter((candidate) => candidate !== player)
        .map((candidate) => getPlayerProfileByName(candidate.name, playerProfiles)?.id)
        .filter((id): id is string => id !== undefined));
      return playerProfiles.filter((profile) => !takenProfileIds.has(profile.id));
    },
    getFilteredAvailablePlayerProfiles(player: NewPlayerModel): ReadonlyArray<PlayerProfile> {
      const query = this.playerProfileSearch.trim().toLowerCase();
      const profiles = this.getAvailablePlayerProfiles(player);
      if (query === '') {
        return profiles;
      }
      return profiles.filter((profile) =>
        profile.name.toLowerCase().includes(query) ||
        profile.aliases.some((alias) => alias.includes(query)) ||
        String(Math.round(Number(profile.elo ?? 0))).includes(query));
    },
    formatPlayerProfileMeta(profile: PlayerProfile): string {
      const parts: Array<string> = [];
      if (profile.elo !== undefined) {
        parts.push(`ELO ${Math.round(profile.elo)}`);
      }
      if (profile.games !== undefined) {
        parts.push(`${Math.round(profile.games)} games`);
      }
      return parts.join(' · ') || 'Profile';
    },
    getPlayerProfileInitials(profile: PlayerProfile): string {
      return getPlayerProfileAvatarInitials(profile);
    },
    getPlayerProfileAvatarClasses(profile: PlayerProfile): Array<string> {
      return [
        this.getPlayerCubeColorClass(profile.preferredColor),
        `create-game-profile-avatar--pattern-${getPlayerProfileAvatarPattern(profile)}`,
      ];
    },
    getPlayerProfileOptionClasses(profile: PlayerProfile): Array<string> {
      return [
        'create-game-profile-option',
        'create-game-profile-option-colored',
        this.getPlayerContainerColorClass(profile.preferredColor),
      ];
    },
    getCustomNickMeta(): string {
      return this.playerProfileSearch.trim() || 'Type a custom player name';
    },
    isPlayerProfilePickerOpen(index: number): boolean {
      return this.playerProfilePickerIndex === index;
    },
    getPlayerProfileMenuStyle(): CSSProperties {
      if (this.playerProfileMenuPosition === null) {
        return {};
      }
      return {
        left: `${this.playerProfileMenuPosition.left}px`,
        top: `${this.playerProfileMenuPosition.top}px`,
        width: `${this.playerProfileMenuPosition.width}px`,
        maxHeight: `${this.playerProfileMenuPosition.maxHeight}px`,
      };
    },
    openPlayerProfilePicker(player: NewPlayerModel, index: number, event: FocusEvent | MouseEvent) {
      this.playerProfilePickerIndex = index;
      this.playerProfileSearch = player.name;
      this.playerProfileMenuPosition = this.getPlayerProfileMenuPosition(event.currentTarget);
    },
    updatePlayerProfileAutocomplete(player: NewPlayerModel, event: Event) {
      const value = event.target instanceof window.HTMLInputElement ? event.target.value : this.playerProfileSearch;
      this.playerProfileSearch = value;
      player.name = value.trim();
    },
    applyFirstFilteredPlayerProfile(player: NewPlayerModel) {
      const [profile] = this.getFilteredAvailablePlayerProfiles(player);
      if (profile === undefined) {
        player.name = this.playerProfileSearch.trim();
        this.closePlayerProfilePicker();
        return;
      }
      this.applyPlayerProfileFromPicker(player, profile);
    },
    applyCustomNickFromPicker(player: NewPlayerModel) {
      player.name = this.playerProfileSearch.trim();
      this.closePlayerProfilePicker();
    },
    updatePlayerProfileMenuPosition() {
      if (this.playerProfilePickerIndex === null) {
        return;
      }
      const trigger = this.getOpenPlayerProfileTrigger();
      if (trigger === null) {
        this.closePlayerProfilePicker();
        return;
      }
      this.playerProfileMenuPosition = this.getPlayerProfileMenuPosition(trigger);
    },
    getOpenPlayerProfileTrigger(): HTMLElement | null {
      if (this.playerProfilePickerIndex === null) {
        return null;
      }
      const triggers = this.$el.querySelectorAll<HTMLElement>('.create-game-player-name');
      return triggers[this.playerProfilePickerIndex] ?? null;
    },
    getPlayerProfileMenuPosition(target: EventTarget | null): PlayerProfileMenuPosition | null {
      if (!(target instanceof HTMLElement)) {
        return null;
      }
      const rect = target.getBoundingClientRect();
      const margin = 12;
      const gap = 6;
      const availableWidth = Math.max(240, window.innerWidth - margin * 2);
      const width = Math.min(Math.max(420, rect.width), availableWidth);
      const left = this.clamp(rect.left, margin, Math.max(margin, window.innerWidth - width - margin));
      const below = window.innerHeight - rect.bottom - margin - gap;
      const above = rect.top - margin - gap;
      const openBelow = below >= 360 || below >= above;
      const availableHeight = Math.max(openBelow ? below : above, 180);
      const maxHeight = Math.min(620, window.innerHeight - margin * 2, availableHeight);
      const top = openBelow ?
        this.clamp(rect.bottom + gap, margin, window.innerHeight - maxHeight - margin) :
        this.clamp(rect.top - gap - maxHeight, margin, window.innerHeight - maxHeight - margin);
      return {left, top, width, maxHeight};
    },
    clamp(value: number, min: number, max: number): number {
      return Math.min(Math.max(value, min), Math.max(min, max));
    },
    closePlayerProfilePicker() {
      this.playerProfilePickerIndex = null;
      this.playerProfileSearch = '';
      this.playerProfileMenuPosition = null;
    },
    closePlayerProfilePickerFromDocument() {
      this.closePlayerProfilePicker();
    },
    getAvailablePlayerProfileColor(player: NewPlayerModel, profile: PlayerProfile): Color {
      const usedColors = new Set(this.getPlayers()
        .filter((candidate) => candidate !== player)
        .map((candidate) => candidate.color));
      if (!usedColors.has(profile.preferredColor)) {
        return profile.preferredColor;
      }
      if (
        DEFAULT_PLAYER_COLORS.includes(player.color as typeof DEFAULT_PLAYER_COLORS[number]) &&
        !usedColors.has(player.color)
      ) {
        return player.color;
      }
      return DEFAULT_PLAYER_COLORS.find((color) => !usedColors.has(color)) ?? player.color;
    },
    applyPlayerProfile(player: NewPlayerModel, profile: PlayerProfile) {
      player.name = profile.name;
      player.color = this.getAvailablePlayerProfileColor(player, profile);
    },
    applyPlayerProfileFromPicker(player: NewPlayerModel, profile: PlayerProfile) {
      if (!this.getAvailablePlayerProfiles(player).some((candidate) => candidate.id === profile.id)) {
        return;
      }
      this.applyPlayerProfile(player, profile);
      this.closePlayerProfilePicker();
    },
    getAvailableDefaultColor(player: NewPlayerModel): Color {
      const usedColors = new Set(this.getPlayers()
        .filter((candidate) => candidate !== player)
        .map((candidate) => candidate.color));
      return DEFAULT_PLAYER_COLORS.find((color) => !usedColors.has(color)) ?? DEFAULT_PLAYER_COLORS[0];
    },
    updateCustomCorporations(customCorporations: Array<CardName>) {
      this.customCorporationExclusions = getCustomSelectionExclusions(
        this.getSelectableCustomCorporations(),
        customCorporations,
        this.customCorporationExclusions,
      );
      this.customCorporations = customCorporations;
    },
    updateCustomPreludes(customPreludes: Array<CardName>) {
      this.customPreludesExclusions = getCustomSelectionExclusions(
        this.getSelectableCustomPreludes(),
        customPreludes,
        this.customPreludesExclusions,
      );
      this.customPreludes = customPreludes;
    },
    updateBannedCards(bannedCards: Array<CardName>) {
      this.bannedCards = bannedCards;
    },
    updateIncludedCards(includedCards: Array<CardName>) {
      this.includedCards = includedCards;
    },
    updateCustomColonies(customColonies: Array<ColonyName>) {
      this.customColonyExclusions = getCustomSelectionExclusions(
        this.getSelectableCustomColonies(),
        customColonies,
        this.customColonyExclusions,
      );
      this.customColonies = customColonies;
    },
    updateCustomCeos(customCeos: Array<CardName>) {
      this.customCeos = customCeos;
    },
    getPlayers(): Array<NewPlayerModel> {
      return this.players.slice(0, this.playersCount);
    },
    normalizeTelegramId(telegramID: string | undefined): string {
      return (telegramID ?? '').trim();
    },
    isTelegramIdValid(telegramID: string | undefined): boolean {
      const normalized = this.normalizeTelegramId(telegramID);
      return normalized === '' || /^\d{5,20}$/.test(normalized);
    },
    getTelegramIdError(telegramID: string | undefined): string {
      if (this.isTelegramIdValid(telegramID)) {
        return '';
      }
      return 'Use digits only. Open @tm_knightbyte_bot and send /start first.';
    },
    isRandomMAEnabled(): Boolean {
      return this.randomMA !== RandomMAOptionType.NONE;
    },
    randomMAToggle() {
      if (this.randomMA === RandomMAOptionType.NONE) {
        this.randomMA = RandomMAOptionType.LIMITED;
      } else {
        this.randomMA = RandomMAOptionType.NONE;
      }
    },
    getRandomMaOptionType(type: 'limited' | 'full'): RandomMAOptionType {
      if (type === 'limited') {
        return RandomMAOptionType.LIMITED;
      } else if (type === 'full') {
        return RandomMAOptionType.UNLIMITED;
      } else {
        return RandomMAOptionType.NONE;
      }
    },
    isPoliticalAgendasExtensionEnabled(): Boolean {
      return this.politicalAgendasExtension !== 'Standard';
    },
    politicalAgendasExtensionToggle() {
      if (this.politicalAgendasExtension === 'Standard') {
        this.politicalAgendasExtension = 'Random';
      } else {
        this.politicalAgendasExtension = 'Standard';
      }
    },
    getPoliticalAgendasExtensionAgendaStyle(type: 'random' | 'chairman'): AgendaStyle {
      if (type === 'random') {
        return 'Random';
      } else if (type === 'chairman') {
        return 'Chairman';
      } else {
        console.warn('AgendaStyle not found');
        return 'Standard';
      }
    },
    isBeginnerToggleEnabled(): Boolean {
      return !(this.initialDraft || this.expansions.prelude || this.expansions.venus || this.expansions.colonies || this.expansions.turmoil);
    },
    getPlayersCountText(count: number): string {
      if (count === 1) {
        return translateText('Solo');
      }
      return count.toString();
    },
    deselectVenusCompletion() {
      if (this.expansions.venus === false) {
        this.requiresVenusTrackCompletion = false;
      }
    },
    deselectMoonCompletion() {
      if (this.expansions.moon === false) {
        this.requiresMoonTrackCompletion = false;
        this.moonStandardProjectVariant = false;
        this.moonStandardProjectVariant1 = false;
      }
    },
    getBoardColorClass(boardName: BoardName | BoardNameType): string {
      switch (boardName) {
      case BoardName.THARSIS:
        return 'create-game-board-hexagon create-game-tharsis';
      case BoardName.HELLAS:
        return 'create-game-board-hexagon create-game-hellas';
      case BoardName.ELYSIUM:
        return 'create-game-board-hexagon create-game-elysium';
      case BoardName.UTOPIA_PLANITIA:
        return 'create-game-board-hexagon create-game-utopia-planitia';
      case BoardName.VASTITAS_BOREALIS_NOVA:
        return 'create-game-board-hexagon create-game-vastitas-borealis-nova';
      case BoardName.AMAZONIS:
        return 'create-game-board-hexagon create-game-amazonis';
      case BoardName.ARABIA_TERRA:
        return 'create-game-board-hexagon create-game-arabia-terra';
      case BoardName.TERRA_CIMMERIA:
        return 'create-game-board-hexagon create-game-terra-cimmeria';
      case BoardName.VASTITAS_BOREALIS:
        return 'create-game-board-hexagon create-game-vastitas-borealis';
      case BoardName.HOLLANDIA:
        return 'create-game-board-hexagon create-game-hollandia';
      default:
        return 'create-game-board-hexagon create-game-random';
      }
    },
    getPlayerCubeColorClass(color: Color): string {
      return playerColorClass(color, 'bg');
    },
    getPlayerContainerColorClass(color: Color): string {
      return playerColorClass(color, 'bg_transparent');
    },
    getColorTitle(color: Color): string {
      const identity = LOCKED_PLAYER_IDENTITIES.find((candidate) => candidate.color === color);
      if (identity !== undefined) {
        return `${identity.label || identity.name} · ${identity.colorLabel}`;
      }
      return color;
    },
    boardHref(boardName: BoardName | RandomBoardOption) {
      const options: Record<BoardName | RandomBoardOption, string> = {
        [BoardName.THARSIS]: 'tharsis',
        [BoardName.HELLAS]: 'hellas',
        [BoardName.ELYSIUM]: 'elysium',
        [BoardName.ARABIA_TERRA]: 'arabia-terra',
        [BoardName.UTOPIA_PLANITIA]: 'utopia-planitia',
        [BoardName.VASTITAS_BOREALIS_NOVA]: 'vastitas-borealis-nova',
        [BoardName.VASTITAS_BOREALIS]: 'vastitas-borealis',
        [BoardName.AMAZONIS]: 'amazonis-planatia',
        [BoardName.TERRA_CIMMERIA]: 'terra-cimmeria',
        [BoardName.TERRA_CIMMERIA_NOVA]: 'terra-cimmeria-nova',
        [BoardName.HOLLANDIA]: 'hollandia',
        [RandomBoardOption.OFFICIAL]: '',
        [RandomBoardOption.ALL]: '',
      };
      return `${WIKI}/Maps#${options[boardName]}`;
    },
    async serializeSettings() {
      let players = this.players.slice(0, this.playersCount);

      if (this.randomFirstPlayer) {
        // Shuffle players array to assign each player a random seat around the table
        players = players.map((a) => ({sort: Math.random(), value: a}))
          .sort((a, b) => a.sort - b.sort)
          .map((a) => a.value);
        this.firstIndex = Math.floor(this.seed * this.playersCount) + 1;
      }

      // Auto assign an available color if there are duplicates
      const uniqueColors = new Set(players.map((player) => player.color));
      if (uniqueColors.size !== players.length) {
        const usedColors: Set<Color> = new Set();
        // This filter retains the default player color order.
        const unusedColors = DEFAULT_PLAYER_COLORS.filter((c) => !uniqueColors.has(c));
        for (const player of players) {
          const color = player.color;
          if (usedColors.has(color)) {
            // Pulling off the front of the list also helps retain the default player color order.
            const lockedName = getLockedPlayerName(color);
            const replacementColor = unusedColors.shift() as Color;
            if (lockedName !== undefined && player.name === lockedName) {
              player.name = '';
            }
            player.color = replacementColor;
            usedColors.add(replacementColor);
          } else {
            usedColors.add(color);
          }
        }
      }

      // Set player name automatically if not entered
      const isSoloMode = this.playersCount === 1;

      players.forEach((player) => {
        if (player.name === '') {
          if (isSoloMode) {
            player.name = this.$t('You');
          } else {
            const defaultPlayerName = this.$t(player.color.charAt(0).toUpperCase() + player.color.slice(1));
            player.name = defaultPlayerName;
          }
        }
      });

      const turnBasedGame = this.turnBasedGame === true;
      const botGame = this.botGame === true;
      if (turnBasedGame) {
        const invalidTelegramPlayerIndex = players.findIndex((player) => !this.isTelegramIdValid(player.telegramID));
        if (invalidTelegramPlayerIndex !== -1) {
          window.alert(translateTextWithParams('Player ${0}: invalid Telegram ID. Use digits only and send /start to @tm_knightbyte_bot first.', [(invalidTelegramPlayerIndex + 1).toString()]));
          return;
        }
        const telegramRecipients = players.filter((player) => this.normalizeTelegramId(player.telegramID) !== '').length;
        if (telegramRecipients > 0) {
          const confirmed = window.confirm(translateTextWithParams(
            'Async Telegram game will send turn notifications to ${0} player(s). Confirm that each Telegram ID belongs to the matching player.',
            [telegramRecipients.toString()],
          ));
          if (confirmed === false) {
            return;
          }
        }
      }

      players.forEach((player) => {
        player.telegramID = turnBasedGame ? this.normalizeTelegramId(player.telegramID) : '';
        if (!botGame) {
          player.isBot = false;
        }
      });

      players.map((player: any) => {
        player.first = (this.firstIndex === player.index);
        return player;
      });

      const draftVariant = this.draftVariant;
      const initialDraft = this.initialDraft;
      const initialDraftOneWay = this.initialDraftOneWay;
      const randomMA = this.randomMA;
      const showOtherPlayersVP = this.showOtherPlayersVP;
      this.syncSolarPhaseOptionToPlayerCount(players.length);
      const solarPhaseOption = this.solarPhaseOption;
      const shuffleMapOption = this.shuffleMapOption;
      const customColonies = this.customColonies;
      const customCorporations = this.customCorporations;
      const customPreludes = this.customPreludes;
      const bannedCards = this.bannedCards;
      const includedCards = this.includedCards;
      const board = this.board;
      const seed = this.seed;
      const politicalAgendasExtension = this.politicalAgendasExtension;
      const undoOption = this.undoOption;
      const showTimers = this.showTimers;
      const fastModeOption = this.fastModeOption;
      const noEloGame = this.noEloGame;
      const privateHands = this.privateHands;
      const removeNegativeGlobalEventsOption = this.removeNegativeGlobalEventsOption;
      const includeFanMA = this.includeFanMA;
      const startingCorporations = this.startingCorporations;
      const soloTR = this.soloTR;
      const randomFirstPlayer = this.randomFirstPlayer;
      const requiresVenusTrackCompletion = this.requiresVenusTrackCompletion;
      const twoCorpsVariant = this.twoCorpsVariant;
      const customCeos = this.customCeos;
      const startingCeos = this.startingCeos;
      const startingPreludes = this.startingPreludes;
      let clonedGamedId: undefined | GameId = undefined;

      // Check custom colony count
      if (customColonies.length > 0) {
        const playersCount = players.length;
        let neededColoniesCount = playersCount + 2;
        if (playersCount === 1) {
          neededColoniesCount = 4;
        } else if (playersCount === 2) {
          neededColoniesCount = 5;
        }

        if (customColonies.length < neededColoniesCount) {
          window.alert(translateTextWithParams('Must select at least ${0} colonies', [neededColoniesCount.toString()]));
          return;
        }

        let valid = true;
        for (const colonyName of customColonies) {
          const colony = getColony(colonyName);
          if (colony.expansion !== undefined && !this.expansions[colony.expansion]) {
            valid = false;
            break;
          }
        }
        if (valid === false) {
          const confirm = window.confirm(translateText(
            'Some of the colonies you selected need expansions you have not enabled. Using them might break your game. Press OK to continue or Cancel to change your selections.'));
          if (confirm === false) {
            return;
          }
        }
      }

      if (players.length === 1 && this.expansions.corpera === false) {
        const confirm = window.confirm(translateText(
          'We do not recommend playing a solo game without the Corporate Era. Press OK if you want to play without it.'));
        if (confirm === false) {
          return;
        }
      }

      // Check Prelude 2 + Pathfinders infinite energy production
      let energyProductionBug = true;
      if (customCorporations.length > 0 && !customCorporations.includes(CardName.THORGATE)) {
        energyProductionBug = false;
      }
      if (this.bannedCards.includes(CardName.STANDARD_TECHNOLOGY)) {
        energyProductionBug = false;
      }

      if (this.bannedCards.includes(CardName.SUITABLE_INFRASTRUCTURE)) {
        energyProductionBug = false;
      } else {
        if (this.expansions.prelude2 === false && !this.includedCards.includes(CardName.SUITABLE_INFRASTRUCTURE)) {
          energyProductionBug = false;
        }
      }

      if (this.bannedCards.includes(CardName.HIGH_TEMP_SUPERCONDUCTORS)) {
        energyProductionBug = false;
      } else {
        if (this.expansions.pathfinders === false && !this.includedCards.includes(CardName.HIGH_TEMP_SUPERCONDUCTORS)) {
          energyProductionBug = false;
        }
      }

      if (energyProductionBug === true) {
        const confirm = window.confirm(translateText(
          'It is possible with ThorGate, Standard Technology, Suitable Infrastructure, and High Temp. Superconductors for a player to have infinite energy production. Press OK to continue or Cancel to change your selections.'));
        if (confirm === false) {
          return;
        }
      }

      // Check custom corp count
      if (customCorporations.length > 0) {
        let neededCorpsCount = players.length * startingCorporations;
        if (REVISED_COUNT_ALGORITHM) {
          if (this.twoCorpsVariant) {
            // Add an additional 4 for the Merger prelude
            // Everyone-Merger needs an additional 4 corps per player
            //  NB: This will not cover the case when no custom corp list is set!
            //  It _can_ come about if  the number of corps included in all expansions is still not enough.
            neededCorpsCount = (players.length * startingCorporations) + (players.length * 4);
          } else {
            neededCorpsCount = players.length * startingCorporations;
            // Merger Prelude alone needs 4 additional preludes
            if (this.expansions.prelude && this.expansions.promo) {
              neededCorpsCount += 4;
            }
          }
        }
        if (customCorporations.length < neededCorpsCount) {
          window.alert(translateTextWithParams('Must select at least ${0} corporations', [neededCorpsCount.toString()]));
          return;
        }
        let valid = true;
        for (const corp of customCorporations) {
          const card = getCard(corp);
          for (const module of card?.compatibility ?? []) {
            if (!this.expansions[module]) {
              valid = false;
            }
          }
        }
        if (valid === false) {
          const confirm = window.confirm(translateText(
            'Some of the corps you selected need expansions you have not enabled. Using them might break your game. Press OK to continue or Cancel to change your selections.'));
          if (confirm === false) {
            return;
          }
        }
      } else {
        customCorporations.length = 0;
      }

      // TODO(kberg): this is a direct copy of the code right above.
      // Check custom prelude count
      if (customPreludes.length > 0) {
        const requiredPreludeCount = players.length * startingPreludes;
        if (customPreludes.length < requiredPreludeCount) {
          window.alert(translateTextWithParams('Must select at least ${0} Preludes', [requiredPreludeCount.toString()]));
          return;
        }
        let valid = true;
        for (const prelude of customPreludes) {
          const card = getCard(prelude);
          for (const module of card?.compatibility ?? []) {
            if (!this.expansions[module]) {
              valid = false;
            }
          }
        }
        if (valid === false) {
          const confirm = window.confirm(translateText(
            'Some of the Preludes you selected need expansions you have not enabled. Using them might break your game. Press OK to continue or Cancel to change your selections.'));
          if (confirm === false) {
            return;
          }
        }
      } else {
        customPreludes.length = 0;
      }

      // Clone game checks
      if (this.clonedGameId !== undefined && this.seededGame) {
        const gameData = await fetch(paths.API_CLONEABLEGAME + '?id=' + this.clonedGameId)
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
            if (response.status === 404) {
              return;
            }
            return response.text().then((res) => new Error(res));
          });
        if (gameData === undefined) {
          alert(this.$t('Game id ' + this.clonedGameId + ' not found'));
          return;
        }
        if (gameData instanceof Error) {
          alert(this.$t('Error looking for predefined game ' + gameData.message));
          return;
        }
        clonedGamedId = this.clonedGameId;
        if (gameData.playerCount !== players.length) {
          alert(this.$t('Player count mismatch'));
          this.playersCount = gameData.playerCount;
          return;
        }
      } else if (!this.seededGame) {
        clonedGamedId = undefined;
      }

      const dataToSend: NewGameConfig = {
        players,
        expansions: this.expansions,
        draftVariant,
        showOtherPlayersVP,
        customCorporationsList: customCorporations,
        customColoniesList: customColonies,
        customCeos: customCeos,
        customPreludes,
        bannedCards,
        includedCards,
        board,
        seed,
        solarPhaseOption,
        aresExtremeVariant: this.aresExtremeVariant,
        politicalAgendasExtension: politicalAgendasExtension,
        undoOption,
        showTimers,
        fastModeOption,
        privateHands,
        noEloGame,
        turnBasedGame,
        botGame,
        removeNegativeGlobalEventsOption,
        includeFanMA,
        modularMA: this.modularMA,
        startingCorporations,
        soloTR,
        clonedGamedId,
        initialDraft,
        initialDraftOneWay: initialDraft ? initialDraftOneWay : false,
        preludeDraftVariant: this.preludeDraftVariant ?? false,
        ceosDraftVariant: this.ceosDraftVariant ?? false,
        randomMA,
        shuffleMapOption,
        // beginnerOption,
        randomFirstPlayer,
        requiresVenusTrackCompletion,
        requiresMoonTrackCompletion: this.requiresMoonTrackCompletion,
        moonStandardProjectVariant: this.moonStandardProjectVariant,
        moonStandardProjectVariant1: this.moonStandardProjectVariant1,
        altVenusBoard: this.altVenusBoard,
        escapeVelocity: this.escapeVelocityMode ?
          {
            thresholdMinutes: this.escapeVelocityThreshold,
            bonusSectionsPerAction: this.escapeVelocityBonusSeconds,
            penaltyPeriodMinutes: this.escapeVelocityPeriod,
            penaltyVPPerPeriod: this.escapeVelocityPenalty,
          } : undefined,
        twoCorpsVariant,
        startingCeos,
        startingPreludes,
      };
      return JSON.stringify(dataToSend, undefined, 4);
    },
    async createGame() {
      const dataToSend = await this.serializeSettings();

      if (dataToSend === undefined) {
        return;
      }
      const onSuccess = (json: any) => {
        // Check for bot players
        const activePlayers = this.players.slice(0, this.playersCount);
        const botEntries: Array<string> = [];
        if (this.botGame) {
          for (const p of json.players) {
            const local = activePlayers.find((lp: NewPlayerModel) => lp.color === p.color);
            if (local && local.isBot) {
              botEntries.push(p.name + ':' + p.id);
            }
          }
        }
        if (botEntries.length > 0) {
          const cmd = 'node smartbot.js --game ' + json.id + ' --players "' + botEntries.join(',') + '"';
          prompt('Bot command (copy with Ctrl+C):', cmd);
        }

        if (json.players.length === 1) {
          window.location.href = 'player?id=' + json.players[0].id;
          return;
        } else {
          window.history.replaceState(json, `${constants.APP_NAME} - Game`, 'game?id=' + json.id);
          vueRoot(this).game = json;
          vueRoot(this).screen = 'game-home';
        }
      };

      // Auto-save current settings as last used
      TemplateManager.saveLastSettings(TemplateManager.serializeFormState(this));

      fetch(paths.API_CREATEGAME, {'method': 'POST', 'body': dataToSend, 'headers': {'Content-Type': 'application/json'}})
        .then((response) => response.text())
        .then((text) => {
          try {
            const json = JSON.parse(text);
            onSuccess(json);
          } catch (err) {
            throw new Error(text);
          }
        })
        .catch((error: Error) => {
          alert(error.message);
        });
    },
  },
});

</script>

<style scoped>
.create-game-telegram-banner {
  margin: 8px 0 14px;
  font-size: 14px;
  line-height: 1.5;
  color: #d7dce2;
}

.create-game-telegram-banner-label {
  margin-right: 6px;
  font-weight: 600;
  color: #f2f4f8;
}

.create-game-telegram-banner a {
  margin-right: 6px;
  font-weight: 600;
}

.create-game-telegram-banner code {
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #f2f4f8;
}

.create-game-telegram-row {
  margin-top: 10px;
}

.create-game-telegram-label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: inherit;
}

.create-game-telegram-input {
  max-width: 180px;
  font-size: 13px;
}

.create-game-telegram-error {
  color: #ffb0b0;
}
</style>
