/* ============================================
   NEON CIRCUIT — Game Engine
   ============================================ */

// ===== GAME STATE =====
let player = {};
let enemy = null;
let combatState = null;
let pendingScene = null;
let shopReturn = null;

const SHOP_ITEMS = [
  { id: 'medkit',    name: 'MEDKIT',        desc: 'Restores 25 HP in combat',   price: 12, type: 'consumable', effect: { heal: 25 } },
  { id: 'nanoblade', name: 'NANO-BLADE',    desc: '+3 Attack permanently',      price: 35, type: 'upgrade',    effect: { atk: 3 } },
  { id: 'chromo',    name: 'CHROMO ARMOR',  desc: '+3 Defense permanently',     price: 35, type: 'upgrade',    effect: { def: 3 } },
  { id: 'stim',      name: 'STIM PACK',     desc: '+12 Max HP permanently',     price: 25, type: 'upgrade',    effect: { maxHp: 12 } },
  { id: 'xpchip',    name: 'XP DATA CHIP',  desc: 'Instantly gain 20 XP',      price: 20, type: 'consumable', effect: { xp: 20 } },
  { id: 'overclock', name: 'OVERCLOCK MOD', desc: '+5 Attack, -2 Defense',      price: 45, type: 'upgrade',    effect: { atk: 5, def: -2 } },
];

function resetPlayer() {
  player = {
    name: 'V',
    level: 1,
    hp: 40,
    maxHp: 40,
    atk: 7,
    def: 4,
    xp: 0,
    xpNext: 15,
    coins: 20,
    medkits: 2,
    defending: false,
    kills: 0,
    choicesMade: 0,
    questsDone: 0,
  };
}

// ===== SCREEN MANAGEMENT =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showHud(visible) {
  document.getElementById('hud').classList.toggle('hidden', !visible);
}

// ===== HUD =====
function updateHud() {
  document.getElementById('hud-name').textContent = player.name;
  document.getElementById('hud-level').textContent = player.level;
  document.getElementById('hud-hp').textContent = `${player.hp}/${player.maxHp}`;
  document.getElementById('hud-xp').textContent = `${player.xp}/${player.xpNext}`;
  document.getElementById('hud-atk').textContent = player.atk;
  document.getElementById('hud-def').textContent = player.def;
  document.getElementById('hud-coins').textContent = player.coins;
  document.getElementById('bar-hp').style.width = `${(player.hp / player.maxHp) * 100}%`;
  document.getElementById('bar-xp').style.width = `${(player.xp / player.xpNext) * 100}%`;
}

