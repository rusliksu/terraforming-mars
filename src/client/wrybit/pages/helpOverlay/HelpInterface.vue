<template>
  <div class="help-interface">
    <section class="help-overlay-section">
      <h2 class="help-overlay-section-title" v-i18n>One screen, no page scrolling</h2>
      <p class="help-overlay-section-lead" v-i18n>
        On a desktop the player view keeps the board, players and action panel on one screen.
        Long card, log and setup lists scroll inside their own panel instead of moving the whole page.
      </p>
      <div class="help-interface-grid">
        <article class="help-interface-card">
          <h3 v-i18n>Make the board smaller</h3>
          <p v-i18n>Drag the handle above the log, or use “Hide board”, to give the action panel more room.</p>
        </article>
        <article class="help-interface-card">
          <h3 v-i18n>Resize the player area</h3>
          <p v-i18n>Drag the handle below the players table. The table scales instead of becoming a long scroll.</p>
        </article>
        <article class="help-interface-card">
          <h3 v-i18n>Card size</h3>
          <p v-i18n>Use the ZOOM slider above a card list. It changes cards only; the rest of the screen stays put.</p>
        </article>
      </div>
    </section>

    <section class="help-overlay-section">
      <h2 class="help-overlay-section-title" v-i18n>Keyboard</h2>
      <p class="help-overlay-section-lead" v-i18n>
        Press ? at any time for the full, searchable shortcut list. These are the shortcuts used most often:
      </p>
      <div class="help-interface-keys">
        <div class="help-interface-key"><kbd>Q</kbd><span v-i18n>Cards in hand</span></div>
        <div class="help-interface-key"><kbd>W</kbd><span v-i18n>Actions</span></div>
        <div class="help-interface-key"><kbd>E</kbd><span v-i18n>Projects</span></div>
        <div class="help-interface-key"><kbd>T</kbd><span v-i18n>Standard projects</span></div>
        <div class="help-interface-key"><kbd>R</kbd><span v-i18n>Awards / milestones</span></div>
        <div class="help-interface-key"><kbd>Z</kbd><span v-i18n>Pass</span></div>
        <div class="help-interface-key"><kbd>X</kbd><span v-i18n>End generation</span></div>
        <div class="help-interface-key"><kbd>1…9</kbd><span v-i18n>Choose a card or option</span></div>
        <div class="help-interface-key"><kbd>Enter</kbd><span v-i18n>Confirm the current step</span></div>
        <div class="help-interface-key"><kbd>Space</kbd><span v-i18n>Continue a normal step</span></div>
        <div class="help-interface-key"><kbd>Esc</kbd><span v-i18n>Cancel / close</span></div>
        <div class="help-interface-key"><kbd>Ctrl+Z</kbd><span v-i18n>Undo</span></div>
        <div class="help-interface-key"><kbd>, .</kbd><span v-i18n>Previous / next tab</span></div>
        <div class="help-interface-key"><kbd>?</kbd><span v-i18n>This help</span></div>
      </div>
    </section>

    <section class="help-overlay-section">
      <h2 class="help-overlay-section-title" v-i18n>On a phone or tablet</h2>
      <div class="help-interface-grid">
        <article class="help-interface-card">
          <h3 v-i18n>Use the bottom tabs</h3>
          <p v-i18n>Cards, actions and the board are separate tabs; the current action always opens first.</p>
        </article>
        <article class="help-interface-card">
          <h3 v-i18n>Turn the phone sideways</h3>
          <p v-i18n>Landscape gives the board and card text more width without changing the game state.</p>
        </article>
        <article class="help-interface-card">
          <h3 v-i18n>Tap instead of typing</h3>
          <p v-i18n>All card, space and amount choices are buttons. The keyboard shortcuts are optional.</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style lang="less" scoped>
.help-interface-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.help-interface-card {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 12px 14px;
  background: rgba(22, 33, 62, 0.35);

  h3 {
    margin: 0 0 6px;
    color: #c4a35a;
    font-size: 16px;
  }

  p {
    margin: 0;
    color: #b8b8b8;
    line-height: 1.45;
  }
}

.help-interface-keys {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 6px 14px;
  margin-top: 12px;
}

.help-interface-key {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  color: #d9d9d9;

  kbd {
    flex: none;
    min-width: 34px;
    padding: 2px 7px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-bottom-width: 2px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-family: Prototype, sans-serif;
    font-size: 13px;
    text-align: center;
  }
}
</style>