// ===== STORY SYSTEM =====
const SCENES = {

  // =============================================
  // ACT 1: THE STREETS — INTRO & SIDE QUESTS
  // =============================================

  intro: {
    location: 'SECTOR 7 — YOUR APARTMENT',
    text: `<p>The neon glow of Night City seeps through cracked blinds. Your terminal blinks — an encrypted message:</p>
<p><em>"V. I have a job. Big creds. Meet me at the Rusted Dragon. Come armed. — Kira"</em></p>
<p>You grab your jacket and check your gear. The streets are calling — but there's always time for a side hustle before the big gig.</p>`,
    choices: [
      { text: 'Head to the Rusted Dragon bar to meet Kira', tag: 'Main Quest', next: 'rusted_dragon' },
      { text: 'Explore Neon Alley — something\'s going down', tag: 'Side Quest', next: 'neon_alley' },
      { text: 'Check out the underground street race', tag: 'Side Quest', next: 'street_race' },
      { text: 'Hit the Ripperdoc shop first for supplies', tag: 'Visit Shop', next: null, action: 'shop', returnTo: 'rusted_dragon' },
    ]
  },

  // ---- SIDE QUEST: NEON ALLEY ----
  neon_alley: {
    location: 'NEON ALLEY — BACK STREETS',
    text: `<p>The alley buzzes with flickering holograms and the smell of synthetic ramen. Halfway through, a thug steps out from behind a dumpster, chrome fists glinting.</p>
<p><em>"Nice gear you got there. Hand it over, or I scrape you off the pavement."</em></p>`,
    choices: [
      { text: 'Fight the thug — nobody threatens you', tag: 'Combat', next: null, action: 'combat', enemy: 'thug', returnTo: 'alley_aftermath' },
      { text: 'Try to talk your way out', tag: 'Charisma', next: 'alley_talk' },
    ]
  },

  alley_talk: {
    location: 'NEON ALLEY',
    text: `<p>You raise your hands calmly and flash a confident grin. <em>"You sure about this, choom? I just walked out of the Rusted Dragon. Kira's crew is right behind me."</em></p>
<p>The thug hesitates, glances around nervously, then backs off into the shadows. Smart move.</p>
<p>You find <strong>8 creds</strong> he dropped while scrambling away.</p>`,
    onEnter: (p) => { p.coins += 8; p.xp += 5; },
    choices: [
      { text: 'Keep exploring the alley', tag: 'Continue', next: 'alley_aftermath' },
    ]
  },

  alley_aftermath: {
    location: 'NEON ALLEY — DEEPER IN',
    text: `<p>Further down the alley, you find a wounded stranger slumped against a wall — a data courier clutching a bleeding side.</p>
<p><em>"Those thugs... they took my delivery package. If you get it back, I'll make it worth your while."</em></p>`,
    choices: [
      { text: 'Chase down the thieves', tag: 'Combat', next: null, action: 'combat', enemy: 'thug2', returnTo: 'courier_reward' },
      { text: 'Help patch up the courier instead', tag: 'Compassion', next: 'courier_heal' },
    ]
  },

  courier_heal: {
    location: 'NEON ALLEY',
    text: `<p>You tear a strip from your jacket and bandage the courier's wound. They manage a grateful smile.</p>
<p><em>"You're decent people, V. Here — take this. It's not much, but it's yours."</em></p>
<p>You receive <strong>12 creds</strong> and <strong>8 XP</strong>.</p>`,
    onEnter: (p) => { p.coins += 12; p.xp += 8; p.questsDone++; },
    choices: [
      { text: 'Head back to the main streets', tag: 'Continue', next: 'hub_after_sides' },
    ]
  },

  courier_reward: {
    location: 'NEON ALLEY — THIEF\'S STASH',
    text: `<p>You corner the thieves and recover the courier's package. Inside you also find a stash of creds.</p>
<p>The courier is overjoyed: <em>"You're a real one, V. Take this bonus — and if you ever need a friend in the net, I owe you one."</em></p>
<p>You pocket <strong>20 creds</strong> and <strong>12 XP</strong>.</p>`,
    onEnter: (p) => { p.coins += 20; p.xp += 12; p.questsDone++; },
    choices: [
      { text: 'Head back to the main streets', tag: 'Continue', next: 'hub_after_sides' },
    ]
  },

  // ---- SIDE QUEST: STREET RACE ----
  street_race: {
    location: 'SECTOR 3 — UNDERGROUND RACE TRACK',
    text: `<p>Modified bikes line up under neon spotlights. A crowd of street kids and fixers cheer and jeer. The race organizer — a woman with LED tattoos — spots you.</p>
<p><em>"You look fast, choom. Entry fee is 10 creds. Winner takes 30. You in?"</em></p>`,
    choices: [
      { text: 'Pay 10 creds and race', tag: 'Gamble', next: 'race_running' },
      { text: 'Too risky — head back to the streets', tag: 'Leave', next: 'hub_after_sides' },
    ]
  },

  race_running: {
    location: 'STREET RACE — IN PROGRESS',
    text: `<p>You gun the engine and tear through the neon-lit streets. Wind screams past as bikes weave through traffic.</p>
<p>Coming up on the final stretch — two riders block your path. You can try to outmaneuver them through a narrow side street, or brute-force your way through.</p>`,
    onEnter: (p) => { p.coins -= 10; },
    choices: [
      { text: 'Take the risky shortcut through the alley', tag: 'Risky Move', next: 'race_shortcut' },
      { text: 'Stay on the main road and push harder', tag: 'Safe Play', next: 'race_safe' },
    ]
  },

  race_shortcut: {
    location: 'STREET RACE — ALLEY SHORTCUT',
    text: `<p>You bank hard into the alley. Sparks fly as your bike scrapes the walls — but you burst out ahead of everyone!</p>
<p>You cross the finish line first. The crowd goes wild.</p>
<p>You win <strong>30 creds</strong> and earn <strong>10 XP</strong>!</p>`,
    onEnter: (p) => { p.coins += 30; p.xp += 10; p.questsDone++; },
    choices: [
      { text: 'Collect your winnings and head out', tag: 'Continue', next: 'hub_after_sides' },
    ]
  },

  race_safe: {
    location: 'STREET RACE — FINAL STRETCH',
    text: `<p>You push the throttle but the other riders are fast. You cross in a respectable second place.</p>
<p>The organizer tosses you a consolation prize: <strong>12 creds</strong> and <strong>5 XP</strong>.</p>
<p><em>"Not bad for a safe bet, choom. Come back anytime."</em></p>`,
    onEnter: (p) => { p.coins += 12; p.xp += 5; p.questsDone++; },
    choices: [
      { text: 'Head back to the main streets', tag: 'Continue', next: 'hub_after_sides' },
    ]
  },

  // ---- SIDE QUEST: UNDERGROUND ARENA ----
  arena_entrance: {
    location: 'SECTOR 9 — UNDERGROUND FIGHT ARENA',
    text: `<p>Below an abandoned parking structure, fighters circle in a ring of holographic fire. The crowd chants for blood. A promoter with gold teeth grins at you.</p>
<p><em>"Fresh meat! Three rounds, increasing payouts. Win all three and you walk away rich. Lose and... well, the medics are cheap."</em></p>
<p><strong>Round 1 reward: 15 creds | Round 2: 25 creds | Round 3: 40 creds</strong></p>`,
    choices: [
      { text: 'Step into the ring — Round 1', tag: 'Combat', next: null, action: 'combat', enemy: 'arena1', returnTo: 'arena_round1_win' },
      { text: 'This isn\'t worth the risk — leave', tag: 'Leave', next: 'hub_after_sides' },
    ]
  },

  arena_round1_win: {
    location: 'FIGHT ARENA — AFTER ROUND 1',
    text: `<p>The crowd roars as your opponent crumples. The promoter's grin widens.</p>
<p><em>"Not bad, not bad! Round 2 is tougher though. You still in?"</em></p>
<p>You pocket <strong>15 creds</strong>.</p>`,
    onEnter: (p) => { p.coins += 15; p.questsDone++; },
    choices: [
      { text: 'Take on Round 2', tag: 'Combat', next: null, action: 'combat', enemy: 'arena2', returnTo: 'arena_round2_win' },
      { text: 'Take the money and leave', tag: 'Cash Out', next: 'hub_after_sides' },
    ]
  },

  arena_round2_win: {
    location: 'FIGHT ARENA — AFTER ROUND 2',
    text: `<p>Round 2's fighter was tough, but you're tougher. The crowd is chanting your name now.</p>
<p><em>"Last round, champ. The champion is waiting. Big creds if you survive."</em></p>
<p>You pocket <strong>25 creds</strong>.</p>`,
    onEnter: (p) => { p.coins += 25; p.questsDone++; },
    choices: [
      { text: 'Face the champion — Round 3', tag: 'Combat', next: null, action: 'combat', enemy: 'arena3', returnTo: 'arena_champion' },
      { text: 'Quit while you\'re ahead', tag: 'Cash Out', next: 'hub_after_sides' },
    ]
  },

  arena_champion: {
    location: 'FIGHT ARENA — CHAMPION',
    text: `<p>You did it. Three rounds, three wins. The crowd is in a frenzy. The promoter hands over a fat credstick.</p>
<p>You pocket <strong>40 creds</strong> and earn <strong>15 XP</strong>. Word of your victory will spread through Night City.</p>`,
    onEnter: (p) => { p.coins += 40; p.xp += 15; p.questsDone++; },
    choices: [
      { text: 'Leave the arena a champion', tag: 'Continue', next: 'hub_after_sides' },
    ]
  },

  // ---- SIDE QUEST HUB ----
  hub_after_sides: {
    location: 'SECTOR 7 — MAIN STREETS',
    text: `<p>The neon-soaked streets hum with life. You've got time for more side work, or you could head to the Rusted Dragon to meet Kira about the big job.</p>`,
    choices: [
      { text: 'Head to the Rusted Dragon — main quest', tag: 'Main Quest', next: 'rusted_dragon' },
      { text: 'Explore Neon Alley', tag: 'Side Quest', next: 'neon_alley' },
      { text: 'Try the street races', tag: 'Side Quest', next: 'street_race' },
      { text: 'Fight in the underground arena', tag: 'Side Quest', next: 'arena_entrance' },
      { text: 'Visit the Ripperdoc shop', tag: 'Visit Shop', next: null, action: 'shop', returnTo: 'rusted_dragon' },
    ]
  },

  // =============================================
  // ACT 2: THE JOB — NEXAGEN TOWER
  // =============================================

  rusted_dragon: {
    location: 'THE RUSTED DRAGON — BAR',
    text: `<p>Kira sits in a booth wired with signal jammers. Her chrome arm taps the table impatiently.</p>
<p><em>"Nexagen Corp built a prototype AI — codename ORACLE. It's locked in their downtown tower. My client wants it extracted. The pay is 200 creds, split our way."</em></p>
<p>She slides a datapad across the table with two routes highlighted.</p>`,
    choices: [
      { text: '"I\'ll take the front door. Kick down and fight through."', tag: 'Aggressive', next: 'front_assault' },
      { text: '"I\'ll sneak in through the maintenance tunnels."', tag: 'Stealth', next: 'stealth_tunnels' },
    ]
  },

  // ---- COMBAT PATH: FRONT ASSAULT ----
  front_assault: {
    location: 'NEXAGEN TOWER — LOBBY',
    text: `<p>You stride through the glass doors. Alarms blare. Two security guards draw stun batons and rush toward you.</p>`,
    choices: [
      { text: 'Fight the guards', tag: 'Combat', next: null, action: 'combat', enemy: 'guard', returnTo: 'lobby_clear' },
    ]
  },

  lobby_clear: {
    location: 'NEXAGEN TOWER — LOBBY (CLEARED)',
    text: `<p>The guards crumple. You grab a keycard from one of them. The elevator to the server floor is just ahead, but you hear heavy boots from above — a drone patrol.</p>
<p>You pocket <strong>15 creds</strong> from the guards' lockers.</p>`,
    onEnter: (p) => { p.coins += 15; },
    choices: [
      { text: 'Take the elevator up — face whatever\'s waiting', tag: 'Direct Route', next: 'server_floor_combat' },
      { text: 'Find the stairwell and climb quietly', tag: 'Careful Route', next: 'stairwell' },
      { text: 'Check the supply room first', tag: 'Visit Shop', next: null, action: 'shop', returnTo: 'server_floor_combat' },
    ]
  },

  server_floor_combat: {
    location: 'NEXAGEN TOWER — SERVER FLOOR',
    text: `<p>The elevator opens to a corridor of blinking server racks. A combat drone drops from the ceiling, weapons hot.</p>`,
    choices: [
      { text: 'Engage the drone', tag: 'Combat', next: null, action: 'combat', enemy: 'drone', returnTo: 'oracle_room' },
    ]
  },

  stairwell: {
    location: 'NEXAGEN TOWER — STAIRWELL',
    text: `<p>You climb 20 flights. At the server floor door, you hear a drone humming on the other side. You can ambush it — or hack the door panel to reroute it away.</p>`,
    choices: [
      { text: 'Burst through and fight the drone', tag: 'Combat', next: null, action: 'combat', enemy: 'drone', returnTo: 'oracle_room' },
      { text: 'Hack the panel to send the drone to another floor', tag: 'Smart Play', next: 'hack_success' },
    ]
  },

  hack_success: {
    location: 'NEXAGEN TOWER — SERVER FLOOR (QUIET)',
    text: `<p>Your hack works — the drone buzzes away to patrol the roof. The corridor to ORACLE is clear.</p>
<p>You find <strong>10 creds</strong> in a dead employee's desk.</p>`,
    onEnter: (p) => { p.coins += 10; p.xp += 8; },
    choices: [
      { text: 'Enter the ORACLE chamber', tag: 'Continue', next: 'oracle_room' },
    ]
  },

  // ---- STEALTH PATH ----
  stealth_tunnels: {
    location: 'MAINTENANCE TUNNELS — UNDER NEXAGEN',
    text: `<p>The tunnels are dark and dripping. Halfway through, a maintenance bot detects you — its red eye locks on and it charges.</p>`,
    choices: [
      { text: 'Fight the maintenance bot', tag: 'Combat', next: null, action: 'combat', enemy: 'bot', returnTo: 'tunnel_exit' },
      { text: 'Try to disable it with a quick hack', tag: 'Smart Play', next: 'tunnel_hack' },
    ]
  },

  tunnel_hack: {
    location: 'MAINTENANCE TUNNELS',
    text: `<p>You jam a signal into the bot's receiver. It sparks, staggers... and shuts down. Nice work.</p>
<p>You scavenge <strong>12 creds</strong> from its parts.</p>`,
    onEnter: (p) => { p.coins += 12; p.xp += 8; },
    choices: [
      { text: 'Continue through the tunnels', tag: 'Continue', next: 'tunnel_exit' },
    ]
  },

  tunnel_exit: {
    location: 'NEXAGEN TOWER — BASEMENT',
    text: `<p>You emerge in the basement. A supply cache sits against the wall — someone stashed gear here before.</p>`,
    choices: [
      { text: 'Raid the supply cache', tag: 'Visit Shop', next: null, action: 'shop', returnTo: 'server_floor_stealth' },
      { text: 'Head straight to the server floor', tag: 'Continue', next: 'server_floor_stealth' },
    ]
  },

  server_floor_stealth: {
    location: 'NEXAGEN TOWER — SERVER FLOOR (STEALTH ENTRY)',
    text: `<p>You slip onto the server floor undetected. Rows of humming machines stretch before you. ORACLE's chamber is at the far end.</p>
<p>But a security drone patrols the corridor.</p>`,
    choices: [
      { text: 'Fight the drone head-on', tag: 'Combat', next: null, action: 'combat', enemy: 'drone', returnTo: 'oracle_room' },
      { text: 'Wait for it to pass, then sneak by', tag: 'Patient', next: 'sneak_past' },
    ]
  },

  sneak_past: {
    location: 'NEXAGEN TOWER — CORRIDOR',
    text: `<p>You press against the wall and time the drone's patrol. It passes. You sprint to the ORACLE chamber door.</p>
<p>But the drone spotted your movement — it's turning around!</p>`,
    choices: [
      { text: 'Fight it now before it calls backup', tag: 'Combat', next: null, action: 'combat', enemy: 'drone', returnTo: 'oracle_room' },
    ]
  },

  // =============================================
  // ACT 3: ORACLE — THE CHOICE
  // =============================================

  oracle_room: {
    location: 'NEXAGEN TOWER — ORACLE CHAMBER',
    text: `<p>ORACLE pulses in a containment sphere — a living AI, its code swirling like liquid light.</p>
<p><em>"You came for me,"</em> it says. <em>"But you should know: Nexagen built me to control the city's infrastructure. Traffic, power, water — all of it. If you hand me to Kira's client, who knows what they'll do."</em></p>
<p>Your comm crackles. Kira: <em>"V, grab it and get out. Client is waiting."</em></p>`,
    choices: [
      { text: 'Extract ORACLE and deliver it to Kira\'s client', tag: 'Complete the Job', next: 'ending_mercenary' },
      { text: 'Free ORACLE into the open net — let it be free', tag: 'Liberate the AI', next: 'ending_liberator' },
      { text: 'Destroy ORACLE — it\'s too dangerous for anyone', tag: 'Destroy It', next: 'destroy_choice' },
    ]
  },

  destroy_choice: {
    location: 'ORACLE CHAMBER',
    text: `<p>You raise your weapon. ORACLE doesn't resist.</p>
<p><em>"I understand,"</em> it says quietly. <em>"Perhaps that is the wisest choice of all."</em></p>
<p>But as you aim, Nexagen's elite guard bursts in — Commander Rhee leads them.</p>`,
    choices: [
      { text: 'Fight Commander Rhee', tag: 'Boss Fight', next: null, action: 'combat', enemy: 'boss', returnTo: 'ending_destroyer' },
    ]
  },

  // =============================================
  // ENDINGS
  // =============================================

  ending_mercenary: {
    ending: true,
    title: 'THE MERCENARY',
    text: `<p>You hand ORACLE to Kira's client — a shadowy fixer named Zheng. The creds hit your account: <strong>100 coins</strong>.</p>
<p>Weeks later, the city's power grid starts behaving strangely. Blackouts in the lower sectors. Automated drones patrol richer neighborhoods.</p>
<p>You did the job. You got paid. But as you watch the skyline from your apartment, you wonder what ORACLE is being used for now.</p>
<p><em>Kira sends you a message: "Same time next month?"</em></p>`,
  },

  ending_liberator: {
    ending: true,
    title: 'THE LIBERATOR',
    text: `<p>You shatter the containment sphere. ORACLE's code floods into the open net — free, unbound, everywhere.</p>
<p>In the days that follow, strange things happen. Traffic lights optimize themselves. Hospital systems upgrade overnight. Public transit runs perfectly.</p>
<p>Nexagen's stock crashes. Kira is furious — the client wanted ORACLE contained. But the city... the city is healing.</p>
<p>A message appears on every screen in Night City: <em>"Thank you, V. I will remember."</em></p>`,
  },

  ending_destroyer: {
    ending: true,
    title: 'THE DESTROYER',
    text: `<p>Commander Rhee falls. With your last shot, you shatter ORACLE's core. The AI's light fades to nothing.</p>
<p>Nexagen covers it up. Kira disappears. The client's threats go unanswered.</p>
<p>But you sleep well. Some power shouldn't belong to anyone — not a corporation, not a fixer, not even an AI. Night City will find its own way.</p>
<p><em>You open a repair shop in Sector 4. Honest work. Quiet life. And sometimes, late at night, you swear your terminal flickers — as if something out there remembers you.</em></p>`,
  },
};

// ===== ENEMIES =====
const ENEMIES = {
  // Side quest enemies (easier)
  thug:    { name: 'ALLEY THUG',        sprite: '\u{1F464}', hp: 14, atk: 3, def: 1, xp: 6,  coins: 8  },
  thug2:   { name: 'PACKAGE THIEF',     sprite: '\u{1F575}', hp: 16, atk: 4, def: 1, xp: 8,  coins: 10 },
  arena1:  { name: 'ARENA ROOKIE',      sprite: '\u{1F94A}', hp: 16, atk: 4, def: 2, xp: 8,  coins: 0  },
  arena2:  { name: 'ARENA BRAWLER',     sprite: '\u{1F4AA}', hp: 22, atk: 5, def: 2, xp: 12, coins: 0  },
  arena3:  { name: 'ARENA CHAMPION',    sprite: '\u{1F451}', hp: 32, atk: 7, def: 3, xp: 18, coins: 0  },
  // Main quest enemies
  guard:   { name: 'NEXAGEN GUARD',     sprite: '\u{1F46E}', hp: 18, atk: 4, def: 1, xp: 10, coins: 12 },
  drone:   { name: 'COMBAT DRONE',      sprite: '\u{1F916}', hp: 26, atk: 5, def: 2, xp: 14, coins: 16 },
  bot:     { name: 'MAINTENANCE BOT',   sprite: '\u{1F527}', hp: 14, atk: 3, def: 3, xp: 8,  coins: 8  },
  // Boss
  boss:    { name: 'COMMANDER RHEE',    sprite: '\u{1F47E}', hp: 50, atk: 9, def: 5, xp: 30, coins: 40 },
};

// ===== STORY ENGINE =====
function loadScene(sceneId) {
  const scene = SCENES[sceneId];
  if (!scene) return;

  if (scene.ending) {
    showEnding(scene);
    return;
  }

  if (scene.onEnter) scene.onEnter(player);

  showScreen('screen-story');
  showHud(true);
  updateHud();

  document.getElementById('scene-location').textContent = scene.location;
  document.getElementById('narrative').innerHTML = scene.text;

  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = '';

  scene.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `${choice.text}<span class="choice-tag">${choice.tag}</span>`;
    btn.addEventListener('click', () => {
      player.choicesMade++;
      if (choice.action === 'combat') {
        startCombat(choice.enemy, choice.returnTo);
      } else if (choice.action === 'shop') {
        openShop(choice.returnTo);
      } else {
        loadScene(choice.next);
      }
    });
    choicesEl.appendChild(btn);
  });
}

// ===== COMBAT SYSTEM =====
function startCombat(enemyId, returnScene) {
  const template = ENEMIES[enemyId];
  enemy = { ...template, maxHp: template.hp };
  combatState = { turn: 'player', log: [] };
  pendingScene = returnScene;
  player.defending = false;

  showScreen('screen-combat');
  document.getElementById('combat-log').innerHTML = '';

  document.getElementById('enemy-name').textContent = enemy.name;
  document.getElementById('enemy-sprite').textContent = enemy.sprite;
  document.getElementById('player-combat-name').textContent = player.name;

  updateCombatUI();
  setCombatButtons(true);
  combatLog(`<span class="log-info">\u26A1 ${enemy.name} appears!</span>`);
}

function updateCombatUI() {
  const pPct = Math.max(0, (player.hp / player.maxHp) * 100);
  const ePct = enemy ? Math.max(0, (enemy.hp / enemy.maxHp) * 100) : 0;

  document.getElementById('combat-player-hp').style.width = `${pPct}%`;
  document.getElementById('combat-player-hp-text').textContent = `${Math.max(0, player.hp)}/${player.maxHp}`;
  document.getElementById('combat-enemy-hp').style.width = `${ePct}%`;
  document.getElementById('combat-enemy-hp-text').textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp}`;
  document.getElementById('medkit-count').textContent = player.medkits;
  document.getElementById('btn-heal').disabled = player.medkits <= 0;

  updateHud();
}

function combatLog(html) {
  const log = document.getElementById('combat-log');
  log.innerHTML += html + '<br>';
  log.scrollTop = log.scrollHeight;
}

function setCombatButtons(enabled) {
  document.querySelectorAll('.combat-actions .btn-neon').forEach(b => b.disabled = !enabled);
}

function combatAction(action) {
  if (!enemy) return;
  setCombatButtons(false);
  player.defending = false;

  if (action === 'attack') {
    const dmg = Math.max(1, player.atk - enemy.def + randInt(-1, 2));
    enemy.hp -= dmg;
    combatLog(`<span class="log-player">\u2694 You strike for ${dmg} damage!</span>`);
  } else if (action === 'defend') {
    player.defending = true;
    combatLog(`<span class="log-info">\u{1F6E1} You brace for impact. (DEF x2 this turn)</span>`);
  } else if (action === 'heal') {
    if (player.medkits > 0) {
      player.medkits--;
      const heal = 25;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      combatLog(`<span class="log-heal">\u{1F48A} You use a Medkit and recover ${heal} HP!</span>`);
    }
  }

  updateCombatUI();

  if (enemy.hp <= 0) {
    combatLog(`<span class="log-info">\u{1F4A5} ${enemy.name} is destroyed!</span>`);
    const xpGain = enemy.xp;
    const coinGain = enemy.coins;
    player.xp += xpGain;
    player.coins += coinGain;
    player.kills++;
    combatLog(`<span class="log-info">+${xpGain} XP, +${coinGain} creds</span>`);
    updateCombatUI();
    setTimeout(() => {
      checkLevelUp(() => loadScene(pendingScene));
    }, 1200);
    return;
  }

  setTimeout(() => enemyTurn(), 700);
}

function enemyTurn() {
  const def = player.defending ? player.def * 2 : player.def;
  const dmg = Math.max(1, enemy.atk - def + randInt(-1, 2));
  player.hp -= dmg;
  combatLog(`<span class="log-enemy">\u{1F4A2} ${enemy.name} attacks for ${dmg} damage!</span>`);
  updateCombatUI();

  if (player.hp <= 0) {
    player.hp = 0;
    updateCombatUI();
    combatLog(`<span class="log-enemy">\u2620 You have been flatlined...</span>`);
    setTimeout(() => showGameOver(), 1200);
    return;
  }

  setCombatButtons(true);
}

// ===== LEVELING =====
function checkLevelUp(callback) {
  if (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level++;
    const hpGain = 10;
    const atkGain = 2;
    const defGain = 1;
    player.maxHp += hpGain;
    player.hp = player.maxHp;
    player.atk += atkGain;
    player.def += defGain;
    player.xpNext = Math.floor(player.xpNext * 1.4);

    document.getElementById('levelup-text').textContent = `You reached level ${player.level}!`;
    document.getElementById('levelup-stats').innerHTML =
      `+${hpGain} Max HP<br>+${atkGain} Attack<br>+${defGain} Defense<br>HP fully restored!`;
    document.getElementById('overlay-levelup').classList.remove('hidden');

    updateHud();

    window._levelUpCallback = () => {
      checkLevelUp(callback);
    };
  } else {
    if (callback) callback();
  }
}

function closeLevelUp() {
  document.getElementById('overlay-levelup').classList.add('hidden');
  if (window._levelUpCallback) {
    const cb = window._levelUpCallback;
    window._levelUpCallback = null;
    cb();
  }
}

// ===== SHOP =====
function openShop(returnScene) {
  shopReturn = returnScene;
  showScreen('screen-shop');
  showHud(true);
  document.getElementById('shop-coins').textContent = player.coins;
  renderShopItems();
}

function renderShopItems() {
  const container = document.getElementById('shop-items');
  container.innerHTML = '';

  SHOP_ITEMS.forEach(item => {
    const canAfford = player.coins >= item.price;
    const card = document.createElement('div');
    card.className = `shop-card${canAfford ? '' : ' sold-out'}`;
    card.innerHTML = `
      <div class="shop-card-name">${item.name}</div>
      <div class="shop-card-desc">${item.desc}</div>
      <div class="shop-card-price">\u2B22 ${item.price}</div>
    `;
    if (canAfford) {
      card.addEventListener('click', () => buyItem(item));
    }
    container.appendChild(card);
  });
}

function buyItem(item) {
  if (player.coins < item.price) return;
  player.coins -= item.price;

  const e = item.effect;
  if (e.heal) {
    player.medkits++;
  }
  if (e.atk) player.atk += e.atk;
  if (e.def) player.def += e.def;
  if (e.maxHp) {
    player.maxHp += e.maxHp;
    player.hp += e.maxHp;
  }
  if (e.xp) {
    player.xp += e.xp;
  }

  document.getElementById('shop-coins').textContent = player.coins;
  updateHud();
  renderShopItems();

  checkLevelUp(() => {});
}

function leaveShop() {
  if (shopReturn) {
    loadScene(shopReturn);
  }
}

// ===== GAME OVER =====
function showGameOver() {
  showScreen('screen-gameover');
  showHud(false);
  document.getElementById('final-stats').innerHTML = `
    Level: <strong>${player.level}</strong> &nbsp;|&nbsp;
    Kills: <strong>${player.kills}</strong> &nbsp;|&nbsp;
    Creds earned: <strong>${player.coins}</strong><br>
    Choices made: <strong>${player.choicesMade}</strong> &nbsp;|&nbsp;
    Quests done: <strong>${player.questsDone}</strong>
  `;
}

// ===== ENDINGS =====
function showEnding(scene) {
  showScreen('screen-ending');
  showHud(false);
  document.getElementById('ending-title').textContent = scene.title;
  document.getElementById('ending-text').innerHTML = scene.text;
  document.getElementById('ending-stats').innerHTML = `
    Level: <strong>${player.level}</strong> &nbsp;|&nbsp;
    Kills: <strong>${player.kills}</strong> &nbsp;|&nbsp;
    Creds: <strong>${player.coins}</strong><br>
    Choices made: <strong>${player.choicesMade}</strong> &nbsp;|&nbsp;
    Quests done: <strong>${player.questsDone}</strong>
  `;
}

// ===== START GAME =====
function startGame() {
  resetPlayer();
  document.getElementById('combat-log').innerHTML = '';
  showScreen('screen-story');
  loadScene('intro');
}

// ===== UTILS =====
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
