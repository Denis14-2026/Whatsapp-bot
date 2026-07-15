const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const pidFile = path.join(__dirname, '.bot.pid');

const startDate = new Date('2026-06-24T00:00:00');
const groupId = '58145535742158@lid';

// AI integration removed — Cupidon will use only built-in message pools.
// Riddle timeout, max wrong answers, and test mode all now live in
// /cupidon-settings.json (see the SETTINGS section below) instead of
// being hardcoded here, so they can be changed with "cupidon setari".

const botSentIds = new Set();
let startupAnnounced = false;
let shutdownAnnounced = false;

// ============================================================
// VISUAL THEME
// ------------------------------------------------------------
// Every outgoing message is wrapped in a small "card": an optional
// category kicker (a spaced-out label like "✦ L O V E ✦"), a bold
// icon + title header, a rule, the message body, another rule, and a
// tiny signature footer. Every command/game gets its own icon, title
// and category so the bot no longer shows the same generic wrapper
// for everything — dice rolls look like dice rolls, hangman looks
// like hangman, etc.
// ============================================================

const RULE = '━'.repeat(20);
const FOOTER = '🏹 Cupidon';

const styleMap = {
    general:        { icon: '💖', title: 'Cupidon' },
    help:           { icon: '📖', title: 'Ghid' },
    settings:       { icon: '⚙️', title: 'Setări', category: 'S I S T E M' },

    // LOVE
    riddle:         { icon: '🧠', title: 'Ghicitoare', category: 'G H I C I T O A R E' },
    romantic:       { icon: '💘', title: 'Mesaj Romantic', category: 'L O V E' },
    rizz:           { icon: '🔥', title: 'Rizz', category: 'L O V E' },
    compliment:     { icon: '✨', title: 'Compliment', category: 'L O V E' },
    flirt:          { icon: '🌹', title: 'Flirt', category: 'L O V E' },
    pickup:         { icon: '💫', title: 'Pickup Line', category: 'L O V E' },
    lovequote:      { icon: '📜', title: 'Love Quote', category: 'L O V E' },
    reasons:        { icon: '💡', title: 'Motive', category: 'L O V E' },
    promise:        { icon: '🤝', title: 'Promisiune', category: 'L O V E' },
    missyou:        { icon: '🌙', title: 'Mi-e Dor', category: 'L O V E' },
    goodmorning:    { icon: '🌞', title: 'Bună Dimineața', category: 'L O V E' },
    goodnight:      { icon: '🌙', title: 'Noapte Bună', category: 'L O V E' },
    imagine:        { icon: '💭', title: 'Imaginează-ți', category: 'L O V E' },
    amintiri:       { icon: '📸', title: 'Amintiri', category: 'R E L A Ț I E' },

    // ACȚIUNI
    hugmessage:     { icon: '🤗', title: 'Îmbrățișare', category: 'A C Ț I U N I' },
    kissmessage:    { icon: '💋', title: 'Sărut', category: 'A C Ț I U N I' },
    kiss:           { icon: '💋', title: 'Sărut', category: 'A C Ț I U N I' },
    hug:            { icon: '🤗', title: 'Îmbrățișare', category: 'A C Ț I U N I' },
    cuddle:         { icon: '🥰', title: 'Îmbrățișare Caldă', category: 'A C Ț I U N I' },
    foreheadkiss:   { icon: '💫', title: 'Sărut pe Frunte', category: 'A C Ț I U N I' },
    cheekkiss:      { icon: '😊', title: 'Sărut pe Obraz', category: 'A C Ț I U N I' },
    handkiss:       { icon: '💍', title: 'Sărut pe Mână', category: 'A C Ț I U N I' },
    dance:          { icon: '💃', title: 'Dans', category: 'A C Ț I U N I' },
    massage:        { icon: '🪷', title: 'Masaj', category: 'A C Ț I U N I' },
    holdhands:      { icon: '🤝', title: 'Ținut de Mână', category: 'A C Ț I U N I' },
    surprise:       { icon: '🎁', title: 'Surpriză', category: 'A C Ț I U N I' },

    // JOC DE CUPLU
    truth:          { icon: '🧠', title: 'Adevăr', category: 'C U P L U' },
    dare:           { icon: '🔥', title: 'Provocare', category: 'C U P L U' },
    challenge:      { icon: '🎯', title: 'Challenge', category: 'C U P L U' },
    wouldyourather: { icon: '🤔', title: 'Ai Alege', category: 'C U P L U' },
    thisorthat:     { icon: '⚖️', title: 'Asta sau Aia', category: 'C U P L U' },
    emoji:          { icon: '😀', title: 'Emoji', category: 'C U P L U' },
    guess:          { icon: '🎲', title: 'Ghicește', category: 'C U P L U' },
    spin:           { icon: '🎡', title: 'Rotiți', category: 'C U P L U' },
    question:       { icon: '❓', title: 'Întrebare', category: 'C U P L U' },

    // SPECIAL
    dedicatie:      { icon: '💌', title: 'Dedicație', category: 'S P E C I A L' },
    poezie:         { icon: '📜', title: 'Poezie', category: 'S P E C I A L' },

    // FUN
    date:           { icon: '🍽️', title: 'Idee de Date', category: 'F U N' },
    gift:           { icon: '🎁', title: 'Idee de Cadou', category: 'F U N' },
    bucketlist:     { icon: '📝', title: 'Bucket List', category: 'F U N' },
    punish:         { icon: '😈', title: 'Pedeapsă', category: 'F U N' },
    reward:         { icon: '🏆', title: 'Recompensă', category: 'F U N' },
    website:        { icon: '🌐', title: 'Website', category: 'F U N' },
    spotify:        { icon: '🎵', title: 'Spotify', category: 'F U N' },

    // RELAȚIE
    relationship:   { icon: '💕', title: 'Relație', category: 'R E L A Ț I E' },
    lovemeter:      { icon: '💘', title: 'Love Meter', category: 'R E L A Ț I E' },
    compatibility:  { icon: '💞', title: 'Compatibilitate', category: 'R E L A Ț I E' },
    memory:         { icon: '📸', title: 'Amintire', category: 'R E L A Ț I E' },
    firstdate:      { icon: '🌅', title: 'Prima Întâlnire', category: 'R E L A Ț I E' },
    anniversary:    { icon: '🎂', title: 'Aniversare', category: 'R E L A Ț I E' },
    countdown:      { icon: '⏳', title: 'Countdown', category: 'R E L A Ț I E' },
    milestone:      { icon: '🎉', title: 'Repere', category: 'R E L A Ț I E' },

    // GAME
    diceGame:       { icon: '🎲', title: 'Zaruri', category: 'G A M E' },
    coinGame:       { icon: '🪙', title: 'Cap sau Pajură', category: 'G A M E' },
    eightball:      { icon: '🔮', title: 'Magic 8 Ball', category: 'G A M E' },
    slotGame:       { icon: '🎰', title: 'Slot Machine', category: 'G A M E' },
    hangman:        { icon: '🎯', title: 'Spânzurătoarea', category: 'G A M E' },
    anagram:        { icon: '🧩', title: 'Anagramă', category: 'G A M E' },
    emojiquiz:      { icon: '🧠', title: 'Emoji Quiz', category: 'G A M E' },
    mathquiz:       { icon: '🧮', title: 'Math Quiz', category: 'G A M E' },
    colorguess:     { icon: '🎨', title: 'Ghicește Culoarea', category: 'G A M E' },
    trivia:         { icon: '🧠', title: 'Trivia', category: 'G A M E' },
    animalguess:    { icon: '🐾', title: 'Ghicește Animalul', category: 'G A M E' },
    numberguess:    { icon: '🔢', title: 'Ghicește Numărul', category: 'G A M E' },
    scramble:       { icon: '🧩', title: 'Cuvânt Amestecat', category: 'G A M E' },
    tictactoe:      { icon: '🎮', title: 'TicTacToe', category: 'G A M E' },
    rps:            { icon: '🪨', title: 'Piatră, Foarfecă, Hârtie', category: 'G A M E' },
    quiz:           { icon: '🧠', title: 'Quiz Cuplu', category: 'G A M E' },
    game100:        { icon: '🔢', title: '100', category: 'G A M E' }
};

// Unicode "bold sans" lookalikes for plain ASCII letters/digits — gives
// titles a distinct, poster-like look without relying on WhatsApp's own
// *bold* markdown (which some clients render inconsistently in headers).
// Romanian diacritics (ă â î ș ț) have no bold equivalent in this block,
// so they're left as-is, which still reads fine mixed in.
const BOLD_MAP = {
    a:'𝗮', b:'𝗯', c:'𝗰', d:'𝗱', e:'𝗲', f:'𝗳', g:'𝗴', h:'𝗵', i:'𝗶', j:'𝗷',
    k:'𝗸', l:'𝗹', m:'𝗺', n:'𝗻', o:'𝗼', p:'𝗽', q:'𝗾', r:'𝗿', s:'𝘀', t:'𝘁',
    u:'𝘂', v:'𝘃', w:'𝘄', x:'𝘅', y:'𝘆', z:'𝘇',
    A:'𝗔', B:'𝗕', C:'𝗖', D:'𝗗', E:'𝗘', F:'𝗙', G:'𝗚', H:'𝗛', I:'𝗜', J:'𝗝',
    K:'𝗞', L:'𝗟', M:'𝗠', N:'𝗡', O:'𝗢', P:'𝗣', Q:'𝗤', R:'𝗥', S:'𝗦', T:'𝗧',
    U:'𝗨', V:'𝗩', W:'𝗪', X:'𝗫', Y:'𝗬', Z:'𝗭',
    '0':'𝟬', '1':'𝟭', '2':'𝟮', '3':'𝟯', '4':'𝟰', '5':'𝟱', '6':'𝟲', '7':'𝟳', '8':'𝟴', '9':'𝟵'
};

function toBoldUnicode(str) {
    return String(str).split('').map(ch => BOLD_MAP[ch] || ch).join('');
}

// ============================================================
// VISUAL CARD (v2)
// ------------------------------------------------------------
// ✦──────────────────✦
//    ✧ C A T E G O R Y ✧
//    🧠  𝗧𝗶𝘁𝗹𝘂
// ✦──────────────────✦
//
// body
//
// 🏹 Cupidon · cupidon help
// ============================================================

function decorateMessage(body, type = 'general') {
    const style = styleMap[type] || styleMap.general;
    const cleanBody = String(body).replace(/\n{3,}/g, '\n\n').trim();
    const edge = '✦' + RULE + '✦';

    const lines = [];
    lines.push(edge);
    if (style.category) lines.push(`   ✧ ${style.category} ✧`);
    lines.push(`   ${style.icon}  ${toBoldUnicode(style.title)}`);
    lines.push(edge);
    lines.push('');
    lines.push(cleanBody);
    lines.push('');
    lines.push(`${FOOTER} · cupidon help`);

    return lines.join('\n');
}

// Small "progress bar" made of hearts — used anywhere we show remaining
// attempts/lives (riddles, hangman, number guessing, scramble) instead
// of a bare "2/3" counter.
function livesBar(remaining, max) {
    const safeRemaining = Math.max(0, Math.min(remaining, max));
    return '❤️'.repeat(safeRemaining) + '🤍'.repeat(max - safeRemaining);
}

const messagePool = [
{ type: 'riddle', text: '🧠 Ghicitoare #0\nCe are gura dar nu vorbeste si curge mereu?', answer: 'Rau' },
{ type: 'riddle', text: '🧠 Ghicitoare #1\nCe creste cu cat iei mai mult din el?', answer: 'Gaura' },
{ type: 'riddle', text: '🧠 Ghicitoare #2\nCe poate tine apa dar are gauri?', answer: 'Burete' },
{ type: 'riddle', text: '🧠 Ghicitoare #3\nCe merge pe 4 picioare, apoi pe 2 si apoi pe 3?', answer: 'Om' },
{ type: 'riddle', text: '🧠 Ghicitoare #4\nCe are cap dar nu gandeste?', answer: 'Ac' },
{ type: 'riddle', text: '🧠 Ghicitoare #5\nCe straluceste noaptea dar nu arde?', answer: 'Luna' },
{ type: 'riddle', text: '🧠 Ghicitoare #6\nCe are chei dar nu deschide usi?', answer: 'Pian' },
{ type: 'riddle', text: '🧠 Ghicitoare #7\nCe alearga fara picioare?', answer: 'Vant' },
{ type: 'riddle', text: '🧠 Ghicitoare #8\nCe dispare cand il aprinzi?', answer: 'Intuneric' },
{ type: 'riddle', text: '🧠 Ghicitoare #9\nCe cade dar nu se loveste?', answer: 'Ploaie' },
{ type: 'riddle', text: '🧠 Ghicitoare #10\nCe are ochi dar nu vede?', answer: 'Cartof' },
{ type: 'riddle', text: '🧠 Ghicitoare #11\nCe are un gât dar nu cap?', answer: 'Sticla' },
{ type: 'riddle', text: '🧠 Ghicitoare #12\nCe poate zbura dar nu are aripi?', answer: 'Timp' },
{ type: 'riddle', text: '🧠 Ghicitoare #13\nCe poate vorbi fara gura?', answer: 'Ecou' },
{ type: 'riddle', text: '🧠 Ghicitoare #14\nCe se rupe cand il spui?', answer: 'Tacere' },
{ type: 'riddle', text: '🧠 Ghicitoare #15\nCe este peste tot dar nu il vezi?', answer: 'Aer' },
{ type: 'riddle', text: '🧠 Ghicitoare #16\nCe are multe pagini dar nu traieste?', answer: 'Carte' },
{ type: 'riddle', text: '🧠 Ghicitoare #17\nCe are o fata dar nu zambeste?', answer: 'Ceas' },
{ type: 'riddle', text: '🧠 Ghicitoare #18\nCe merge dar nu pleaca?', answer: 'Ceas' },
{ type: 'riddle', text: '🧠 Ghicitoare #19\nCe creste cand il imparti?', answer: 'Dragoste' },
{ type: 'riddle', text: '🧠 Ghicitoare #20\nCe are ramuri dar nu frunze?', answer: 'Banca' },
{ type: 'riddle', text: '🧠 Ghicitoare #21\nCe are dinți dar nu musca?', answer: 'Pieptene' },
{ type: 'riddle', text: '🧠 Ghicitoare #22\nCe poate fi spart fara sa il atingi?', answer: 'Promisiune' },
{ type: 'riddle', text: '🧠 Ghicitoare #23\nCe este mereu in fata ta dar nu il prinzi?', answer: 'Viitor' },
{ type: 'riddle', text: '🧠 Ghicitoare #24\nCe se intoarce mereu dar nu pleaca?', answer: 'Ecou' },
{ type: 'riddle', text: '🧠 Ghicitoare #25\nCe are multe chei dar nu deschide nimic?', answer: 'Tastatura' },
{ type: 'riddle', text: '🧠 Ghicitoare #26\nCe este mic dar poate face umbra mare?', answer: 'Om' },
{ type: 'riddle', text: '🧠 Ghicitoare #27\nCe are ochi dar nu vede lumina?', answer: 'Cartof' },
{ type: 'riddle', text: '🧠 Ghicitoare #28\nCe poate alerga dar nu se misca?', answer: 'Rau' },
{ type: 'riddle', text: '🧠 Ghicitoare #29\nCe are aripi dar nu zboara?', answer: 'Avion hartie' },
{ type: 'riddle', text: '🧠 Ghicitoare #30\nCe creste fara sa fie plantat?', answer: 'Par' },
{ type: 'riddle', text: '🧠 Ghicitoare #31\nCe are multe culori dar nu traieste?', answer: 'Curcubeu' },
{ type: 'riddle', text: '🧠 Ghicitoare #32\nCe dispare cand apare lumina?', answer: 'Umbra' },
{ type: 'riddle', text: '🧠 Ghicitoare #33\nCe nu are forma dar umple tot?', answer: 'Gand' },
{ type: 'riddle', text: '🧠 Ghicitoare #34\nCe poate fi auzit dar nu vazut?', answer: 'Voce' },
{ type: 'riddle', text: '🧠 Ghicitoare #35\nCe merge in sus dar nu se misca?', answer: 'Temperatura' },
{ type: 'riddle', text: '🧠 Ghicitoare #36\nCe este mic dar valoreaza mult?', answer: 'Timp' },
{ type: 'riddle', text: '🧠 Ghicitoare #37\nCe are un ochi dar nu vede?', answer: 'Ac' },
{ type: 'riddle', text: '🧠 Ghicitoare #38\nCe este mereu in miscare dar ramane pe loc?', answer: 'Ceas' },
{ type: 'riddle', text: '🧠 Ghicitoare #39\nCe are coada dar nu este animal?', answer: 'Moneda' },
{ type: 'riddle', text: '🧠 Ghicitoare #40\nCe poate fi citit dar nu vorbeste?', answer: 'Scrisoare' },
{ type: 'riddle', text: '🧠 Ghicitoare #41\nCe are maini dar nu poate atinge?', answer: 'Ceas' },
{ type: 'riddle', text: '🧠 Ghicitoare #42\nCe este greu dar poate pluti?', answer: 'Lemne' },
{ type: 'riddle', text: '🧠 Ghicitoare #43\nCe este invizibil dar il simti mereu?', answer: 'Vant' },
{ type: 'riddle', text: '🧠 Ghicitoare #44\nCe poate fi auzit dar nu atins?', answer: 'Sunet' },
{ type: 'riddle', text: '🧠 Ghicitoare #45\nCe se aprinde dar nu arde?', answer: 'Bec' },
{ type: 'riddle', text: '🧠 Ghicitoare #46\nCe este mereu cu tine dar nu il vezi?', answer: 'Suflet' },
{ type: 'riddle', text: '🧠 Ghicitoare #47\nCe poate fi scris dar nu citit?', answer: 'Cod' },
{ type: 'riddle', text: '🧠 Ghicitoare #48\nCe se sparge fara sunet?', answer: 'Inima' },
{ type: 'riddle', text: '🧠 Ghicitoare #49\nCe este peste tot dar nu poate fi prins?', answer: 'Aer' },
{ type: 'riddle', text: '🧠 Ghicitoare #50\nCe se misca fara sa plece niciodata din loc?', answer: 'Ceas' },
{ type: 'riddle', text: '🧠 Ghicitoare #51\nCe are patru roți dar nu se mișcă singur?', answer: 'Carucior' },
{ type: 'riddle', text: '🧠 Ghicitoare #52\nCe poți sparge fără să îl atingi vreodată?', answer: 'Tacere' },
{ type: 'riddle', text: '🧠 Ghicitoare #53\nCe are inimă dar nu bate?', answer: 'Artichoke' },
{ type: 'riddle', text: '🧠 Ghicitoare #54\nCe intra uscat si iese ud?', answer: 'Buretele' },
{ type: 'riddle', text: '🧠 Ghicitoare #55\nCe are un pat dar nu doarme niciodata?', answer: 'Raul' },
{ type: 'riddle', text: '🧠 Ghicitoare #56\nCine face zgomot dar nu are gura?', answer: 'Tunetul' },
{ type: 'riddle', text: '🧠 Ghicitoare #57\nCe poți ține în mâna stângă dar nu în cea dreaptă?', answer: 'Mana dreapta' },
{ type: 'riddle', text: '🧠 Ghicitoare #58\nCe are un inel dar nu are deget?', answer: 'Telefonul' },
{ type: 'riddle', text: '🧠 Ghicitoare #59\nCe devine ud in timp ce se usuca?', answer: 'Prosopul' },
{ type: 'riddle', text: '🧠 Ghicitoare #60\nCe poate calatori in jurul lumii ramanand intr-un colt?', answer: 'Timbrul' },
];

function buildRichContentPool(templates, count, wordBank = []) {
    // Return a lightweight proxy that behaves like an array with a numeric length
    // but generates entries on demand instead of allocating `count` strings.
    const handler = {
        get(target, prop) {
            if (prop === 'length') return count;
            const idx = Number(prop);
            if (!Number.isNaN(idx) && idx >= 0 && idx < count) {
                const i = idx;
                const template = templates[i % templates.length];
                const word = wordBank[(i + 1) % wordBank.length] || 'iubire';
                return template.replace('{i}', i + 1).replace('{word}', word);
            }
            return target[prop];
        }
    };
    return new Proxy({}, handler);
}

const contentLibrary = {
    romantic: buildRichContentPool([
        '❤️ {i}. {word} devine mai frumoasă când este spusă cu suflet și cu dragoste.',
        '🌙 {i}. În fiecare {word} găsesc un motiv nou să te aleg iar și iar.',
        '💖 {i}. Tu ești {word} care transformă fiecare zi într-un prilej de fericire.',
        '🌹 {i}. Când mă gândesc la {word}, totul în jur devine mai cald și mai clar.'
    ], 999999, ['dragoste', 'tandrețe', 'fericire', 'lumină', 'zâmbet', 'suflet', 'acasă', 'vis']),
    rizz: buildRichContentPool([
        '😏 {i}. {word} te face să zâmbești mai mult decât îți dai seama.',
        '🔥 {i}. Știu că {word} are ceva special în fiecare clipă în care te apropii.',
        '💘 {i}. Dacă {word} ar fi o artă, tu ai fi capodopera mea.',
        '✨ {i}. {word} are puterea de a schimba complet atmosfera dintr-o zi.'
    ], 999999, ['privirea', 'zâmbetul', 'energia', 'prezența', 'vocea', 'grația', 'caldura', 'chemarea']),
    compliment: buildRichContentPool([
        '💝 {i}. {word} este un dar rar și frumos pe care îl simți imediat.',
        '🌷 {i}. Ai o {word} care luminează tot ce atingi și tot ce atinge.',
        '☀️ {i}. Ceea ce admir la tine este {word} și sinceritatea ta.',
        '💎 {i}. {word} ta are o frumusețe profundă, calmă și adevărată.'
    ], 999999, ['blândețe', 'eleganță', 'caldură', 'sinceritate', 'grație', 'lumină', 'bunețe', 'fericire']),
    flirt: buildRichContentPool([
        '💬 {i}. {word} mă face să vreau să rămân mai mult în prezența ta.',
        '🌹 {i}. Se spune că {word} vorbește singură, iar tu o faci cu adevărat.',
        '😌 {i}. Când apare {word}, totul pare mai simplu și mai frumos.',
        '💫 {i}. {word} ta are o putere pe care niciun cuvânt nu o poate descrie.'
    ], 999999, ['tandrețea', 'zâmbetul', 'privirea', 'chemarea', 'vocea', 'atinsoarea', 'energia', 'cumințenia']),
    pickup: buildRichContentPool([
        '🫶 {i}. {word} te face să pari mai specială decât orice aș fi imaginat.',
        '🌈 {i}. Dacă {word} ar fi o melodie, aș pune-o pe repeat în fiecare zi.',
        '💌 {i}. Tu ai {word} care transformă simplul în memorabil.',
        '⭐ {i}. Când te văd, {word} se întâmplă fără să mă gândesc de două ori.'
    ], 999999, ['prezența', 'energia', 'grația', 'blândețea', 'liniștea', 'farmecul', 'sinceritatea', 'căldura']),
    lovequote: buildRichContentPool([
        '📜 {i}. „{word} este cel mai frumos mod de a rămâne aproape de suflet.”',
        '📜 {i}. „Când {word} este sinceră, fiecare zi are un sens mai profund.”',
        '📜 {i}. „{word} nu se descrie, ci se simte în fiecare respirație.”',
        '📜 {i}. „O {word} adevărată face din fiecare clipă un motiv de bucurie.”'
    ], 999999, ['dragostea', 'iubirea', 'căldura', 'sinceritatea', 'povestea', 'tandrețea', 'fericirea', 'liniștea']),
    reasons: buildRichContentPool([
        '💡 {i}. Te iubesc pentru că {word} îți dă un farmec aparte.',
        '💡 {i}. Te iubesc pentru că {word} mă face să mă simt în siguranță.',
        '💡 {i}. Te iubesc pentru că {word} te face să fii atât de frumoasă și de reală.',
        '💡 {i}. Te iubesc pentru că {word} schimbă fiecare zi în ceva mai bun.'
    ], 999999, ['blândețea', 'zâmbetul', 'caldura', 'sinceritatea', 'prezența', 'liniștea', 'grația', 'puterea']),
    promise: buildRichContentPool([
        '🤝 {i}. Promit să te iubesc cu {word} și cu aceeași căldură în fiecare zi.',
        '🤝 {i}. Promit să fiu lângă tine când ai nevoie de {word} și de sprijin.',
        '🤝 {i}. Promit să păstrez în suflet {word} și tot ce este frumos între noi.',
        '🤝 {i}. Promit să te aleg cu {word} și să te respect în fiecare moment.'
    ], 999999, ['atenție', 'dragoste', 'liniște', 'respect', 'tandrețe', 'încredere', 'patos', 'căldură']),
    missyou: buildRichContentPool([
        '💔 {i}. Îmi lipsești mai mult decât pot spune cu {word}.',
        '🌙 {i}. Fiecare noapte e mai lungă când nu ești lângă mine și-mi lipsești cu {word}.',
        '💭 {i}. Te gândesc în fiecare moment și mi-e dor de tine cu {word}.',
        '🫶 {i}. Mă uit după tine în fiecare gând și în fiecare respirație, cu {word}.'
    ], 999999, ['cuvinte', 'dragoste', 'durere', 'fervoare', 'tandrețe', 'liniște', 'sinceritate', 'căldură']),
    goodmorning: buildRichContentPool([
        '🌞 {i}. Bună dimineața, iubirea mea! {word} te însoțește în fiecare nou început.',
        '🌅 {i}. Îți doresc o dimineață caldă, plină de {word} și de zâmbete.',
        '☀️ {i}. Să înceapă ziua ta cu {word}, liniște și o rază de speranță.',
        '🌼 {i}. Gândul meu de dimineață este la tine și la {word} pe care o aduci lumii.'
    ], 999999, ['lumină', 'pace', 'fericire', 'căldură', 'voie bună', 'optimism', 'dragoste', 'energie']),
    goodnight: buildRichContentPool([
        '🌙 {i}. Noapte bună, iubirea mea. {word} te învelește în liniște și în vise frumoase.',
        '✨ {i}. Să visezi la lucruri frumoase și să te odihnești în {word}.',
        '🌌 {i}. Închide ochii și lasă-ți inima să se odihnească în {word}.',
        '🕯️ {i}. O noapte liniștită și plină de {word} pentru tine.'
    ], 999999, ['pace', 'căldură', 'liniște', 'dragoste', 'fericire', 'seninătate', 'tandrețe', 'vis']),
    hugmessage: buildRichContentPool([
        '🤗 {i}. Ți-aș da o îmbrățișare caldă și lungă, plină de {word}.',
        '🫶 {i}. O îmbrățișare pentru sufletul tău, caldă și plină de {word}.',
        '💛 {i}. Îți trimit o îmbrățișare virtuală, plină de {word} și de liniște.',
        '🌼 {i}. O îmbrățișare delicată și adevărată, făcută din {word}.'
    ], 999999, ['dragoste', 'căldură', 'liniște', 'tandrețe', 'siguranță', 'pace', 'zâmbet', 'fericire']),
    kissmessage: buildRichContentPool([
        '💋 {i}. Îți las un sărut dulce și un gând cald, plin de {word}.',
        '😘 {i}. Un sărut mic, dar plin de {word} și de tandrețe.',
        '💘 {i}. Un sărut pentru sufletul tău și pentru {word} pe care o aduci lumii.',
        '🌸 {i}. Un sărut blând, ușor și plin de {word}.'
    ], 999999, ['dragoste', 'căldură', 'liniște', 'fericire', 'tandrețe', 'grație', 'zâmbet', 'pace']),
    kiss: buildRichContentPool([
        '💋 {i}. Îți las un sărut pe frunte și îți spun că ești {word}.',
        '💋 {i}. Un sărut dulce pentru inima ta și pentru {word} ta.',
        '💋 {i}. Sărutul meu este cald, tandru și plin de {word}.',
        '💋 {i}. Un sărut ușor, cu suflet, făcut din {word}.'
    ], 999999, ['specială', 'frumusețe', 'dragoste', 'liniște', 'tandrețe', 'fericire', 'căldură', 'grație']),
    hug: buildRichContentPool([
        '🤗 {i}. Îți ofer o îmbrățișare caldă și plină de {word}.',
        '🫶 {i}. O îmbrățișare dragă, tandră și fără sfârșit, făcută din {word}.',
        '💛 {i}. Îți dau o îmbrățișare care spune tot ce simt, în {word}.',
        '🌼 {i}. O îmbrățișare liniștită, blândă și plină de {word}.'
    ], 999999, ['liniște', 'dragoste', 'căldură', 'tandrețe', 'siguranță', 'pace', 'zâmbet', 'fericire']),
    cuddle: buildRichContentPool([
        '🥰 {i}. Aș sta lipit de tine și aș face din fiecare moment unul special, plin de {word}.',
        '🫶 {i}. O îmbrățișare de suflet, caldă și plină de {word}.',
        '💖 {i}. Căldura mea e pentru tine, în fiecare clipă, cu {word}.',
        '🌙 {i}. Un moment liniștit, tandru și plin de {word} pentru noi.'
    ], 999999, ['dragoste', 'căldură', 'liniște', 'tandrețe', 'pace', 'fericire', 'siguranță', 'blândețe']),
    foreheadkiss: buildRichContentPool([
        '💫 {i}. Îți las un sărut pe frunte, pentru că meriți {word} și dragoste.',
        '🌙 {i}. Un sărut pe frunte, ușor și plin de {word}.',
        '✨ {i}. Sărutul meu pe frunte este doar pentru tine, cu {word}.',
        '☁️ {i}. Un gest blând și cald, făcut din {word}.'
    ], 999999, ['liniște', 'tandrețe', 'dragoste', 'pace', 'siguranță', 'căldură', 'fericire', 'grație']),
    cheekkiss: buildRichContentPool([
        '💋 {i}. Un sărut pe obraz, dulce și plin de {word}.',
        '😘 {i}. Un sărut pe obraz, spre a-ți aduce {word} și zâmbetul înapoi.',
        '💖 {i}. Sărutul meu pe obraz spune mai mult decât cuvintele, în {word}.',
        '🌸 {i}. Un sărut blând pe obraz, făcut din {word}.'
    ], 999999, ['dragoste', 'căldură', 'liniște', 'tandrețe', 'fericire', 'pace', 'grație', 'blândețe']),
    handkiss: buildRichContentPool([
        '💍 {i}. Îți sărut mâna cu respect, tandrețe și {word}.',
        '💐 {i}. O atingere blândă și un sărut de respect făcut din {word}.',
        '🌷 {i}. Îți păstrez în suflet acest sărut de mână și de {word}.',
        '✨ {i}. Un gest elegant și cald, plin de {word}.'
    ], 999999, ['dragoste', 'respect', 'tandrețe', 'grație', 'liniște', 'căldură', 'blândețe', 'devotament']),
    dance: buildRichContentPool([
        '💃 {i}. Hai să dansăm prin fiecare amintire și să facem din fiecare secundă o {word}.',
        '🎶 {i}. O dansare lentă, plină de {word} și de iubire.',
        '🌙 {i}. Dansul nostru ar trebui să fie doar o {word} lungă și frumoasă.',
        '✨ {i}. Fiecare pas al nostru poate deveni o {word} de suflet.'
    ], 999999, ['poveste', 'melodie', 'căldură', 'fericire', 'liniște', 'magie', 'tandrețe', 'amintire']),
    massage: buildRichContentPool([
        '🪷 {i}. Un masaj relaxant și plin de {word}, doar pentru tine.',
        '🌿 {i}. O pauză liniștită, plină de {word} și de calm.',
        '💆 {i}. Un moment de liniște, de {word} și de odihnă.',
        '🕯️ {i}. Un gest de răsfăț și de {word}, făcut cu grijă.'
    ], 999999, ['căldură', 'liniște', 'tandrețe', 'pace', 'blândețe', 'fericire', 'calm', 'grație']),
    holdhands: buildRichContentPool([
        '🤝 {i}. Hai să ne ținem de mână și să mergem împreună spre {word}.',
        '💞 {i}. O mână caldă în a ta și un pas mai aproape de {word}.',
        '💛 {i}. Ținerea de mână e un mod simplu și frumos de a spune {word}.',
        '🌈 {i}. Un gest mic, dar plin de {word} și de siguranță.'
    ], 999999, ['fericire', 'liniște', 'dragoste', 'pace', 'siguranță', 'încredere', 'tandrețe', 'căldură']),
    surprise: buildRichContentPool([
        '🎁 {i}. O surpriză mică, dulce și plină de {word} pentru tine.',
        '✨ {i}. O surpriză care să îți aducă {word} și liniștea.',
        '💖 {i}. Un mic gest special, doar pentru că meriți {word}.',
        '🌸 {i}. O surpriză frumoasă, făcută cu {word} și grijă.'
    ], 999999, ['dragoste', 'fericire', 'căldură', 'zâmbet', 'liniște', 'bucurie', 'tandrețe', 'pace']),
    truth: buildRichContentPool([
        '🧠 {i}. Ce {word} te face să te simți cel mai viu și mai liber?',
        '🧠 {i}. Ce {word} te face să zâmbești chiar și în cele mai grele momente?',
        '🧠 {i}. Ce {word} îți dorești să împarți cu cineva drag în această zi?',
        '🧠 {i}. Ce {word} te ajută să crezi că totul va rămâne frumos?' 
    ], 999999, ['amintire', 'emoție', 'poveste', 'gând', 'căldură', 'liniște', 'speranță', 'tandrețe']),
    dare: buildRichContentPool([
        '🔥 {i}. Fă o {word} simplă și frumoasă pentru cineva drag în următoarele 10 minute.',
        '🔥 {i}. Încearcă să creezi o {word} care să aducă zâmbet și căldură.',
        '🔥 {i}. Alege o {word} curajoasă și fă-o cu suflet.',
        '🔥 {i}. Pune o {word} în practică chiar acum și lasă-i pe ceilalți să admire.'
    ], 999999, ['surpriză', 'provocare', 'mișcare', 'gestură', 'acțiune', 'idee', 'emoție', 'dare']),
    challenge: buildRichContentPool([
        '🎯 {i}. Încearcă să faci o {word} sinceră pentru cineva în următoarele 10 minute.',
        '🎯 {i}. Pune o {word} frumoasă și ascultă răspunsul cu atenție.',
        '🎯 {i}. Creează un plan de zi plin de {word} și de liniște.',
        '🎯 {i}. Fă un {word} de grijă pentru cineva drag și observă cât de bine se simte.'
    ], 999999, ['compliment', 'întrebare', 'gestură', 'acțiune', 'idee', 'surpriză', 'bucurie', 'căldură']),
    wouldyourather: buildRichContentPool([
        '🤔 {i}. Ai alege să ai o {word} caldă sau o noapte plină de stele?',
        '🤔 {i}. Ai alege o {word} la mare sau una în munți?',
        '🤔 {i}. Ai alege să fii {word} sau înțeles de fiecare dată?',
        '🤔 {i}. Ai alege un {word} sincer sau un compliment memorabil?' 
    ], 999999, ['zi', 'vacanță', 'ascultat', 'zâmbet', 'pas', 'gest', 'moment', 'privire']),
    thisorthat: buildRichContentPool([
        '💞 {i}. {word} adevărată sau aventură scurtă?',
        '🌈 {i}. {word} sau adrenalină?',
        '🌙 {i}. Noapte lungă cu vorbă sau {word} plină de acțiune?',
        '✨ {i}. Timp petrecut împreună sau {word} neașteptate?' 
    ], 999999, ['Dragoste', 'Liniște', 'zi', 'surprize', 'pace', 'claritate', 'fericire', 'tandrețe']),
    emoji: buildRichContentPool([
        '😀 {i}. Dacă {word} ar avea un emoji, ar fi unul plin de căldură și zâmbet.',
        '🥰 {i}. Un emoji pentru o {word} dulce, calmă și frumoasă.',
        '💖 {i}. Emoția ta de azi ar putea fi descrisă doar printr-un {word} mare.',
        '✨ {i}. Un simbol simplu, dar foarte clar, pentru {word} și bucurie.'
    ], 999999, ['dragostea', 'ziua', 'emoția', 'liniștea', 'fericirea', 'căldura', 'tandrețea', 'pacea']),
    guess: buildRichContentPool([
        '🎲 {i}. Ghicește ce {word} te face să te simți cel mai fericită în acest moment.',
        '🎲 {i}. Ghicește ce {word} îți vine primul în minte când auzi „acasă”.',
        '🎲 {i}. Ghicește ce {word} te face să te simți specială.',
        '🎲 {i}. Ghicește ce {word} îți dă cel mai mult siguranță în această zi.'
    ], 999999, ['lucru', 'amintire', 'gând', 'gest', 'moment', 'sentiment', 'sursă', 'simțire']),
    spin: buildRichContentPool([
        '🎡 {i}. Rotirea vieții spune că este momentul să faci o {word} frumoasă pentru tine.',
        '🎡 {i}. Încearcă să alegi un {word} bun pentru ziua de azi.',
        '🎡 {i}. Nu te gândi prea mult; alege ceva {word} și plin de căldură.',
        '🎡 {i}. O mică alegere simplă poate aduce {word} în suflet.'
    ], 999999, ['gestiune', 'gest', 'simplu', 'liniște', 'bucurie', 'fericire', 'zâmbet', 'căldură']),
    question: buildRichContentPool([
        '❓ {i}. Ce {word} te face să te simți împlinită în acest moment?',
        '❓ {i}. Ce {word} ai vrea să primești în această zi?',
        '❓ {i}. Ce {word} te face să te simți în siguranță și liniștită?',
        '❓ {i}. Ce {word} te ajută să îți găsești calmul?' 
    ], 999999, ['lucru', 'gest', 'mesaj', 'răspuns', 'simțire', 'gând', 'senzație', 'claritate']),
    dedicatie: buildRichContentPool([
        '💌 {i}. Dedicație: pentru tine, persoana care a făcut lumea mai {word}.',
        '💌 {i}. Dedicație: fiecare gând bun al meu este pentru tine, chiar acum, cu {word}.',
        '💌 {i}. Dedicație: ai făcut din viața mea un loc mai luminos și mai {word}.',
        '💌 {i}. Dedicație: pentru sufletul tău frumos și pentru zâmbetul tău {word}.'
    ], 999999, ['frumoasă', 'cald', 'luminat', 'special', 'blând', 'clar', 'plin', 'vibrant']),
    poezie: buildRichContentPool([
        '📜 {i}. Poezie:\nÎn ochii tăi găsesc un cer,\nÎn zâmbet, tot ce am de cer.\nCu tine, timpul stă pe loc,\nEști inima mea, fără joc.',
        '📜 {i}. Poezie:\nTe port în gând ca pe-o comoară,\nCe nicio noapte n-o doboară.\nEști vis, ești soare, ești blândețe,\nEști tot ce am ca dulce certitudine.',
        '📜 {i}. Poezie:\nDe câte ori privesc spre tine,\nSimt cum totul merge bine.\nEști raza mea din orice zi,\nȘi voi iubi cât voi trăi.'
    ], 999999),
    date: buildRichContentPool([
        '💘 {i}. Propunere de întâlnire: o {word} la apus, cu multe vorbe și puțină grabă.',
        '💘 {i}. Propunere de întâlnire: o {word} caldă, personală și plină de liniște.',
        '💘 {i}. Propunere de întâlnire: o {word} simplă, frumoasă și cu multă atenție.',
        '💘 {i}. Propunere de întâlnire: o {word} elegantă, plină de zâmbete și de calm.'
    ], 999999, ['plimbare', 'cafea', 'seară', 'cină', 'discutație', 'tardivă', 'escapadă', 'pietonală']),
    gift: buildRichContentPool([
        '🎁 {i}. Un cadou mic, dar cu suflet: o {word} frumoasă sau o floare simplă și elegantă.',
        '🎁 {i}. Un cadou perfect pentru o persoană specială: ceva {word} și plin de grijă.',
        '🎁 {i}. Cea mai frumoasă ofertă este un gest {word} făcut cu dragoste și atenție.',
        '🎁 {i}. Un cadou care spune mult: ceva {word}, personal și cu simțire.'
    ], 999999, ['carte', 'surpriză', 'personal', 'tandru', 'cald', 'elegant', 'memorable', 'simplu']),
    bucketlist: buildRichContentPool([
        '📝 {i}. Pune pe listă: să ai o zi întreagă doar pentru {word} și pentru lucrurile care te fac fericită.',
        '📝 {i}. Pune pe listă: să faci o plimbare la apus și să te bucuri de {word}.',
        '📝 {i}. Pune pe listă: să scrii o scrisoare frumoasă și să o păstrezi pentru {word}.',
        '📝 {i}. Pune pe listă: să îți oferi un moment de {word} fără grabă.'
    ], 999999, ['tine', 'liniște', 'mai târziu', 'pace', 'fericire', 'calm', 'bucurie', 'tandrețe']),
    punish: buildRichContentPool([
        '😈 {i}. Pedepse ușoare: să faci un {word} sincer și să zâmbești în fiecare minut.',
        '😈 {i}. Pedepse ușoare: să oferi o {word} amuzantă pentru un mic gest stupid.',
        '😈 {i}. Pedepse ușoare: să faci un {word} de grijă pentru cineva drag.',
        '😈 {i}. Pedepse ușoare: să oferi un {word} frumos și să eviți grabă pentru o zi.'
    ], 999999, ['compliment', 'explicație', 'gest', 'mesaj', 'sărut', 'surpriză', 'act', 'zâmbet']),
    reward: buildRichContentPool([
        '🎉 {i}. Recompensă: o seară de {word}, o băutură bună și multă liniște.',
        '🎉 {i}. Recompensă: o mică {word}, o floare sau un mesaj cald și personal.',
        '🎉 {i}. Recompensă: un moment doar pentru tine, fără {word} și fără grabă.',
        '🎉 {i}. Recompensă: o pauză de {word} și o surpriză dulce.'
    ], 999999, ['relaxare', 'surpriză', 'pace', 'griji', 'calm', 'bucurie', 'fericire', 'zâmbet']),
    website: buildRichContentPool([
        '🌐 {i}. Site-uri speciale:\nStefania: https://Stefania15-2026.github.io\nDenis: https://Denis14-2026.github.io',
    ], 1)
};

// ============================================================
// SETTINGS (cupidon setari)
// ------------------------------------------------------------
// Persisted to disk as JSON so changes survive restarts. Controlled
// entirely through an interactive WhatsApp list menu — no need to
// touch the code to tweak how the bot behaves day to day.
// ============================================================

const SETTINGS_PATH = path.join(__dirname, 'cupidon-settings.json');

const DEFAULT_SETTINGS = {
    testMode: false,
    hourlyMessagesEnabled: true,
    dailyMilestoneEnabled: true,
    riddleTimeoutMinutes: 5,
    maxWrongAnswers: 3,
    hourlyMessageTypes: ['romantic', 'rizz', 'flirt', 'pickup'],
    customMessages: {}
};

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch (error) {
        console.log('⚠️ Nu am putut citi cupidon-settings.json, folosesc valorile implicite:', error.message);
    }
    return { ...DEFAULT_SETTINGS };
}

function saveSettings() {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
        console.log('⚠️ Nu am putut salva cupidon-settings.json:', error.message);
    }
}

let settings = loadSettings();

function riddleTimeoutMs() {
    return (settings.riddleTimeoutMinutes || DEFAULT_SETTINGS.riddleTimeoutMinutes) * 60 * 1000;
}

function maxWrongAnswers() {
    return settings.maxWrongAnswers || DEFAULT_SETTINGS.maxWrongAnswers;
}

const SETTINGS_CATEGORY_LIST = Object.keys(contentLibrary).filter(Boolean).sort();
const SETTINGS_FLOW = new Map();
const TIMEOUT_CYCLE = [2, 5, 10, 15];
const LIVES_CYCLE = [2, 3, 4, 5];

function cycleValue(current, cycle) {
    const idx = cycle.indexOf(current);
    return cycle[(idx + 1) % cycle.length];
}

function onOff(flag) {
    return flag ? '✅ Activat' : '⛔ Dezactivat';
}

function isValidSettingsCategory(value) {
    const normalized = normalizeText(value || '');
    return SETTINGS_CATEGORY_LIST.some(category => normalizeText(category) === normalized);
}

function getSettingsCategoryListText() {
    return SETTINGS_CATEGORY_LIST.slice(0, 24).join(', ');
}

function getSettingsSummaryText() {
    return `⚙️ Setările curente:\n\n` +
        `🧪 Test Mode: ${onOff(settings.testMode)}\n` +
        `⏰ Mesaje orare: ${onOff(settings.hourlyMessagesEnabled)}\n` +
        `🎉 Mesaj de miezul nopții: ${onOff(settings.dailyMilestoneEnabled)}\n` +
        `⏱️ Timp ghicitoare: ${settings.riddleTimeoutMinutes} minute\n` +
        `❤️ Vieți ghicitoare: ${settings.maxWrongAnswers}\n` +
        `📝 Mesaje personalizate: ${Object.keys(settings.customMessages || {}).length}`;
}

function getSettingsMenuText() {
    return `⚙️ Setări Cupidon\n\nAlege una dintre opțiuni scriind numărul sau numele:\n\n1. test mode\n2. mesaje orare\n3. mesaj de miezul nopții\n4. timp ghicitoare\n5. vieți ghicitoare\n6. mesaj personalizat\n7. șterge mesaj personalizat\n8. reset setări\n9. arată setările\n\nScrie *back* sau *anuleaza* pentru a ieși.`;
}

function startSettingsFlow(groupId) {
    SETTINGS_FLOW.set(groupId, { step: 'awaiting-action' });
}

function clearSettingsFlow(groupId) {
    SETTINGS_FLOW.delete(groupId);
}

function getSettingsFlow(groupId) {
    return SETTINGS_FLOW.get(groupId) || null;
}

async function sendSettingsMenu(sock) {
    startSettingsFlow(groupId);
    await botSend(sock, groupId, {
        text: `${cardHeader('settings')}\n\n${getSettingsMenuText()}\n\n${getSettingsSummaryText()}`
    }, 'settings');
}

async function handleSettingsText(sock, rawText) {
    const flow = getSettingsFlow(groupId);
    if (!flow) return false;

    const normalized = normalizeText(rawText || '');
    if (!normalized) return true;

    if (normalized === 'anuleaza' || normalized === 'cancel' || normalized === 'stop' || normalized === 'exit') {
        clearSettingsFlow(groupId);
        await botSend(sock, groupId, { text: '❌ Am ieșit din setări.' }, 'settings');
        return true;
    }

    if (flow.step === 'awaiting-action') {
        if (normalized === 'back') {
            await botSend(sock, groupId, { text: getSettingsMenuText() + '\n\n' + getSettingsSummaryText() }, 'settings');
            return true;
        }

        if (normalized === '1' || normalized === 'test' || normalized === 'test mode') {
            settings.testMode = !settings.testMode;
            saveSettings();
            await botSend(sock, groupId, { text: `🧪 Test Mode este acum ${onOff(settings.testMode)}.` }, 'settings');
            await sendSettingsMenu(sock);
            return true;
        }

        if (normalized === '2' || normalized === 'hourly' || normalized === 'mesaje orare') {
            settings.hourlyMessagesEnabled = !settings.hourlyMessagesEnabled;
            saveSettings();
            await botSend(sock, groupId, { text: `⏰ Mesajele orare sunt acum ${onOff(settings.hourlyMessagesEnabled)}.` }, 'settings');
            await sendSettingsMenu(sock);
            return true;
        }

        if (normalized === '3' || normalized === 'daily' || normalized === 'mesaj de miezul noptii') {
            settings.dailyMilestoneEnabled = !settings.dailyMilestoneEnabled;
            saveSettings();
            await botSend(sock, groupId, { text: `🎉 Mesajul de miezul nopții este acum ${onOff(settings.dailyMilestoneEnabled)}.` }, 'settings');
            await sendSettingsMenu(sock);
            return true;
        }

        if (normalized === '4' || normalized === 'timeout' || normalized === 'timp ghicitoare') {
            SETTINGS_FLOW.set(groupId, { step: 'awaiting-timeout', action: 'timeout' });
            await botSend(sock, groupId, { text: `⏱️ Trimite un număr pentru timpul ghicitorii în minute.
Valori recomandate: 2, 5, 10, 15.
Scrie *back* pentru a reveni.` }, 'settings');
            return true;
        }

        if (normalized === '5' || normalized === 'lives' || normalized === 'vieți' || normalized === 'vieți ghicitoare') {
            SETTINGS_FLOW.set(groupId, { step: 'awaiting-lives', action: 'lives' });
            await botSend(sock, groupId, { text: `❤️ Trimite un număr pentru câte vieți dorești la ghicitori.
Valori recomandate: 2, 3, 4, 5.
Scrie *back* pentru a reveni.` }, 'settings');
            return true;
        }

        if (normalized === '6' || normalized === 'custom' || normalized === 'mesaj personalizat') {
            SETTINGS_FLOW.set(groupId, { step: 'awaiting-category', action: 'custom' });
            await botSend(sock, groupId, { text: `📝 Scrie categoria pentru care vrei să setezi un mesaj nou.\nExemple: ${getSettingsCategoryListText()}` }, 'settings');
            return true;
        }

        if (normalized === '7' || normalized === 'clear' || normalized === 'sterge mesaj personalizat') {
            SETTINGS_FLOW.set(groupId, { step: 'awaiting-category', action: 'clear' });
            await botSend(sock, groupId, { text: `🗑️ Scrie categoria pentru care vrei să ștergi mesajul personalizat.` }, 'settings');
            return true;
        }

        if (normalized === '8' || normalized === 'reset' || normalized === 'reset setări') {
            settings = { ...DEFAULT_SETTINGS, customMessages: {} };
            saveSettings();
            await botSend(sock, groupId, { text: '🔄 Setările au fost resetate la valorile implicite.' }, 'settings');
            await sendSettingsMenu(sock);
            return true;
        }

        if (normalized === '9' || normalized === 'show' || normalized === 'arată setările') {
            await botSend(sock, groupId, { text: getSettingsSummaryText() }, 'settings');
            await sendSettingsMenu(sock);
            return true;
        }

        await botSend(sock, groupId, { text: `⚠️ Opțiune necunoscută.\n\n${getSettingsMenuText()}` }, 'settings');
        return true;
    }

    if (flow.step === 'awaiting-category') {
        if (normalized === 'back') {
            SETTINGS_FLOW.set(groupId, { step: 'awaiting-action' });
            await botSend(sock, groupId, { text: getSettingsMenuText() + '\n\n' + getSettingsSummaryText() }, 'settings');
            return true;
        }

        if (normalized === 'anuleaza' || normalized === 'cancel' || normalized === 'stop' || normalized === 'exit') {
            clearSettingsFlow(groupId);
            await botSend(sock, groupId, { text: '❌ Am ieșit din setări.' }, 'settings');
            return true;
        }

        if (!isValidSettingsCategory(normalized)) {
            await botSend(sock, groupId, { text: `❌ Categoria *${rawText}* nu este disponibilă.\n\nÎncearcă din nou cu o categorie validă, de exemplu: ${getSettingsCategoryListText()}` }, 'settings');
            return true;
        }

        if (flow.action === 'clear') {
            settings.customMessages = settings.customMessages || {};
            delete settings.customMessages[normalized];
            saveSettings();
            await botSend(sock, groupId, { text: `🗑️ Am șters personalizarea pentru categoria *${normalized}*.` }, 'settings');
            await sendSettingsMenu(sock);
            return true;
        }

        SETTINGS_FLOW.set(groupId, { step: 'awaiting-text', action: 'custom', category: normalized });
        await botSend(sock, groupId, {
            text: `✅ Categoria *${normalized}* a fost selectată.\n\nTrimite acum textul nou pe care vrei să îl folosească botul.\nDacă vrei să anulezi, scrie *anuleaza*.`
        }, 'settings');
        return true;
    }

    if (flow.step === 'awaiting-text') {
        if (normalized === 'back') {
            SETTINGS_FLOW.set(groupId, { step: 'awaiting-action' });
            await botSend(sock, groupId, { text: getSettingsMenuText() + '\n\n' + getSettingsSummaryText() }, 'settings');
            return true;
        }

        if (normalized === 'anuleaza' || normalized === 'cancel' || normalized === 'stop' || normalized === 'exit') {
            clearSettingsFlow(groupId);
            await botSend(sock, groupId, { text: '❌ Am ieșit din setări.' }, 'settings');
            return true;
        }

        const category = flow.category;
        settings.customMessages = settings.customMessages || {};
        settings.customMessages[category] = rawText.trim();
        saveSettings();
        await botSend(sock, groupId, { text: `✅ Am salvat mesajul pentru categoria *${category}*.` }, 'settings');
        await sendSettingsMenu(sock);
        return true;
    }

    if (flow.step === 'awaiting-timeout') {
        if (normalized === 'back') {
            SETTINGS_FLOW.set(groupId, { step: 'awaiting-action' });
            await botSend(sock, groupId, { text: getSettingsMenuText() + '\n\n' + getSettingsSummaryText() }, 'settings');
            return true;
        }

        const parsed = Number(rawText);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            await botSend(sock, groupId, { text: '⚠️ Te rog trimite un număr întreg pozitiv pentru timpul ghicitorii.' }, 'settings');
            return true;
        }

        settings.riddleTimeoutMinutes = parsed;
        saveSettings();
        await botSend(sock, groupId, { text: `⏱️ Timpul pentru ghicitori este acum ${settings.riddleTimeoutMinutes} minute.` }, 'settings');
        await sendSettingsMenu(sock);
        return true;
    }

    if (flow.step === 'awaiting-lives') {
        if (normalized === 'back') {
            SETTINGS_FLOW.set(groupId, { step: 'awaiting-action' });
            await botSend(sock, groupId, { text: getSettingsMenuText() + '\n\n' + getSettingsSummaryText() }, 'settings');
            return true;
        }

        const parsed = Number(rawText);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            await botSend(sock, groupId, { text: '⚠️ Te rog trimite un număr întreg pozitiv pentru numărul de vieți.' }, 'settings');
            return true;
        }

        settings.maxWrongAnswers = parsed;
        saveSettings();
        await botSend(sock, groupId, { text: `❤️ Numărul de vieți la ghicitori este acum ${settings.maxWrongAnswers}.` }, 'settings');
        await sendSettingsMenu(sock);
        return true;
    }

    return false;
}

function startMoodCheck(sock) {
    const moods = [
        '🌈 Aura ta e în modul *romantic ultra* — totul pare mai frumos și mai magical.',
        '✨ Aura ta e în modul *sparkle* — zâmbești, strălucești și atragi atenția.',
        '💖 Aura ta e în modul *love bomb* — toată lumea simte că ești într-o zi specială.',
        '🌙 Aura ta e în modul *mystic* — ești plină de calm, mister și farmec.',
        '🔥 Aura ta e în modul *flare* — ai energie, șarm și un pic de drama bună.'
    ];
    const mood = pickNoRepeat('modern_mood', moods);
    return botSend(sock, groupId, { text: `${mood}\n\nScrie *cupidon vibe* pentru altă citire!` }, 'mood');
}

function startAuraReading(sock) {
    const auraMessages = [
        '💫 Aura ta: 97% lumină, 3% mister.',
        '🌟 Aura ta: 89% căldură, 11% magie.',
        '🪄 Aura ta: 93% flirt, 7% șoc pozitiv.',
        '🌈 Aura ta: 85% iubire, 15% energie cosmică.',
        '⚡ Aura ta: 91% șarm, 9% drama elegantă.'
    ];
    const aura = pickNoRepeat('modern_aura', auraMessages);
    return botSend(sock, groupId, { text: `${aura}\n\nScrie *cupidon aura* pentru un nou readout!` }, 'aura');
}

function startDailyQuote(sock) {
    const quotes = [
        '🌙 „Dragostea nu e doar un sentiment, ci și un mod de a te simți acasă.”',
        '✨ „Când ești cu cineva care te înțelege, chiar și tăcerea devine frumoasă.”',
        '💖 „Un zâmbet sincer valorează mai mult decât o mie de cuvinte.”',
        '🌈 „Cele mai frumoase povești încep cu un simplu „hai să încercăm”.’',
        '🔥 „Energia bună schimbă totul, chiar și o zi obișnuită.”'
    ];
    const quote = pickNoRepeat('modern_quote', quotes);
    return botSend(sock, groupId, { text: `${quote}\n\nScrie *cupidon quote* pentru alt citat!` }, 'quote');
}

function startTarotSpread(sock) {
    const cards = [
        '🕯️ Cardul iubirii: „Totul se aliniază.”',
        '🌙 Cardul misterului: „Fii atent la semne.”',
        '☀️ Cardul fericirii: „O zi minunată te așteaptă.”',
        '🌹 Cardul romantismului: „Dragostea e aproape.”',
        '⭐ Cardul norocului: „Ai un impuls special.”'
    ];
    const picked = [pickNoRepeat('tarot_1', cards), pickNoRepeat('tarot_2', cards), pickNoRepeat('tarot_3', cards)];
    return botSend(sock, groupId, { text: `🔮 *Tarot modern*\n\n${picked[0]}\n${picked[1]}\n${picked[2]}\n\nScrie *cupidon tarot* pentru o altă răsucire!` }, 'tarot');
}

function startRateCommand(sock, rawText) {
    const target = rawText.replace(/cupidon/i, '').replace(/rate/i, '').trim() || 'această relație';
    const score = 70 + Math.floor(Math.random() * 30);
    const emoji = score >= 90 ? '💖' : score >= 80 ? '✨' : score >= 70 ? '🌙' : '😄';
    return botSend(sock, groupId, { text: `${emoji} Rating-ul meu pentru *${target}* este *${score}/100*.` }, 'rate');
}

const HELP_TEXT = `✦━━━━━━━━━━━━━━━━━━✦
   🏹  𝗖𝗨𝗣𝗜𝗗𝗢𝗡
   Love • Fun • Games • Setări
✦━━━━━━━━━━━━━━━━━━✦

Scrie *cupidon <comandă>* pentru orice de mai jos ⬇️
Scrie *cupidon setari* ca să reglezi bot-ul după cum vrei ⚙️

${RULE}
❤️ *LOVE*
${RULE}
🌹 romantic     😏 rizz        💖 compliment
😘 flirt        💌 pickup      📜 lovequote
🤍 promise      💍 reasons     🥺 missyou
🌞 goodmorning  🌙 goodnight   💭 imagineazati

${RULE}
💋 *ACȚIUNI*
${RULE}
💋 kiss          🤗 hug          🥰 cuddle
😘 foreheadkiss  😊 cheekkiss    💍 handkiss
💃 dance         💆 massage      🤝 holdhands
🎁 surprise

${RULE}
✨ *MODERN & COOL*
${RULE}
🌈 vibe / mood    ✨ aura        🔮 tarot
📜 quote         💯 rate        🪄 choose

${RULE}
🎲 *JOC DE CUPLU*
${RULE}
❓ truth            🔥 dare        🎯 challenge
🤔 wouldyourather   ⚖️ thisorthat  😀 emoji
🎲 guess            🎡 spin        ❓ question

${RULE}
💕 *RELAȚIE*
${RULE}
⏳ impreuna     ❤️ lovemeter    💞 compatibility
🎉 anniversary  📸 memory       ⌛ countdown
🌹 firstdate

${RULE}
🎁 *FUN*
${RULE}
🍽️ date    🏆 reward   😈 punish
🎀 gift    📝 bucketlist   🌐 website
💌 dedicatie   📜 poezie  🎵 spotify

${RULE}
🎮 *GAMES*
${RULE}
🎮 tictactoe   🪨 rps         🧠 quiz
🔢 numar       🎲 dice        🪙 coin
🔮 8ball       🎰 slot        🧩 scramble
🎯 hangman     🧩 anagram     🧠 emojiquiz
🧮 math        🎨 color       🧠 trivia
🐾 animal      🎲 choose      🔢 100

${RULE}
⚙️ *SETĂRI*
${RULE}
🔧 setari — deschide meniul de setări interactiv

${RULE}
📖 *INFO*
${RULE}
📚 help

${RULE}
✨ *EXEMPLE*
${RULE}
💖 cupidon romantic   💋 cupidon kiss
🔥 cupidon dare       ❤️ cupidon lovemeter
🍽️ cupidon date       🎮 cupidon tictactoe
⚙️ cupidon setari

✦──────────────────✦
❤️ Dragostea nu înseamnă să găsești
persoana perfectă... ci să vezi
perfecțiunea într-o persoană imperfectă.

🏹 *Cupidon* — mereu aici pentru
Denis ❤️ Stefania
✦──────────────────✦`;

let currentRiddle = null;
let riddleTimeout = null;
let wrongAnswerCount = 0;

const activeTicTacToeGames = new Map();

function getTimeTogether(offsetHours = 0) {
    const now = new Date();
    if (offsetHours) now.setHours(now.getHours() - offsetHours);
    let diff = now - startDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * (1000 * 60 * 60 * 24);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(diff / (1000 * 60));
    diff -= minutes * (1000 * 60);
    const seconds = Math.floor(diff / 1000);
    return `${days} zile, ${hours} ore, ${minutes} minute, ${seconds} secunde`;
}

function normalizeText(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// A message is treated as "ours" if it carries our bow-and-arrow mark
// together with our name, anywhere in the text. This is deliberately
// loose (not an exact prefix match) because every message now carries
// its own category badge/title before the body, and the raw help menu
// and startup/shutdown announcements all use their own formatting —
// a strict "starts with" check would miss most of them. This is only
// ever checked against the bot's own `fromMe` messages, so it never
// affects anything another person in the chat sends.
function isBotMessageText(text) {
    if (typeof text !== 'string') return false;
    const normalized = normalizeText(text);
    return normalized.includes('🏹') && normalized.includes('cupidon');
}

// ============================================================
// NO-REPEAT MESSAGE PICKER
// ------------------------------------------------------------
// Instead of picking a random index every time (which allows
// the same message to show up again immediately, or very often),
// we keep a shuffled "deck" of indices per message type. We deal
// cards off the top of the deck one at a time; once the deck is
// empty (every message in that pool has been shown), we reshuffle
// a brand new deck. This guarantees no message repeats until the
// entire pool has been exhausted. Every random pick in this file —
// riddles, quotes, games, hangman/scramble/anagram words, dice,
// coin flips, rps, milestone messages — goes through this so
// nothing shows up twice in a row.
// ============================================================

const messageDecks = new Map(); // type -> array of remaining shuffled indices

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildFreshDeck(length) {
    const deck = new Array(length);
    for (let i = 0; i < length; i++) deck[i] = i;
    return shuffleArray(deck);
}

function drawIndex(key, length) {
    let deck = messageDecks.get(key);
    if (!deck || deck.length === 0) {
        deck = buildFreshDeck(length);
        messageDecks.set(key, deck);
    }
    return deck.pop();
}

// Convenience wrapper: pick a random-but-no-immediate-repeat entry
// straight out of an array, keyed by name. Used everywhere a game
// or message list previously called Math.random() directly.
function pickNoRepeat(key, arr) {
    const idx = drawIndex(key, arr.length);
    return arr[idx];
}

function pickFrom(type) {
    const key = type || '__default__';

    if (type && contentLibrary[type]) {
        const pool = contentLibrary[type];
        const idx = drawIndex(key, pool.length);
        return { type, text: pool[idx] };
    }

    const pool = type ? messagePool.filter(m => m.type === type) : messagePool;
    const idx = drawIndex(key, pool.length);
    return pool[idx];
}

function buildSimpleMessage(type) {
    if (type && type !== 'riddle' && settings.customMessages && typeof settings.customMessages[type] === 'string' && settings.customMessages[type].trim()) {
        return settings.customMessages[type].trim();
    }

    const randomMsg = pickFrom(type);
    let text = '';

    if (randomMsg.type === 'riddle') {
        currentRiddle = randomMsg;
        wrongAnswerCount = 0;
        text += randomMsg.text + `\n\n⏱️ ${settings.riddleTimeoutMinutes} minute · ${livesBar(maxWrongAnswers(), maxWrongAnswers())}`;
    } else {
        text += randomMsg.text;
    }
    return text;
}

function getCountdownMessage() {
    const now = new Date();
    const nextYear = new Date(now.getFullYear() + 1, 0, 1);
    const diff = nextYear - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `🎉 Mai sunt ${days} zile până la un nou început de an și la o nouă pagină plină de iubire!`;
}

// Text/emoji based board — no image rendering, no Jimp/font dependency.
// This is far more reliable than the old image renderer, which could
// silently throw (bad font, bad Jimp API version, missing font files)
// and leave the game stuck right after "cupidon start".
const TTT_KEYCAPS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

function renderTicTacToeText(board) {
    const cellDisplay = (i) => {
        if (board[i] === 'X') return '❌';
        if (board[i] === 'O') return '⭕';
        return TTT_KEYCAPS[i];
    };
    const rows = [];
    for (let r = 0; r < 3; r++) {
        rows.push([0, 1, 2].map(c => cellDisplay(r * 3 + c)).join(''));
    }
    return rows.join('\n');
}

function createEmptyTicTacToeBoard() {
    return Array(9).fill(null);
}

function cardHeader(type) {
    const s = styleMap[type] || styleMap.general;
    const edge = '✦' + RULE + '✦';
    const lines = [edge];
    if (s.category) lines.push(`   ✧ ${s.category} ✧`);
    lines.push(`   ${s.icon}  ${toBoldUnicode(s.title)}`);
    lines.push(edge);
    return lines.join('\n');
}

function ttoeCardHeader() {
    return cardHeader('tictactoe');
}

function getTicTacToeCaption(game) {
    const symbolText = game.currentSymbol || 'X';
    return `${ttoeCardHeader()}\n\n${renderTicTacToeText(game.board)}\n\nSimbol curent: *${symbolText}*\nAlege o casetă de la 1 la 9.\n${RULE}\n${FOOTER}`;
}

function getTicTacToeListRows(board) {
    const cellLabel = (i) => {
        if (board[i] === 'X') return '❌ Ocupat';
        if (board[i] === 'O') return '⭕ Ocupat';
        return `${TTT_KEYCAPS[i]} Liber`;
    };
    const rows = [];
    for (let i = 0; i < 9; i++) {
        rows.push({
            title: `Caseta ${i + 1}`,
            description: cellLabel(i),
            rowId: `ttt_move_${i}`
        });
    }
    return rows;
}

function checkTicTacToeWinner(board) {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];

    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    if (board.every(cell => cell)) return 'draw';
    return null;
}

async function sendTicTacToeButtons(sock, game) {
    const caption = getTicTacToeCaption(game);

    // Single interactive list message instead of several button messages.
    // This avoids the extra near-empty chat bubbles WhatsApp buttons need —
    // one clean message with a button that opens all 9 cells to pick from.
    await trackSendMessage(sock, groupId, {
        text: caption,
        footer: '✦ Cupidon',
        title: '🎮 TicTacToe',
        buttonText: '👉 Alege o casetă',
        sections: [
            {
                title: 'Tabla de joc',
                rows: getTicTacToeListRows(game.board)
            }
        ]
    });
}

async function startTicTacToeGame(sock) {
    console.log('🎮 startTicTacToeGame called for group', groupId);
    const game = {
        phase: 'pick-symbol',
        board: createEmptyTicTacToeBoard(),
        currentSymbol: null
    };
    activeTicTacToeGames.set(groupId, game);

    const result = await trackSendMessage(sock, groupId, {
        text: `${ttoeCardHeader()}\n\nAlege primul simbol: *X* sau *O*, apoi scrie *cupidon start* pentru a afișa tabla.\n${RULE}\n${FOOTER}`,
        footer: '✦ Cupidon',
        buttons: [
            { buttonId: 'ttt_choose_x', buttonText: { displayText: '❌ X' }, type: 1 },
            { buttonId: 'ttt_choose_o', buttonText: { displayText: '⭕ O' }, type: 1 }
        ],
        headerType: 1
    });
    console.log('🎮 TicTacToe start message sent:', result?.key?.id);
}

async function beginTicTacToeGame(sock, game) {
    try {
        game.phase = 'playing';
        await sendTicTacToeButtons(sock, game);
    } catch (error) {
        console.error('🎮 Eroare la pornirea TicTacToe:', error?.message || error);
        activeTicTacToeGames.delete(groupId);
        await botSend(sock, groupId, {
            text: `⚠️ A apărut o eroare la pornirea jocului. Scrie *cupidon tictactoe* pentru a încerca din nou.`
        }, 'tictactoe');
    }
}

async function handleTicTacToeMove(sock, game, index) {
    if (game.phase !== 'playing') {
        await botSend(sock, groupId, { text: `❗ Alege mai întâi simbolul X sau O pentru a începe.` }, 'tictactoe');
        return;
    }

    if (game.board[index]) {
        await botSend(sock, groupId, { text: `❌ Caseta ${index + 1} este deja ocupată. Alege alta.` }, 'tictactoe');
        await sendTicTacToeButtons(sock, game);
        return;
    }

    game.board[index] = game.currentSymbol;
    const winner = checkTicTacToeWinner(game.board);
    if (winner) {
        const boardText = renderTicTacToeText(game.board);
        if (winner === 'draw') {
            await botSend(sock, groupId, {
                text: `${boardText}\n\n🤝 *Remiză!* Jocul s-a terminat.\nScrie *cupidon tictactoe* pentru o revanșă!`
            }, 'tictactoe');
        } else {
            await botSend(sock, groupId, {
                text: `${boardText}\n\n🎉 *${winner} a câștigat!* Felicitări!\nScrie *cupidon tictactoe* pentru o revanșă!`
            }, 'tictactoe');
        }
        activeTicTacToeGames.delete(groupId);
        return;
    }

    game.currentSymbol = game.currentSymbol === 'X' ? 'O' : 'X';
    try {
        await sendTicTacToeButtons(sock, game);
    } catch (error) {
        console.error('🎮 Eroare la trimiterea tablei TicTacToe:', error?.message || error);
        activeTicTacToeGames.delete(groupId);
        await botSend(sock, groupId, {
            text: `⚠️ A apărut o eroare în joc. Scrie *cupidon tictactoe* pentru a începe din nou.`
        }, 'tictactoe');
    }
}

async function handleTicTacToeButton(sock, buttonId) {
    console.log('🎮 handleTicTacToeButton called with', buttonId);
    const game = activeTicTacToeGames.get(groupId);
    if (!game) {
        await botSend(sock, groupId, { text: `❗ Nu există un joc activ. Scrie *cupidon tictactoe* pentru a începe.` }, 'tictactoe');
        return;
    }

    if (buttonId === 'ttt_choose_x' || buttonId === 'ttt_choose_o') {
        if (game.phase !== 'pick-symbol') {
            await botSend(sock, groupId, { text: `❗ Jocul este deja pornit.` }, 'tictactoe');
            return;
        }
        game.phase = 'ready';
        game.currentSymbol = buttonId === 'ttt_choose_x' ? 'X' : 'O';
        await botSend(sock, groupId, {
            text: `✅ Ai ales *${game.currentSymbol}*. Spune *cupidon start* pentru a porni tabla de joc.`
        }, 'tictactoe');
        return;
    }

    if (buttonId.startsWith('ttt_move_')) {
        const index = Number(buttonId.replace('ttt_move_', ''));
        if (Number.isNaN(index) || index < 0 || index > 8) {
            await botSend(sock, groupId, { text: `❗ Mutare invalidă.` }, 'tictactoe');
            return;
        }
        await handleTicTacToeMove(sock, game, index);
        return;
    }

    await botSend(sock, groupId, { text: `❗ Buton TicTacToe necunoscut.` }, 'tictactoe');
}

// ============================================================
// ROCK · PAPER · SCISSORS  (Piatră, Foarfecă, Hârtie)
// ============================================================

const RPS_CHOICES = {
    piatra: { label: '🪨 Piatră', emoji: '🪨', beats: 'foarfeca' },
    foarfeca: { label: '✂️ Foarfecă', emoji: '✂️', beats: 'hartie' },
    hartie: { label: '📄 Hârtie', emoji: '📄', beats: 'piatra' }
};

function pickRpsChoice() {
    const keys = Object.keys(RPS_CHOICES);
    // FIX: used to be a plain Math.random() pick, so the bot could throw
    // the same move several times in a row. Routed through the no-repeat
    // deck like every other pick in the file.
    return pickNoRepeat('rps_bot_choice', keys);
}

// FIX (carried over): this used to take a `chatId` second argument that
// nothing ever passed in, so it always hit its own "undefined" guard and
// silently sent nothing. It always targets the configured group now.
async function startRpsGame(sock) {
    const buttons = [
        { buttonId: 'rps_piatra',   buttonText: { displayText: '🪨 Piatră' },   type: 1 },
        { buttonId: 'rps_foarfeca', buttonText: { displayText: '✂️ Foarfecă' }, type: 1 },
        { buttonId: 'rps_hartie',   buttonText: { displayText: '📄 Hârtie' },   type: 1 }
    ];

    await trackSendMessage(sock, groupId, {
        text: `${cardHeader('rps')}\n\nAlege-ți mutarea!\n${RULE}\n${FOOTER}`,
        footer: '✦ Cupidon',
        buttons: buttons,
        headerType: 1
    });
}

async function handleRpsChoice(sock, buttonId) {
    const playerChoice = buttonId.replace('rps_', '');
    if (!RPS_CHOICES[playerChoice]) {
        await botSend(sock, groupId, { text: `❗ Alegere invalidă.` }, 'rps');
        return;
    }

    const botChoice = pickRpsChoice();
    const playerLabel = RPS_CHOICES[playerChoice].label;
    const botLabel = RPS_CHOICES[botChoice].label;

    let resultText;
    if (playerChoice === botChoice) {
        resultText = '🤝 *Egalitate!* Amândoi ați ales la fel.';
    } else if (RPS_CHOICES[playerChoice].beats === botChoice) {
        resultText = '🎉 *Ai câștigat!* Felicitări!';
    } else {
        resultText = '😅 *Cupidon a câștigat* de data asta!';
    }

    await botSend(sock, groupId, {
        text: `Tu ai ales: ${playerLabel}\nCupidon a ales: ${botLabel}\n\n${resultText}\n\nScrie *cupidon rps* pentru o revanșă!`
    }, 'rps');
}

// ============================================================
// QUIZ CUPLU (multiple-choice quiz, no repeat until pool cycles)
// ============================================================

const quizQuestions = [
    { question: 'Care este cea mai romantică perioadă a zilei?', options: ['Dimineața', 'Amiaza', 'Apusul', 'Miezul nopții'], correctIndex: 2 },
    { question: 'Ce simbolizează o inimă roșie?', options: ['Prietenie', 'Dragoste', 'Noroc', 'Curaj'], correctIndex: 1 },
    { question: 'Ce e cel mai important într-o relație?', options: ['Bani', 'Încredere', 'Faimă', 'Noroc'], correctIndex: 1 },
    { question: 'Ce culoare reprezintă de obicei iubirea?', options: ['Albastru', 'Verde', 'Roșu', 'Galben'], correctIndex: 2 },
    { question: 'Ce zi este dedicată îndrăgostiților?', options: ['1 Iunie', '14 Februarie', '1 Ianuarie', '25 Decembrie'], correctIndex: 1 },
    { question: 'Ce gest arată de obicei afecțiune?', options: ['Ignorare', 'Îmbrățișare', 'Ceartă', 'Tăcere'], correctIndex: 1 },
    { question: 'Ce simbol este asociat cu Cupidon?', options: ['Sabia', 'Arcul și săgeata', 'Scutul', 'Coroana'], correctIndex: 1 },
    { question: 'Ce floare este cel mai des asociată cu dragostea?', options: ['Trandafirul', 'Lalea', 'Ghiocelul', 'Margareta'], correctIndex: 0 },
    { question: 'Ce reprezintă o promisiune într-o relație?', options: ['Un joc', 'Un angajament sincer', 'O glumă', 'O obligație rece'], correctIndex: 1 },
    { question: 'Ce face o relație să dureze în timp?', options: ['Norocul', 'Comunicarea și respectul', 'Banii', 'Distanța'], correctIndex: 1 },
    { question: 'Ce înseamnă compromisul într-un cuplu?', options: ['A pierde mereu', 'A găsi o cale comună', 'A ceda tot timpul', 'A evita conflictul'], correctIndex: 1 },
    { question: 'Ce ar trebui să faci după o ceartă?', options: ['Să ignori', 'Să vorbești deschis', 'Să pleci definitiv', 'Să te superi tăcut'], correctIndex: 1 },
    { question: 'Care este cel mai bun cadou pentru o aniversare?', options: ['Cel mai scump', 'Cel cu suflet', 'Cel din reclamă', 'Nu contează'], correctIndex: 1 },
    { question: 'Ce simbolizează inelele la logodnă?', options: ['Modă', 'Angajament', 'Statut social', 'Obicei'], correctIndex: 1 },
    { question: 'Cât de important e umorul într-o relație?', options: ['Deloc', 'Puțin', 'Foarte important', 'Nu contează'], correctIndex: 2 },
    { question: 'Ce arată de obicei o îmbrățișare lungă?', options: ['Nerăbdare', 'Confort și siguranță', 'Plictiseală', 'Formalitate'], correctIndex: 1 },
    { question: 'Ce fel de amintiri contează cel mai mult?', options: ['Cele scumpe', 'Cele sincere', 'Cele publice', 'Cele planificate perfect'], correctIndex: 1 },
    { question: 'Ce e prima regulă a unei relații sănătoase?', options: ['Control', 'Respect reciproc', 'Gelozie', 'Competiție'], correctIndex: 1 },
    { question: 'Ce simbolizează culoarea albă la nuntă?', options: ['Puritate', 'Tristețe', 'Noroc', 'Vară'], correctIndex: 0 },
    { question: 'Ce e mai valoros: timpul sau banii?', options: ['Banii', 'Timpul petrecut împreună', 'Nu contează', 'Depinde de zi'], correctIndex: 1 }
];

async function startQuizGame(sock) {
    const idx = drawIndex('quiz', quizQuestions.length);
    const q = quizQuestions[idx];

    const rows = q.options.map((opt, i) => ({
        title: opt,
        rowId: `quiz_${idx}_${i}`
    }));

    await trackSendMessage(sock, groupId, {
        text: `${cardHeader('quiz')}\n\n❓ ${q.question}\n${RULE}\n${FOOTER}`,
        footer: '✦ Cupidon',
        title: '🧠 Quiz Cuplu',
        buttonText: '👉 Răspunde',
        sections: [
            { title: 'Variante de răspuns', rows }
        ]
    });
}

async function handleQuizAnswer(sock, buttonId) {
    const parts = buttonId.split('_'); // quiz_<questionIndex>_<optionIndex>
    const questionIndex = Number(parts[1]);
    const optionIndex = Number(parts[2]);
    const q = quizQuestions[questionIndex];

    if (!q || Number.isNaN(optionIndex)) {
        await botSend(sock, groupId, { text: `❗ Răspuns invalid.` }, 'quiz');
        return;
    }

    if (optionIndex === q.correctIndex) {
        await botSend(sock, groupId, { text: `✅ *Corect!* Ești genială/geniu ❤️\n\nScrie *cupidon quiz* pentru altă întrebare!` }, 'quiz');
    } else {
        await botSend(sock, groupId, { text: `❌ Greșit! Răspunsul corect era: *${q.options[q.correctIndex]}*\n\nScrie *cupidon quiz* pentru altă întrebare!` }, 'quiz');
    }
}

// ============================================================
// GHICEȘTE NUMĂRUL (number guessing game)
// ============================================================

const activeNumberGames = new Map(); // groupId -> { target, attemptsLeft, min, max }
const NUMBER_GAME_MAX_ATTEMPTS = 7;
const NUMBER_GAME_MIN = 1;
const NUMBER_GAME_MAX = 100;

async function startNumberGuessGame(sock) {
    const target = Math.floor(Math.random() * (NUMBER_GAME_MAX - NUMBER_GAME_MIN + 1)) + NUMBER_GAME_MIN;
    activeNumberGames.set(groupId, {
        target,
        attemptsLeft: NUMBER_GAME_MAX_ATTEMPTS,
        min: NUMBER_GAME_MIN,
        max: NUMBER_GAME_MAX
    });

    await botSend(sock, groupId, {
        text: `M-am gândit la un număr între *${NUMBER_GAME_MIN}* și *${NUMBER_GAME_MAX}*.\n\n${livesBar(NUMBER_GAME_MAX_ATTEMPTS, NUMBER_GAME_MAX_ATTEMPTS)}\n\nScrie un număr!`
    }, 'numberguess');
}

async function handleNumberGuess(sock, game, guess) {
    if (guess === game.target) {
        await botSend(sock, groupId, {
            text: `🎉 *Corect!* Numărul era *${game.target}*!\nGhicit din ${NUMBER_GAME_MAX_ATTEMPTS - game.attemptsLeft + 1} încercări ❤️\n\nScrie *cupidon numar* pentru un joc nou!`
        }, 'numberguess');
        activeNumberGames.delete(groupId);
        return;
    }

    game.attemptsLeft--;

    if (game.attemptsLeft <= 0) {
        await botSend(sock, groupId, {
            text: `❌ Ai terminat încercările! Numărul era *${game.target}*.\n\nScrie *cupidon numar* pentru un joc nou!`
        }, 'numberguess');
        activeNumberGames.delete(groupId);
        return;
    }

    const hint = guess < game.target ? '⬆️ Mai mare' : '⬇️ Mai mic';
    await botSend(sock, groupId, {
        text: `${hint}!\n\n${livesBar(game.attemptsLeft, NUMBER_GAME_MAX_ATTEMPTS)}`
    }, 'numberguess');
}

// ============================================================
// GHICEȘTE CUVÂNTUL (scramble)
// ============================================================

const activeScrambleGames = new Map();
const SCRAMBLE_MAX_ATTEMPTS = 3;
const SCRAMBLE_WORDS = ['dragoste', 'iubire', 'zambet', 'vis', 'lumină', 'căldură', 'fericire', 'surpriză', 'aventură', 'poveste', 'imagine', 'bucurie', 'pământ', 'univers', 'stea', 'galaxie', 'natură', 'pădure', 'munte', 'ocean', 'fluviu', 'furtună', 'fulger', 'răsărit', 'apus', 'speranță', 'curaj', 'bunătate', 'prietenie', 'respect', 'libertate', 'pasiune', 'armonie', 'liniște', 'încredere', 'onestitate', 'timp', 'destin', 'adevăr', 'secret', 'mister', 'magie', 'iluzie', 'memorie', 'gând', 'creație', 'energie', 'scânteie', 'castel', 'corabie', 'oglindă', 'carte', 'comoară', 'oraș', 'grădină', 'fereastră', 'potecă', 'insulă', 'palat', 'luminos', 'albastru', 'vânt', 'ploaie', 'soare', 'lună', 'nor', 'cer', 'foc', 'gheață', 'nisip', 'aur', 'argint', 'diamant', 'smarald', 'perla', 'coroană', 'rege', 'regină', 'cavaler', 'scut', 'sabie', 'arc', 'săgeată', 'izvor', 'cascadă', 'peșteră', 'vulcan', 'vale', 'deal', 'câmpie', 'floare', 'copac', 'frunză', 'iarbă', 'fluture', 'albină', 'pasăre', 'vultur', 'leu', 'lup', 'urs', 'cerb', 'vulpe', 'pisică', 'câine', 'cal', 'delfin', 'balenă', 'rechin', 'pește', 'scoică', 'nisip', 'plajă', 'val', 'briză', 'far', 'port', 'ancoră', 'busolă', 'hartă', 'drum', 'cheie', 'lăcat', 'poartă', 'ușă', 'perete', 'acoperiș', 'turn', 'pod', 'tunel', 'sat', 'metropolă', 'planetă', 'astronaut', 'rachetă', 'satelit', 'telescop', 'microscop', 'laborator', 'știință', 'chimie', 'fizică', 'matematică', 'istorie', 'artă', 'muzică', 'dans', 'teatru', 'film', 'actor', 'pictor', 'sculptor', 'poet', 'scriitor', 'filozof', 'geniu', 'talent', 'succes', 'victorie', 'triumf', 'campion', 'trofeu', 'medalie', 'efort', 'muncă', 'studiu', 'școală', 'liceu', 'facultate', 'curs', 'examen', 'diplomă', 'bursă', 'cariere', 'afacere', 'proiect', 'idee', 'plan', 'strategie', 'tactică', 'echipă', 'coleg', 'partener', 'lider', 'ghid', 'profesor', 'maestru', 'elev', 'student', 'učenik', 'prieten', 'amic', 'vecin', 'familie', 'părinte', 'mamă', 'tată', 'frate', 'soră', 'bunic', 'bunică', 'copil', 'băiat', 'fată', 'tânăr', 'adult', 'bătrân', 'om', 'persoană', 'cetățean', 'popor', 'națiune', 'țară', 'capitală', 'steag', 'imn', 'tradiție', 'obicei', 'sărbătoare', 'crăciun', 'paște', 'aniversare', 'petrecere', 'dans', 'cântec', 'chitară', 'pian', 'vioară', 'tobă', 'trompetă', 'flaut', 'sunet', 'melodie', 'ritm', 'acord', 'voce', 'ecou', 'șoaptă', 'strigăt', 'râs', 'plâns', 'suspin', 'emoție', 'sentiment', 'dor', 'jale', 'nostalgie', 'mândrie', 'regret', 'iertare', 'milă', 'compasiune', 'generozitate', 'altruism', 'modestie', 'ambiție', 'mândrie', 'orgoliu', 'demnitate', 'onoare', 'glorie', 'faimă', 'reputație', 'caracter', 'suflet', 'spirit', 'minte', 'creier', 'gândire', 'rațiune', 'logică', 'intuiție', 'instinct', 'talent', 'abilitate', 'iscusință', 'meșteșug', 'meserie', 'doctor', 'inginer', 'avocat', 'judecător', 'polițist', 'pompier', 'soldat', 'pilot', 'marinar', 'șofer', 'bucătar', 'brutar', 'chelner', 'fanzin', 'jurnalist', 'fotograf', 'arhitect', 'designer', 'programator', 'hacker', 'robot', 'android', 'cibernetică', 'tehnologie', 'computer', 'laptop', 'telefon', 'ecran', 'tastatură', 'mouse', 'cablu', 'rețea', 'internet', 'website', 'aplicație', 'cod', 'program', 'bază', 'date', 'server', 'nor', 'stocare', 'memorie', 'procesor', 'placă', 'video', 'sunet', 'boxă', 'căști', 'microfon', 'cameră', 'video', 'obiectiv', 'blitz', 'senzor', 'baterie', 'încărcător', 'curent', 'electricitate', 'magnet', 'energie', 'forță', 'viteză', 'accelerare', 'gravitație', 'orbită', 'sistem', 'solar', 'cometă', 'asteroid', 'meteoriti', 'auroră', 'boreală', 'curcubeu', 'halou', 'umbră', 'penumbră', 'reflexie', 'refracție', 'prismă', 'lentilă', 'ochelari', 'lupă', 'ceas', 'cronometru', 'calendar', 'secol', 'mileniu', 'oră', 'minut', 'secundă', 'zi', 'noapte', 'dimineață', 'prânz', 'seară', 'miez', 'noapte', 'zori', 'amurg', 'primăvară', 'vară', 'toamnă', 'iarnă', 'zăpadă', 'gheață', 'fulg', 'viscol', 'ger', 'îngheț', 'topire', 'cald', 'fierbinte', 'rece', 'cald', 'temperatură', 'termometru', 'climă', 'vreme', 'prognoză', 'satelit', 'radar', 'hartă', 'atlas', 'glob', 'hartă', 'geografie', 'istorie', 'arheologie', 'muzeu', 'expoziție', 'galerie', 'monument', 'statuie', 'pictură', 'frescă', 'mozaic', 'vitraliu', 'biserică', 'catedrală', 'mănăstire', 'templu', 'moschee', 'sinagogă', 'altar', 'rugăciune', 'credință', 'religie', 'mit', 'legendă', 'basm', 'poveste', 'eroi', 'balaur', 'dragon', 'unicorn', 'fenix', 'sirenă', 'centaur', 'gigant', 'uriaș', 'pitic', 'elf', 'zână', 'vrăjitor', 'magician', 'iluzionist', 'truc', 'spectacol', 'public', 'audiență', 'aplauze', 'scenă', 'cortină', 'culise', 'decor', 'costum', 'mască', 'machiaj', 'rol', 'piesă', 'scenariu', 'regizor', 'producător', 'bilet', 'rând', 'scaun', 'lojă', 'balcon', 'foaier', 'intrare', 'ieșire', 'urgență', 'alarmă', 'semnal', 'sirenă', 'far', 'semafor', 'intersecție', 'stradă', 'bulevard', 'alee', 'trotuar', 'trecere', 'pietoni', 'pavele', 'asfalt', 'autostradă', 'șosea', 'pod', 'viaduct', 'pasaj', 'cale', 'ferată', 'tren', 'locomotivă', 'vagon', 'gară', 'peron', 'bilet', 'controlor', 'călător', 'pasager', 'bagaj', 'valiză', 'rucsac', 'geantă', 'portofel', 'card', 'bani', 'monedă', 'bancnotă', 'aur', 'argint', 'cupru', 'fier', 'oțel', 'metal', 'lemn', 'piatră', 'marmură', 'granit', 'ciment', 'beton', 'cărămidă', 'sticlă', 'cristal', 'plastic', 'cauciuc', 'piele', 'blană', 'bumbac', 'lână', 'mătase', 'pânză', 'fir', 'ață', 'ac', 'foarfecă', 'mașină', 'cusut', 'haină', 'pantalon', 'cămașă', 'tricou', 'pulover', 'jachetă', 'palton', 'rochie', 'fustă', 'pantof', 'ghetă', 'cizmă', 'sandale', 'papuci', 'șosete', 'mănuși', 'fular', 'căciulă', 'pălărie', 'șapcă', 'umbrelă', 'geantă', 'rucsac', 'ceas', 'inel', 'cercei', 'colier', 'brățară', 'broșă', 'parfum', 'cosmetic', 'săpun', 'șampon', 'pastă', 'dinți', 'perie', 'oglindă', 'prosop', 'baie', 'duș', 'cadă', 'robinet', 'apă', 'caldă', 'rece', 'săpun', 'spumă', 'bulă', 'balon', 'săpun', 'jucărie', 'păpușă', 'mașinuță', 'trenuleț', 'robot', 'puzzle', 'lego', 'zar', 'carte', 'joc', 'tablă', 'șah', 'dame', 'remi', 'monopoly', 'poker', 'cărți', 'pachet', 'as', 'rege', 'damă', 'valet', 'joker', 'zaruri', 'noroc', 'șansă', 'risc', 'pariu', 'câștig', 'pierdere', 'premiu', 'cadou', 'surpriză', 'felicitare', 'tort', 'lumânare', 'dorință', 'petrecere', 'invitație', 'oaspete', 'gazdă', 'masă', 'scaun', 'farfurie', 'pahar', 'cană', 'ceașcă', 'furculiță', 'cuțit', 'lingură', 'linguriță', 'șervețel', 'față', 'masă', 'bucătărie', 'aragaz', 'cuptor', 'frigider', 'congelator', 'blender', 'toaster', 'cafea', 'ceai', 'zahăr', 'sare', 'piper', 'condiment', 'ulei', 'oțet', 'făină', 'mălai', 'orez', 'paste', 'pâine', 'unt', 'lapte', 'brânză', 'cașcaval', 'iaurt', 'smântână', 'ou', 'carne', 'pui', 'porc', 'vită', 'pește', 'legume', 'roșie', 'castravete', 'ceapă', 'usturoi', 'cartof', 'morcov', 'ardei', 'varză', 'conopidă', 'brocoli', 'spanac', 'salată', 'fasole', 'mazăre', 'porumb', 'ciuperci', 'fructe', 'măr', 'pară', 'banană', 'portocală', 'lămâie', 'mandarină', 'struguri', 'pepene', 'căpșuni', 'cireșe', 'vișine', 'prune', 'caise', 'piersici', 'ananas', 'mango', 'kiwi', 'rodie', 'alune', 'nuci', 'migdale', 'fistic', 'ciocolată', 'bomboană', 'înghețată', 'prăjitură', 'biscuit', 'gogoașă', 'clătită', 'plăcintă', 'suc', 'apă', 'minerală', 'plată', 'limonadă', 'bere', 'vin', 'șampanie', 'cocktail', 'gheață', 'pai', 'pahare', 'toast', 'noroc', 'sănătate', 'viață', 'tinerete', 'bătrânețe', 'naștere', 'copilărie', 'adolescență', 'maturitate', 'trecut', 'prezent', 'viitor', 'orizont', 'infinit', 'absolut', 'perfecțiune', 'ideal', 'scop', 'țintă', 'obiectiv', 'vis', 'coșmar', 'somn', 'pat', 'pernă', 'pătură', 'plapumă', 'saltea', 'cearsaf', 'trezire', 'alarmă', 'cafea', 'rutină', 'gimnastică', 'sport', 'alergare', 'fotbal', 'baschet', 'tenis', 'volei', 'handbal', 'rugby', 'hochei', 'patinaj', 'schi', 'înot', 'ciclism', 'atletism', 'gimnastică', 'box', 'karate', 'judo', 'yoga', 'fitness', 'sală', 'antrenor', 'echipament', 'minge', 'plasă', 'poartă', 'teren', 'stadion', 'tribună', 'suporter', 'arbitru', 'scor', 'meci', 'repriză', 'prelungiri', 'penalty', 'fault', 'cartonaș', 'galben', 'roșu', 'eliminare', 'accidentare', 'medic', 'ambulanță', 'spital', 'farmacie', 'rețetă', 'pastilă', 'sirop', 'cremă', 'pansament', 'fașă', 'termometru', 'tensiometru', 'stetoscop', 'injecție', 'vaccin', 'tratament', 'vindecare', 'sănătate', 'energie', 'vitalitate', 'forță', 'putere', 'curaj', 'voință', 'ambiție', 'perseverență', 'răbdare', 'calm', 'pace', 'liniște', 'armonie', 'echilibru', 'stabilitate', 'siguranță', 'protecție', 'scut', 'armură', 'pază', 'gardă', 'alarmă', 'câine', 'pază', 'gard', 'poartă', 'lacăt', 'cheie', 'seif', 'comoară', 'aur', 'bijuterii', 'secret', 'mister', 'enigmă', 'ghicitoare', 'indiciu', 'detectiv', 'anchetă', 'caz', 'suspect', 'martor', 'dovadă', 'probă', 'amprentă', 'lupă', 'lanternă', 'noapte', 'întuneric', 'umbră', 'siluetă', 'pas', 'zgomot', 'șoaptă', 'frică', 'spaimă', 'groază', 'tensiune', 'suspans', 'frison', 'fior', 'emoție', 'uimire', 'surpriză', 'șoc', 'minune', 'miracol', 'magie', 'vrăjitorie', 'blestem', 'farmec', 'talisman', 'amuletă', 'noroc', 'destin', 'soartă', 'șansă', 'succes', 'glorie'];

function shuffleChars(chars) {
    const arr = [...chars];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function scrambleWord(word) {
    const scrambled = shuffleChars(word.split(''));
    const joined = scrambled.join('');
    return joined === word ? scrambleWord(word) : joined;
}

async function startScrambleGame(sock) {
    // FIX: was a raw Math.random() pick straight into SCRAMBLE_WORDS, so
    // the same word could come up again right away. Now uses the shared
    // no-repeat deck like every other word game.
    const word = pickNoRepeat('scramble', SCRAMBLE_WORDS);
    const scrambled = scrambleWord(word);
    activeScrambleGames.set(groupId, {
        word,
        scrambled,
        attemptsLeft: SCRAMBLE_MAX_ATTEMPTS
    });

    await botSend(sock, groupId, {
        text: `Cuvânt amestecat: *${scrambled}*\n\n${livesBar(SCRAMBLE_MAX_ATTEMPTS, SCRAMBLE_MAX_ATTEMPTS)}\n\nScrie răspunsul!`
    }, 'scramble');
}

async function handleScrambleGuess(sock, game, guess) {
    const normalizedGuess = normalizeText(guess);
    const normalizedWord = normalizeText(game.word);

    if (normalizedGuess === normalizedWord) {
        await botSend(sock, groupId, {
            text: `🎉 *Corect!* Cuvântul era *${game.word}* ❤️\n\nScrie *cupidon scramble* pentru un nou cuvânt!`
        }, 'scramble');
        activeScrambleGames.delete(groupId);
        return;
    }

    game.attemptsLeft--;
    if (game.attemptsLeft <= 0) {
        await botSend(sock, groupId, {
            text: `😅 Ai epuizat încercările. Cuvântul era *${game.word}*.\n\nScrie *cupidon scramble* pentru altă rundă!`
        }, 'scramble');
        activeScrambleGames.delete(groupId);
        return;
    }

    await botSend(sock, groupId, {
        text: `❌ Greșit!\n\n${livesBar(game.attemptsLeft, SCRAMBLE_MAX_ATTEMPTS)}`
    }, 'scramble');
}

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']; // index 1-6

async function startDiceGame(sock) {
    // FIX: raw Math.random() roll → could show the same face twice in a
    // row. Now drawn from a no-repeat deck of the 6 faces.
    const value = pickNoRepeat('dice', [1, 2, 3, 4, 5, 6]);
    await botSend(sock, groupId, {
        text: `${DICE_FACES[value]} Ai aruncat un *${value}*!\n\nScrie *cupidon dice* pentru altă aruncare!`
    }, 'diceGame');
}

async function startCoinFlipGame(sock) {
    // FIX: raw Math.random() > 0.5 → could show the same face twice in a
    // row. Now drawn from a no-repeat deck of the 2 faces.
    const result = pickNoRepeat('coin', ['Cap', 'Pajură']);
    await botSend(sock, groupId, {
        text: `🪙 Moneda se învârte...\n\nA ieșit: *${result}*!\n\nScrie *cupidon coin* pentru altă încercare!`
    }, 'coinGame');
}

async function startEightBallGame(sock) {
    const answers = [
        '💫 Da, sigur!',
        '🌙 Nu chiar acum.',
        '✨ Da, dar răbdare.',
        '🌈 Se pare că da.',
        '☁️ Mă îndoiesc.',
        '🌟 Concentrează-te și întreabă din nou.',
        '🔮 Fără îndoială, da!',
        '🍀 Semnele arată bine.',
        '🌊 Răspunsul e neclar acum, mai încearcă.',
        '⚡ Categoric, da!',
        '🌑 Nu conta pe asta.',
        '🕯️ Întreabă din nou mai târziu.'
    ];
    const answer = pickNoRepeat('eightball', answers);
    await botSend(sock, groupId, { text: answer }, 'eightball');
}

async function startSlotMachineGame(sock) {
    const icons = ['🍒', '🍋', '⭐', '🔔', '🍀', '💎'];
    // FIX: each reel used a plain Math.random() index, so all three reels
    // (and repeat spins) could clump on the same icons far more often
    // than a real slot machine would. Each reel now draws from its own
    // no-repeat deck.
    const reels = ['slot_reel1', 'slot_reel2', 'slot_reel3'].map(key => pickNoRepeat(key, icons));
    const [a, b, c] = reels;
    let result = '😅 Nu de data asta.';

    if (a === b && b === c) {
        result = '🎉 *Jackpot!* Super tare!';
    } else if (a === b || b === c || a === c) {
        result = '😄 Aproape!';
    }

    await botSend(sock, groupId, {
        text: `┃ ${a} ┃ ${b} ┃ ${c} ┃\n\n${result}\n\nScrie *cupidon slot* pentru altă rundă!`
    }, 'slotGame');
}

const activeHangmanGames = new Map();
const HANGMAN_MAX_WRONG = 6;
const HANGMAN_WORDS = ['dragoste', 'zambet', 'luna', 'cafea', 'plimbare', 'vis', 'stea', 'floare', 'caldura', 'poveste', 'iubire', 'bucurie', 'serbare', 'mister', 'magie', 'suflet', 'zapada', 'curcubeu', 'aventura', 'liniste', 'incredere', 'prietenie', 'fericire', 'sperante', 'amintire', 'castel', 'oglinda', 'comoara', 'fluture', 'ocean'];

function getHangmanDisplay(word, guessedLetters) {
    return word.split('').map(ch => (guessedLetters.has(ch) ? ch : '_')).join(' ');
}

async function startHangmanGame(sock) {
    // FIX: raw Math.random() pick → same word could reappear immediately.
    // Routed through the shared no-repeat deck.
    const word = pickNoRepeat('hangman', HANGMAN_WORDS);
    activeHangmanGames.set(groupId, {
        word,
        guessedLetters: new Set(),
        wrongGuesses: 0
    });

    await botSend(sock, groupId, {
        text: `Cuvânt: *${getHangmanDisplay(word, new Set())}*\n\n${livesBar(HANGMAN_MAX_WRONG, HANGMAN_MAX_WRONG)}\n\nScrie o literă sau cuvântul întreg.`
    }, 'hangman');
}

async function handleHangmanGuess(sock, game, guessText) {
    const guess = normalizeText(guessText);
    if (!guess) return;

    if (guess.length === 1 && /^[a-z]+$/.test(guess)) {
        if (game.guessedLetters.has(guess)) {
            await botSend(sock, groupId, { text: `⚠️ Ai încercat deja litera *${guess}*.` }, 'hangman');
            return;
        }

        game.guessedLetters.add(guess);
        if (game.word.includes(guess)) {
            const display = getHangmanDisplay(game.word, game.guessedLetters);
            if (display.replace(/\s/g, '').includes('_')) {
                await botSend(sock, groupId, { text: `✅ Litera *${guess}* este corectă!\n\nCuvânt: *${display}*` }, 'hangman');
            } else {
                await botSend(sock, groupId, { text: `🎉 *Corect!* Ai ghicit cuvântul *${game.word}*!` }, 'hangman');
                activeHangmanGames.delete(groupId);
            }
            return;
        }

        game.wrongGuesses += 1;
        if (game.wrongGuesses >= HANGMAN_MAX_WRONG) {
            await botSend(sock, groupId, { text: `😅 Ai epuizat greșelile. Cuvântul era *${game.word}*.` }, 'hangman');
            activeHangmanGames.delete(groupId);
            return;
        }

        await botSend(sock, groupId, { text: `❌ Litera *${guess}* nu se află în cuvânt.\n\n${livesBar(HANGMAN_MAX_WRONG - game.wrongGuesses, HANGMAN_MAX_WRONG)}` }, 'hangman');
        return;
    }

    if (guess === normalizeText(game.word)) {
        await botSend(sock, groupId, { text: `🎉 *Corect!* Ai ghicit cuvântul *${game.word}*!` }, 'hangman');
        activeHangmanGames.delete(groupId);
        return;
    }

    game.wrongGuesses += 1;
    if (game.wrongGuesses >= HANGMAN_MAX_WRONG) {
        await botSend(sock, groupId, { text: `😅 Ai epuizat greșelile. Cuvântul era *${game.word}*.` }, 'hangman');
        activeHangmanGames.delete(groupId);
        return;
    }

    await botSend(sock, groupId, { text: `❌ Greșit!\n\n${livesBar(HANGMAN_MAX_WRONG - game.wrongGuesses, HANGMAN_MAX_WRONG)}` }, 'hangman');
}

const activeAnagramGames = new Map();
const ANAGRAM_WORDS = ['pahar', 'luna', 'munca', 'soare', 'cerc', 'munte', 'carte', 'caini', 'frunze', 'suflet', 'gradina', 'stea', 'fluture', 'castel', 'poveste', 'zambet', 'liniste', 'noroc', 'vis', 'iarna', 'vara', 'toamna', 'primavara', 'oglinda', 'comoara'];

async function startAnagramGame(sock) {
    // FIX: raw Math.random() pick → same word could reappear immediately.
    const word = pickNoRepeat('anagram', ANAGRAM_WORDS);
    activeAnagramGames.set(groupId, { word });
    await botSend(sock, groupId, {
        text: `Găsește cuvântul din: *${scrambleWord(word)}*`
    }, 'anagram');
}

async function handleAnagramGuess(sock, game, guessText) {
    if (normalizeText(guessText) === normalizeText(game.word)) {
        await botSend(sock, groupId, { text: `🎉 *Corect!* Cuvântul era *${game.word}*!` }, 'anagram');
        activeAnagramGames.delete(groupId);
        return;
    }

    await botSend(sock, groupId, { text: `❌ Greșit, mai încearcă!` }, 'anagram');
}

const activeEmojiQuizGames = new Map();
const EMOJI_QUIZ_ITEMS = [
    { emoji: '💖', answer: 'dragoste' },
    { emoji: '🌙', answer: 'noapte' },
    { emoji: '☀️', answer: 'soare' },
    { emoji: '🍕', answer: 'pizza' },
    { emoji: '🎵', answer: 'muzica' },
    { emoji: '🧁', answer: 'prajitura' },
    { emoji: '🌧️', answer: 'ploaie' },
    { emoji: '🔥', answer: 'foc' },
    { emoji: '❄️', answer: 'zapada' },
    { emoji: '🌈', answer: 'curcubeu' },
    { emoji: '⭐', answer: 'stea' },
    { emoji: '🏖️', answer: 'plaja' },
    { emoji: '📚', answer: 'carte' },
    { emoji: '☕', answer: 'cafea' },
    { emoji: '🎂', answer: 'tort' },
    { emoji: '🎈', answer: 'balon' },
    { emoji: '🚗', answer: 'masina' },
    { emoji: '✈️', answer: 'avion' },
    { emoji: '🏠', answer: 'casa' },
    { emoji: '🎬', answer: 'film' }
];

async function startEmojiQuizGame(sock) {
    // FIX: raw Math.random() pick → same emoji could reappear immediately.
    const item = pickNoRepeat('emojiquiz', EMOJI_QUIZ_ITEMS);
    activeEmojiQuizGames.set(groupId, { answer: item.answer });
    await botSend(sock, groupId, {
        text: `Ce cuvânt reprezintă ${item.emoji}?\nScrie răspunsul!`
    }, 'emojiquiz');
}

async function handleEmojiQuizGuess(sock, game, guessText) {
    if (normalizeText(guessText) === normalizeText(game.answer)) {
        await botSend(sock, groupId, { text: `🎉 Corect!` }, 'emojiquiz');
        activeEmojiQuizGames.delete(groupId);
        return;
    }
    await botSend(sock, groupId, { text: `❌ Greșit, mai încearcă!` }, 'emojiquiz');
}

const activeMathGames = new Map();
const active100Game = new Map();

async function startMathQuizGame(sock) {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let answer = 0;
    let expression = `${a} ${op} ${b}`;
    if (op === '+') answer = a + b;
    if (op === '-') answer = a - b;
    if (op === '*') answer = a * b;

    activeMathGames.set(groupId, { answer });
    await botSend(sock, groupId, {
        text: `Rezolvă: *${expression}*\nScrie răspunsul!`
    }, 'mathquiz');
}

async function handleMathGuess(sock, game, guessText) {
    const guess = Number(guessText);
    if (!Number.isNaN(guess) && guess === game.answer) {
        await botSend(sock, groupId, { text: `🎉 Corect!` }, 'mathquiz');
        activeMathGames.delete(groupId);
        return;
    }
    await botSend(sock, groupId, { text: `❌ Greșit, mai încearcă!` }, 'mathquiz');
}

const activeColorGames = new Map();
const COLOR_ITEMS = [
    { emoji: '🔴', answer: 'rosu' },
    { emoji: '🔵', answer: 'albastru' },
    { emoji: '🟢', answer: 'verde' },
    { emoji: '🟡', answer: 'galben' },
    { emoji: '🟣', answer: 'mov' },
    { emoji: '⚪', answer: 'alb' },
    { emoji: '⚫', answer: 'negru' },
    { emoji: '🟠', answer: 'portocaliu' },
    { emoji: '🟤', answer: 'maro' },
    { emoji: '🩷', answer: 'roz' }
];

async function startColorGame(sock) {
    // FIX: raw Math.random() pick → same color could reappear immediately.
    const item = pickNoRepeat('colorguess', COLOR_ITEMS);
    activeColorGames.set(groupId, { answer: item.answer });
    await botSend(sock, groupId, {
        text: `Care culoare este ${item.emoji}?\nScrie răspunsul!`
    }, 'colorguess');
}

async function handleColorGuess(sock, game, guessText) {
    if (normalizeText(guessText) === normalizeText(game.answer)) {
        await botSend(sock, groupId, { text: `🎉 Corect!` }, 'colorguess');
        activeColorGames.delete(groupId);
        return;
    }
    await botSend(sock, groupId, { text: `❌ Greșit, mai încearcă!` }, 'colorguess');
}

const activeTriviaGames = new Map();
const TRIVIA_QUESTIONS = [
    { question: 'Care este capitala României?', answer: 'bucuresti' },
    { question: 'Ce planetă este cunoscută ca planeta roșie?', answer: 'marte' },
    { question: 'Care este cel mai mare ocean de pe Pământ?', answer: 'pacific' },
    { question: 'Cine a scris Romeo și Julieta?', answer: 'shakespeare' },
    { question: 'Ce anotimp vine după iarnă?', answer: 'primavara' },
    { question: 'Câte zile are un an obișnuit?', answer: '365' },
    { question: 'Ce culoare rezultă din amestecul albastru cu galben?', answer: 'verde' },
    { question: 'Cel mai înalt munte din lume?', answer: 'everest' },
    { question: 'Câte continente sunt pe Pământ?', answer: '7' },
    { question: 'Ce animal este simbolul înțelepciunii?', answer: 'bufnita' },
    { question: 'Ce limbă se vorbește în Franța?', answer: 'franceza' },
    { question: 'Câte litere are alfabetul român?', answer: '31' },
    { question: 'Ce organ pompează sângele în corp?', answer: 'inima' },
    { question: 'Cea mai mare țară din lume ca suprafață?', answer: 'rusia' },
    { question: 'Ce gaz respirăm ca să trăim?', answer: 'oxigen' },
    { question: 'Câte zile are luna februarie într-un an bisect?', answer: '29' },
    { question: 'Ce simbol chimic are apa?', answer: 'h2o' },
    { question: 'Ce insectă produce miere?', answer: 'albina' },
    { question: 'Care este cea mai mică planetă din sistemul solar?', answer: 'mercur' },
    { question: 'Ce sărbătoare se ține pe 1 decembrie în România?', answer: 'ziua nationala' }
];

async function startTriviaGame(sock) {
    // FIX: raw Math.random() pick → same question could reappear immediately.
    const item = pickNoRepeat('trivia', TRIVIA_QUESTIONS);
    activeTriviaGames.set(groupId, { answer: item.answer });
    await botSend(sock, groupId, {
        text: `${item.question}\nScrie răspunsul!`
    }, 'trivia');
}

async function handleTriviaGuess(sock, game, guessText) {
    if (normalizeText(guessText) === normalizeText(game.answer)) {
        await botSend(sock, groupId, { text: `🎉 Corect!` }, 'trivia');
        activeTriviaGames.delete(groupId);
        return;
    }
    await botSend(sock, groupId, { text: `❌ Greșit, mai încearcă!` }, 'trivia');
}

const activeAnimalGames = new Map();

const ANIMAL_QUIZ_ITEMS = [
    { emoji: '🐶', answer: 'caine' },
    { emoji: '🐱', answer: 'pisica' },
    { emoji: '🐸', answer: 'broasca' },
    { emoji: '🦊', answer: 'vulpe' },
    { emoji: '🐘', answer: 'elefant' },
    { emoji: '🦁', answer: 'leu' },
    { emoji: '🐵', answer: 'maimuta' },
    { emoji: '🐨', answer: 'koala' },
    { emoji: '🐧', answer: 'pinguin' },
    { emoji: '🐢', answer: 'broasca testoasa' },
    { emoji: '🐴', answer: 'cal' },
    { emoji: '🐮', answer: 'vaca' },
    { emoji: '🐷', answer: 'porc' },
    { emoji: '🐔', answer: 'gaina' },
    { emoji: '🐦', answer: 'pasare' },
    { emoji: '🐟', answer: 'peste' },
    { emoji: '🦋', answer: 'fluture' },
    { emoji: '🐌', answer: 'melc' },
    { emoji: '🦒', answer: 'girafa' },
    { emoji: '🐆', answer: 'leopard' },
    { emoji: '🐻', answer: 'urs' },
    { emoji: '🐰', answer: 'iepure' },
    { emoji: '🦄', answer: 'unicorn' },
    { emoji: '🐉', answer: 'dragon' },
    { emoji: '🐍', answer: 'sarpe' },
    { emoji: '🐊', answer: 'crocodil' },
    { emoji: '🦈', answer: 'rechin' },
    { emoji: '🐳', answer: 'balena' },
    { emoji: '🐙', answer: 'caracatita' },
    { emoji: '🦀', answer: 'rac' },
    { emoji: '🐝', answer: 'albinuta' },
    { emoji: '🐜', answer: 'furnica' },
    { emoji: '🦗', answer: 'greier' },
    { emoji: '🐞', answer: 'buburuza' },
    { emoji: '🦩', answer: 'flamingo' },
    { emoji: '🦅', answer: 'vultur' },
    { emoji: '🦉', answer: 'bufnita' },
    { emoji: '🐿️', answer: 'veverita' },
    { emoji: '🦔', answer: 'arici' },
    { emoji: '🐁', answer: 'soarece' },
    { emoji: '🐀', answer: 'sobolan' },
    { emoji: '🐪', answer: 'camila' },
    { emoji: '🦙', answer: 'lama' },
    { emoji: '🐫', answer: 'camila cu doua cocoase' },
    { emoji: '🦏', answer: 'rinocer' },
    { emoji: '🐃', answer: 'bivol' },
    { emoji: '🐂', answer: 'taur' }
];

async function startAnimalGame(sock) {
    // FIX: raw Math.random() pick → same animal could reappear immediately.
    const item = pickNoRepeat('animalguess', ANIMAL_QUIZ_ITEMS);
    activeAnimalGames.set(groupId, { answer: item.answer });
    await botSend(sock, groupId, {
        text: `Ce animal este ${item.emoji}?\nScrie răspunsul!`
    }, 'animalguess');
}

async function handleAnimalGuess(sock, game, guessText) {
    if (normalizeText(guessText) === normalizeText(game.answer)) {
        await botSend(sock, groupId, { text: `🎉 Corect!` }, 'animalguess');
        activeAnimalGames.delete(groupId);
        return;
    }
    await botSend(sock, groupId, { text: `❌ Greșit, mai încearcă!` }, 'animalguess');
}

// ============================================================
// Generic router for all list/button interactive responses
// ============================================================

async function handleInteractiveButton(sock, buttonId) {
    if (buttonId.startsWith('ttt_')) {
        await handleTicTacToeButton(sock, buttonId);
        return;
    }
    if (buttonId.startsWith('rps_')) {
        await handleRpsChoice(sock, buttonId);
        return;
    }
    if (buttonId.startsWith('quiz_')) {
        await handleQuizAnswer(sock, buttonId);
        return;
    }
    if (buttonId.startsWith('settings_')) {
        await handleSettingsButton(sock, buttonId);
        return;
    }
    console.log('⚠️ Buton necunoscut, ignorat:', buttonId);
}

function buildRelationshipMessage(type) {
    const pick = (arr, key) => pickNoRepeat(key, arr);

    const relationshipPool = [

        '💕 E ceva minunat între voi, păstrați acea scânteie.',
        '🌟 Dragostea voastră radiază căldură și bunătate.',
        '💞 Fiecare zi împreună aduce o nouă amintire frumoasă.',
        '🌹 Vă completați unul pe celălalt în moduri neașteptate.',
        '✨ Chimia voastră e vizibilă pentru toți cei din jur.',
        '💖 Apreciați micile gesturi — acestea construiesc relația.',
        '🥰 Sunteți un cuplu plin de tandrețe și înțelegere.',
        '🌈 Relația voastră aduce culoare în viețile voastre.',
        '🌙 Dragostea voastră luminează chiar și nopțile grele.',
        '🎁 Fiecare zi împreună este un cadou prețios.',
        '🕊️ Există o pace frumoasă între voi doi.',
        '🔥 Pasiunea încă arde și aduce zâmbete reale.',
        '🏆 Sunteți o echipă puternică — susțineți-vă mereu.',
        '💬 Comunicați deschis — acesta este atuul vostru.',
        '🌿 Creșteți împreună, nu unul împotriva celuilalt.',
        '🎨 Relația voastră e o operă de artă în evoluție.',
        '🍀 Aveți norocul de a vă regăsi unul pe celălalt.',
        '📚 Fiecare zi scrie o pagină nouă în povestea voastră.',
        '💡 Vă inspirați reciproc să fiți mai buni.',
        '🧭 Mergeți pe același drum, ținându-vă de mână.',
        '🛡️ Vă protejați reciproc cu grijă și respect.',
        '🌻 Zâmbetele voastre sunt contagioase și pline de căldură.',
        '🎶 Aveți o melodie a voastră — ascultați-o des.',
        '🔒 Încrederea voastră e baza solidă a relației.',
        '🌟 Continuați să cultivați micile obiceiuri care vă apropie.',
        '💐 Gesturile mici spun mai mult decât cuvintele.',
        '🏡 Împreună creați un loc care se numește „acasă”.',
        '🌅 Fiecare apus alături de tine e o amintire blândă.',
        '🧸 Simplitatea vă face fericiți — prețuiți-o.',
        '🔭 Privim spre viitor cu speranță și curaj.',
        '🎯 Aveți valori comune care vă țin uniți.',
        '💫 Momentul vostru e acum — bucurați-vă de el.',
        '🧩 Sunteți piesele care se potrivesc perfect.',
        '🍷 Savurați clipele — ele devin aur mai târziu.',
        '🚀 Împreună puteți atinge lucruri mari.',
        '🕰️ Trecutul vă întărește, prezentul vă bucură.',
        '💌 Dragostea voastră e scrisă cu sinceritate.',
        '🌬️ Respiră adânc și lasă iubirea să te învăluie.',
        '🏖️ Fiecare escapadă mică devine o aventură memorabilă.',
        '🌁 Chiar și în ceață, voi găsiți drumul unul către celălalt.',
        '🧁 Dulceața voastră vine din atenția la detalii.',
        '📸 Faceți amintiri care merită tipărite.',
        '🛶 Plutiți împreună, chiar și când valurile sunt mari.',
        '🌼 Iubirea voastră e blândă și persistentă.',
        '🏡 Construiți un cămin plin de povești și râsete.',
        '🎈 Râdeți mult — asta vă păstrează tinerețea.',
        '🧭 Când vă pierdeți, regăsiți-vă în privire.',
        '🎇 Fiecare aniversare e o scânteie nouă.',
        '🙏 Mulțumiți pentru ceea ce aveți și creșteți-l.',
        '⚓ Sunteți ancora unul pentru celălalt.',
        '🌺 În fiecare zi găsiți ceva nou de admirat la celălalt.',
        '💞 Afecțiunea voastră face lumea mai bună.',
        '🌟 Vă susțineți visele și proiectele cu dăruire.',
        '🕯️ Momentele liniștite vă apropie mai mult decât zgomotul.',
        '📖 Povestea voastră merită citită cu dragoste.',
        '🌻 Împărtășiți speranțe și temeri cu aceeași vulnerabilitate.',
        '🎨 Creați tradiții mici, dar pline de sens.',
        '🍃 Respirați împreună și lăsați grijile la o parte.',
        '🏞️ Fiecare drum parcurs împreună devine o amintire.',
        '🧭 Găsiți mereu calea înapoi la voi.',
        '💎 Iubirea voastră e rară și prețioasă.'
    ];

    const memoryPool = [
        '🧠 Amintire: fiecare clipă cu tine devine o comoară pe care o păstrez în inima mea.',
        '📸 Amintire preferată: zâmbetul tău la cea mai simplă glumă.',
        '🌅 Amintire: plimbarea la apus când lumea părea doar a noastră.',
        '🎶 Amintire: melodia care ne-a legat pentru prima dată.',
        '☕ Amintire: o cafea împărțită când timpul stătea pe loc.',
        '🌙 Amintire: nopțile lungi în care vorbeam despre tot.',
        '🕯️ Amintire: prima dată când v-ați ținut de mână.',
        '🏖️ Amintire: nisipul între degete și râsetele voastre.',
        '📚 Amintire: scrisoarea aceea mică păstrată pe masă.',
        '🌠 Amintire: steaua căzătoare care v-a adus noroc.'
    ];

    const firstdatePool = [
        '💘 Prima întâlnire ideală: o plimbare la apus, o cafea caldă și multă vorbă sinceră.',
        '🌅 Prima întâlnire: un apus la malul apei și două inimi curioase.',
        '☕ Prima întâlnire: o cafenea mică, vorbe sincere și zâmbete reale.',
        '🎡 Prima întâlnire: o plimbare la târg și fericire simplă.',
        '🍽️ Prima întâlnire: cină la lumina lumânărilor, fără grabă.',
        '🚶 Prima întâlnire: o plimbare urbană, cu glume și confesiuni mici.',
        '🎨 Prima întâlnire: o expoziție liniștită și o conversație sinceră.',
        '🎬 Prima întâlnire: un film drăguț și popcorn împărțit.',
        '🌳 Prima întâlnire: picnic în parc și priviri lungi.',
        '🛶 Prima întâlnire: o plimbare cu barca și multă liniște.'
    ];

    const anniversaryPool = [
        '🎉 Aniversare: fiecare zi cu tine este un motiv de bucurie și de mulțumire.',
        '🎂 La mulți ani vouă — încă un capitol frumos împreună.',
        '🌟 Aniversare: sărbătoriți ce ați construit împreună cu mândrie.',
        '💝 Aniversare: iubirea voastră devine mai puternică cu timpul.',
        '🍾 Aniversare: ridicați un pahar pentru toate clipele frumoase.',
        '🕯️ Aniversare: lumina relației voastre încălzește suflete.',
        '🌹 Aniversare: amintirile voastre merită să fie celebrate cu delicatețe.',
        '🎁 Aniversare: surprindeți-vă cu ceva mic, dar semnificativ.',
        '💌 Aniversare: scrieți-vă unul altuia un mesaj din inimă.',
        '✨ Aniversare: încă un an de creștere și tandrețe.'
    ];

    if (type === 'lovemeter') {
        const pct = Math.floor(Math.random() * 41) + 60;
        const note = pick(['pare să fie o combinație foarte bună', 'chimia este evidentă', 'există mult potențial între voi', 'se simte sincer și cald'], 'lovemeter_note');
        return `💖 *${pct}%* — ${note}!`;
    }

    if (type === 'compatibility') {
        const pct = Math.floor(Math.random() * 41) + 60;
        const note = pick(['sunteți foarte complementari', 'aveți valori aliniate', 'înțelegerea e la un nivel înalt', 'potențial de lungă durată'], 'compatibility_note');
        return `💞 *${pct}%* — ${note}!`;
    }

    if (type === 'memory') {
        return pick(memoryPool, 'memory');
    }

    if (type === 'firstdate') {
        return pick(firstdatePool, 'firstdate');
    }

    if (type === 'anniversary') {
        return pick(anniversaryPool, 'anniversary');
    }

    if (type === 'countdown') {
        return getCountdownMessage();
    }

    return pick(relationshipPool, 'relationship');
}

const imaginePool = [
    'Imaginează-ți că ești pe-un câmp de iarbă cu persoana iubită, vântul adie lin și vă priviți fără să spuneți nimic, pentru că totul e deja spus în ochii voștri.',
    'Imaginează-ți că stați sub un copac bătrân, voi doi îmbrățișați, și ascultați cântecul greierilor până când stelele apar una câte una.',
    'Imaginează-ți că plouă ușor și voi dansați desculți prin bălți, râzând ca doi copii, fără griji și fără grabă.',
    'Imaginează-ți o seară la malul mării: foc de tabără, două pălării, și promisiunea că nu vă veți da drumul.',
    'Imaginează-ți o plimbare la munte, cu rucsac mic și inimi mari; vă țineți de mână și nimic nu pare prea greu.',
    'Imaginează-ți că stați pe o plajă pustie la apus și vă promiteți că veți reveni mereu împreună.',
    'Imaginează-ți o casă mică la țară, ferestre larg deschise și miros de pâine caldă — voi doi lângă sobă, zâmbind.',
    'Imaginează-ți o dimineață leneșă în pat: cafea, cearșafuri răsucite și discuții până târziu.',
    'Imaginează-ți o noapte sub cerul liber, cortul vostru, povești și un milion de stele care par create pentru voi.',
    'Imaginează-ți o plimbare cu barca pe lac, doar voi doi și apa care vă leagănă încet.',
    'Imaginează-ți o scrisoare găsită în buzunarul hainei — cu cuvinte blânde care vă amintesc de începuturi.',
    'Imaginează-ți o dimineață cu miros de ploaie și un mic dejun pregătit în doi, simplu și delicios.',
    'Imaginează-ți o surpriză: un bilețel ascuns sub pernă cu „Te iubesc” scris de mână.',
    'Imaginează-ți o seară de iarnă: foc în sobă, pături groase și brațele persoanei dragi care încălzesc mai mult decât focul.',
    'Imaginează-ți un început de primăvară, copacii înflorind și voi plimbându-vă printre petale căzute.',
    'Imaginează-ți că vă regăsiți la același loc unde v-ați cunoscut, iar totul pare și mai frumos acum.',
    'Imaginează-ți un apus într-un oraș străin, ținându-vă de mână și simțind că sunteți acasă oriunde sunteți împreună.',
    'Imaginează-ți că alergați printr-un lan de grâu, râzând și uitând de timp pentru câteva minute magice.',
    'Imaginează-ți o seară cu vin, muzică veche și amintiri spuse la lumina lămpii.',
    'Imaginează-ți două umbre împletite pe peretele unei camere liniștite, un semn că apartineți unul altuia.',
    'Imaginează-ți o furtună afară și voi înăuntru, construind un fort din perne și lenevind.',
    'Imaginează-ți că scrieți împreună o listă de vise și bifați una câte una, cu entuziasm.',
    'Imaginează-ți o călătorie spontană cu mașina, fără hartă, doar muzică și ochi care se întâlnesc din când în când.',
    'Imaginează-ți o grădină secretă unde vă ascundeți de lume și vă spuneți secrete blânde.',
    'Imaginează-ți o plimbare urbană sub luminile orașului, ținându-vă de mână ca la prima întâlnire.',
    'Imaginează-ți o carte citită împreună, două voci care alcătuiesc aceeași poveste.' ,
    'Imaginează-ți picnic pe o pajiște cu brânzeturi, fructe și o pătură albastră — simplitate pură.',
    'Imaginează-ți o zi de vară cu biciclete, oprindu-vă la fiecare colț pentru o înghețată.' ,
    'Imaginează-ți că vă pierdeți într-un oraș vechi și găsiți cea mai frumoasă cafenea ascunsă.',
    'Imaginează-ți o noapte de karaoke acasă, două voci, multe râsete și multă tandrețe.',
    'Imaginează-ți o zi leneșă cu ploaie afară și serial preferat în buclă, cu popcorn și îmbrățișări.',
    'Imaginează-ți o promenadă pe un copac acoperit de flori și o fotografie făcută doar pentru voi.',
    'Imaginează-ți o cină gătită în doi, cu rețete încercate pentru prima dată și gust de victorie.',
    'Imaginează-ți un concert sub cerul liber unde vă țineți de mână și cântați refrenele împreună.',
    'Imaginează-ți că vă plimbați printr-o piață de vechituri și găsiți o comoară ascunsă care vă amintește de cineva drag.',
    'Imaginează-ți o escapadă de weekend într-un sat pitoresc, fără planuri, doar timp pentru voi.',
    'Imaginează-ți o sesiune foto improvizată, simple cadre care devin amintiri prețioase.',
    'Imaginează-ți o seară cu lumânări, muzică lentă și declarații spuse șoptit.',
    'Imaginează-ți un balon cu aer cald la răsărit, privind lumea de sus, ținându-vă strâns.',
    'Imaginează-ți o plimbare pe malul râului la amurg, cu mâinile împletite și pași sincronizați.',
    'Imaginează-ți o plimbare cu telecabina, două siluete care se ating doar cu privirea.',
    'Imaginează-ți o vizită la o bibliotecă veche, răsfoind cărți vechi și găsind fragmente de poezie.',
    'Imaginează-ți un atelier creativ unde pictați o pânză comună, culoare peste culoare, povești peste povești.',
    'Imaginează-ți o revenire la locurile copilăriei, ținându-vă de mână ca niște exploratori.',
    'Imaginează-ți o plimbare printr-un parc de toamnă, frunzele foșnind sub pași și zâmbete calde.',
    'Imaginează-ți o sesiune de gătit târziu în noapte, cu lumini mici și aromă de scorțișoară.',
    'Imaginează-ți o cafea la fereastra unei tale preferate, privind lumea și știind că e mai frumoasă alături de el/ea.',
    'Imaginează-ți că găsești bilete pentru o călătorie surpriză și plecați mâine la prima oră, cu valiza pregătită.',
    'Imaginează-ți o seară în care vă scrieți mesaje de recunoștință unul altuia și le citiți cu voce tare.',
    'Imaginează-ți un loc pierdut în munți, unde singurul sunet e al vântului și a inimilor care bat liniștit.',
    'Imaginează-ți că vă întâlniți din nou după un timp și totul e ca înainte, poate chiar mai bun.'
];

function buildImagineMessage() {
    return pickNoRepeat('imagine', imaginePool);
}

function getRandomImagePayload(text, folderPath = null) {
    const candidates = [];
    if (folderPath) candidates.push(folderPath);
    candidates.push(path.join(__dirname, 'images'), __dirname);

    let files = [];
    for (const candidate of candidates) {
        if (!fs.existsSync(candidate)) continue;
        const found = fs.readdirSync(candidate)
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
        if (found.length > 0) {
            files = found.map(file => path.join(candidate, file));
            break;
        }
    }

    if (files.length === 0) {
        return null;
    }

    // No-repeat draw for images too, keyed by folder path
    const randomFile = pickNoRepeat(`img:${folderPath || 'default'}`, files);
    const ext = path.extname(randomFile).toLowerCase();
    const mimetype = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';

    return {
        image: fs.readFileSync(randomFile),
        caption: text,
        mimetype
    };
}

// ====================== MESAJE TIMP ÎMPREUNĂ ======================

const weeklyMessages = [
    "❤️ Am mai trecut împreună încă o săptămână plină de dragoste. Mulțumesc că ești lângă mine, dragostea mea.",
    "🌹 O săptămână în plus alături de tine... fiecare zi devine tot mai frumoasă datorită zâmbetului tău.",
    "💞 Am mai bifat o săptămână din povestea noastră. Te iubesc din ce în ce mai mult.",
    "✨ Încă o săptămână în care inima mea a bătut doar pentru tine. Ești tot ce-mi doresc.",
    "🕊️ Am mai trecut o săptămână împreună. Fiecare moment cu tine e un dar prețios.",
    "🌙 Mulțumesc că ai fost alături de mine încă o săptămână. Te iubesc din tot sufletul.",
    "💖 O săptămână în plus în care am avut norocul să te am pe tine. Ești minunea mea.",
    "🌸 Am mai adăugat o pagină frumoasă împreună. Te aleg în fiecare săptămână, mereu.",
    "🥰 Încă o săptămână de zâmbete, îmbrățișări și dragoste. Nu-mi doresc nimic altceva.",
    "🌟 Ai trecut cu mine încă o săptămână. Ești cea mai frumoasă parte din viața mea.",
    "💕 O săptămână în plus în care dragostea noastră a crescut și mai mult. Te ador.",
    "🌹 Mulțumesc pentru încă o săptămână minunată alături de tine, iubirea mea eternă.",
    "🍀 Încă șapte zile în care ai fost norocul meu cel mai mare.",
    "🌷 O săptămână care a trecut prea repede pentru că am fost fericiți."
];

const monthlyMessages = [
    "❤️ Am mai trecut împreună încă o lună... timpul zboară când sunt cu tine.",
    "🌹 O lună în plus în care te-am iubit și mai tare. Ești lumina vieții mele.",
    "💞 Am mai bifat o lună din povestea noastră de dragoste. Te iubesc enorm.",
    "✨ Încă o lună în care ai făcut fiecare zi mai frumoasă. Mulțumesc că exiști.",
    "🕊️ O lună în plus alături de tine e mai valoroasă decât tot aurul din lume.",
    "🌙 Am mai trecut o lună împreună și inima mea e tot mai plină de tine.",
    "💖 O lună în care dragostea noastră a devenit și mai puternică. Te aleg mereu.",
    "🌸 Ai stat cu mine încă o lună. Fiecare zi cu tine e un motiv de fericire.",
    "🥰 Mulțumesc pentru încă o lună minunată. Ești cea mai frumoasă parte din mine.",
    "🌟 O lună în plus în care am avut norocul să te strâng în brațe. Te iubesc.",
    "💕 Am mai trecut o lună și dragostea mea pentru tine continuă să crească.",
    "🌹 Încă o lună alături de tine... și aș vrea să fie o viață întreagă.",
    "🍀 Încă treizeci de zile în care ai fost cel mai bun lucru din viața mea.",
    "🌷 O lună întreagă de zâmbete și amintiri care merită păstrate pentru totdeauna."
];

const yearlyMessages = [
    "❤️ Am mai trecut împreună încă un an... și te iubesc mai mult ca niciodată.",
    "🌹 Un an în plus în care ai fost cea mai frumoasă parte din viața mea.",
    "💞 Am mai bifat un an din povestea noastră. Ești dragostea vieții mele.",
    "✨ Un an alături de tine a însemnat mii de motive să fiu fericit.",
    "🕊️ Am mai trecut un an împreună și nu-mi doresc nimic altceva decât să continuăm.",
    "🌙 Un an în care ai luminat fiecare zi. Te iubesc din tot sufletul.",
    "💖 Mulțumesc că ai stat cu mine încă un an. Ești darul meu cel mai prețios.",
    "🌸 Am mai adăugat un an frumos împreună. Vreau să îmbătrânim împreună.",
    "🥰 Un an în plus în care dragostea noastră a devenit legendă.",
    "🌟 Ai trecut cu mine încă un an. Fiecare zi cu tine e un miracol.",
    "💕 Un an mai târziu și te iubesc la fel de intens ca la început, poate chiar mai mult.",
    "🌹 Am mai bifat un an din eternitatea noastră. Te voi iubi pentru totdeauna.",
    "🍀 Un an întreg care a trecut ca o clipă frumoasă alături de tine.",
    "🌷 Încă un an în care alegerea mea de fiecare zi ai rămas tu."
];

// ====================== COMENZI ======================

async function sendMilestoneMessage(sock, type) {
    let messages;
    let title;

    if (type === 'sapt' || type === 'saptamana') {
        messages = weeklyMessages;
        title = '💖 O săptămână împreună';
    } else if (type === 'luna') {
        messages = monthlyMessages;
        title = '🌹 O lună împreună';
    } else if (type === 'an') {
        messages = yearlyMessages;
        title = '❤️ Un an împreună';
    } else {
        // FIX: unrecognized type used to leave `messages`/`title` undefined
        // and crash on `messages.length` below. Falls back to the weekly
        // pool instead of throwing.
        messages = weeklyMessages;
        title = '💖 Repere';
        type = 'sapt';
    }

    // FIX: raw Math.random() pick → same milestone message could reappear
    // immediately. Routed through the shared no-repeat deck.
    const randomMsg = pickNoRepeat(`milestone_${type}`, messages);

    await botSend(sock, groupId, {
        text: `*${title}*\n\n${randomMsg}\n\nTe iubesc mult, Stefania ❤️`
    }, 'milestone');
}

async function sendTextWithImage(sock, text, type = 'general', folderPath = null) {
    const imagePayload = getRandomImagePayload(text, folderPath);
    if (imagePayload) {
        await trackSendMessage(sock, groupId, {
            ...imagePayload,
            caption: text
        });
        return;
    }

    await botSend(sock, groupId, { text }, type);
}

async function sendImageFromFolder(sock, folderPath, caption = '', jid = groupId) {
    const imagePayload = getRandomImagePayload(caption, folderPath);
    if (!imagePayload) return false;

    await trackSendMessage(sock, jid, {
        ...imagePayload,
        caption
    });
    return true;
}

async function trackSendMessage(sock, jid, payload) {
    const result = await sock.sendMessage(jid, payload);
    if (result?.key?.id) botSentIds.add(result.key.id);
    return result;
}

async function botSend(sock, jid, content, type = 'general') {
    const payload = { ...content };
    if (payload.text && typeof payload.text === 'string') {
        payload.text = decorateMessage(payload.text, type);
    }
    return trackSendMessage(sock, jid, payload);
}

function armRiddleTimeout(sock) {
    if (riddleTimeout) clearTimeout(riddleTimeout);
    riddleTimeout = setTimeout(async () => {
        if (currentRiddle) {
            await botSend(sock, groupId, {
                text: `⏰ Timpul a expirat!\nRăspunsul era: *${currentRiddle.answer}* ❤️`
            }, 'riddle');
            currentRiddle = null;
            wrongAnswerCount = 0;
        }
    }, riddleTimeoutMs());
}

async function sendCommandReply(sock, type) {
    const text = buildSimpleMessage(type);
    await botSend(sock, groupId, { text }, type);
    if (currentRiddle) armRiddleTimeout(sock);
}

function clearPidFile() {
    try {
        if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    } catch (error) {
        // ignore cleanup failures
    }
}

function writePidFile() {
    try {
        fs.writeFileSync(pidFile, String(process.pid));
    } catch (error) {
        console.log('⚠️ Nu s-a putut scrie fișierul PID:', error.message);
    }
}

function stopPreviousBotInstance() {
    if (!fs.existsSync(pidFile)) return;
    try {
        const oldPid = Number(fs.readFileSync(pidFile, 'utf8').trim());
        if (Number.isInteger(oldPid) && oldPid > 0 && oldPid !== process.pid) {
            try {
                process.kill(oldPid);
            } catch (error) {
                if (error.code !== 'ESRCH') {
                    console.log('⚠️ Nu s-a putut opri instanța anterioară:', error.message);
                }
            }
        }
    } catch (error) {
        // ignore if the pid file is stale or unreadable
    }
    clearPidFile();
}

function restartWithFreshAuth(authDir) {
    try {
        fs.mkdirSync(authDir, { recursive: true });
        for (const entry of fs.readdirSync(authDir)) {
            fs.rmSync(path.join(authDir, entry), { recursive: true, force: true });
        }
    } catch (error) {
        console.log('⚠️ Nu s-a putut reseta folderul de auth pentru restart:', error.message);
    }

    stopPreviousBotInstance();

    console.log('🔄 Se resetează sesiunea WhatsApp și se pornește o nouă instanță...');
    const child = spawn(process.execPath, [path.join(__dirname, 'bot.js')], {
        cwd: __dirname,
        detached: true,
        stdio: 'inherit',
        env: { ...process.env, AUTH_DIR: authDir }
    });
    child.unref();

    child.on('error', (error) => {
        console.log('⚠️ Nu s-a putut porni noua instanță:', error.message);
    });

    process.exit(0);
}

async function startBot() {
    const AUTH_DIR = process.env.AUTH_DIR || 'auth';
    stopPreviousBotInstance();
    writePidFile();
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Always fetch the latest WhatsApp Web protocol version.
    // Baileys reverse-engineers WhatsApp's protocol, so using a stale
    // hardcoded version is one of the most common causes of 401/405
    // "Connection Failure" errors right after WhatsApp updates.
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`ℹ️ Folosesc WA v${version.join('.')}, este ultima versiune: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false,
        shouldIgnoreJid: jid => jid?.includes('broadcast')
    });

    sock.ev.on('creds.update', saveCreds);

    const handleShutdown = async (signal) => {
        if (shutdownAnnounced) {
            process.exit(0);
            return;
        }
        shutdownAnnounced = true;
        console.log(`🛑 Se primește oprirea (${signal})...`);
        try {
            if (sock && sock.user && sock.sendMessage) {
                await botSend(sock, groupId, { text: `😴 Cupidon pleacă, ne vedem data viitoare!` });
            } else {
                console.log('⚠️ Socket nu e conectat, nu se trimite mesajul de închidere.');
            }
        } catch (error) {
            console.log('⚠️ Nu s-a putut trimite mesajul de închidere:', error.message);
        }
        process.exit(0);
    };

    process.once('SIGINT', () => handleShutdown('SIGINT'));
    process.once('SIGTERM', () => handleShutdown('SIGTERM'));
    process.once('exit', () => clearPidFile());

    let botStartupTimestamp = Math.floor(Date.now() / 1000);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr, pairingCode, lastDisconnect } = update;

        if (qr) {
            console.log('📱 Scanează codul QR:');
            qrcode.generate(qr, { small: true });
        }
        if (pairingCode) {
            console.log('🔐 Cod de asociere:', pairingCode);
        }
        if (connection === 'open') {
            console.log('✅ Cupidon este pornit și conectat!');
            if (!startupAnnounced) {
                startupAnnounced = true;
                botSend(sock, groupId, { text: `🤖✨ Cupidon este online și gata de treabă!\nScrie *cupidon help* pentru meniu sau *cupidon setari* pentru configurări.` })
                    .catch(() => {});
            }
            if (settings.testMode) {
                console.log('🧪 Test Mode este ACTIV — orice mesaj din grup declanșează un mesaj random.');
            }
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const message = lastDisconnect?.error?.message || lastDisconnect?.error?.output?.payload?.message || 'Conexiune închisă';
            console.log('❌ Conexiune închisă. Cod:', statusCode, '-', message);

            const loggedOut = statusCode === 401;
            const conflict = statusCode === 440 || /conflict|replaced/i.test(message);

            if (loggedOut) {
                console.log('🚪 Autentificarea a eșuat. Se resetează sesiunea și se încearcă reconectarea.');
                restartWithFreshAuth(AUTH_DIR);
            } else if (conflict) {
                console.log('⚠️ O altă sesiune WhatsApp este activă. Se oprește botul pentru a evita bucla de reconectare. Repornește-l manual după ce sesiunea veche a fost închisă.');
                try {
                    sock?.ws?.close?.();
                } catch (error) {
                    // ignore cleanup failures
                }
                process.exit(0);
            } else {
                console.log('🔁 Reîncerc conectarea în 5 secunde...');
                setTimeout(() => startBot(), 5000);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const messageTimestamp = msg.messageTimestamp || msg.message?.messageTimestamp || msg.key?.timestamp || 0;
        if (messageTimestamp && messageTimestamp < botStartupTimestamp) {
            console.log('⏳ Ignor mesaje vechi de istorie:', messageTimestamp, '<', botStartupTimestamp);
            return;
        }

        if (msg.key.fromMe && botSentIds.has(msg.key.id)) return;

        console.log('📩 Mesaj primit din:', msg.key.remoteJid, msg.key.fromMe ? '(de la tine)' : '(de la altcineva)');

        if (msg.key.remoteJid !== groupId) return;

        const buttonId = msg.message.buttonsResponseMessage?.selectedButtonId
            || msg.message.templateButtonReplyMessage?.selectedId
            || msg.message.listResponseMessage?.singleSelectReply?.selectedId;
        const rawText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const text = normalizeText(rawText);

        if (msg.key.fromMe && (botSentIds.has(msg.key.id) || isBotMessageText(rawText))) return;

        console.log('📝 Text extras:', text || '(gol)');
        if (buttonId) console.log('🔘 Buton apăsat:', buttonId);

        if (buttonId) {
            await handleInteractiveButton(sock, buttonId);
            return;
        }

        const activeGame = activeTicTacToeGames.get(groupId);
        if (activeGame) {
            if (activeGame.phase === 'pick-symbol' && (text === 'x' || text === 'o')) {
                await handleTicTacToeButton(sock, `ttt_choose_${text}`);
                return;
            }

            const isStartCommand = text.includes('start');
            console.log('🎮 TicTacToe ready check:', activeGame.phase, 'text=', text, 'isStartCommand=', isStartCommand);
            if (activeGame.phase === 'ready' && isStartCommand) {
                await beginTicTacToeGame(sock, activeGame);
                return;
            }

            const moveNumber = Number(text);
            if (activeGame.phase === 'playing' && !Number.isNaN(moveNumber) && moveNumber >= 1 && moveNumber <= 9) {
                await handleTicTacToeMove(sock, activeGame, moveNumber - 1);
                return;
            }

            if (activeGame.phase === 'ready' && text && !isStartCommand) {
                await botSend(sock, groupId, { text: `❗ Ai ales simbolul *${activeGame.currentSymbol}*. Spune *cupidon start* pentru a porni tabla de joc.` }, 'tictactoe');
                return;
            }
        }

        // ==================== GAME 100 - MOVE HANDLER ====================
        const game100 = active100Game.get(groupId);
        if (game100 && !text.includes('cupidon')) {
            const num = Number(text.trim());

            if (isNaN(num) || num < 1 || num > 10) {
                await botSend(sock, groupId, {
                    text: `❌ Te rog scrie un număr între **1** și **10**.`
                }, 'game100');
                return;
            }

            const newTotal = game100.currentTotal + num;

            if (newTotal > 100) {
                await botSend(sock, groupId, {
                    text: `❌ Nu poți depăși 100!\nTotal actual: *${game100.currentTotal}*`
                }, 'game100');
                return;
            }

            game100.currentTotal = newTotal;

            if (newTotal === 100) {
                await botSend(sock, groupId, {
                    text: `🎉 *Felicitări! Ai ajuns la 100 și ai câștigat!* 🎉\n\n` +
                          `Total final: *100*\n\n` +
                          `Scrie *cupidon 100* pentru o nouă rundă.`
                }, 'game100');
                active100Game.delete(groupId);
            } else {
                await botSend(sock, groupId, {
                    text: `✅ Ai adăugat *${num}*\n\nTotal actual: *${newTotal} / 100*\n\nUrmătorul jucător: scrie un număr (1-10)`
                }, 'game100');
            }
            return;
        }

        const activeNumberGame = activeNumberGames.get(groupId);
        if (activeNumberGame && !text.includes('cupidon')) {
            const guess = Number(text);
            if (!Number.isNaN(guess) && Number.isInteger(guess) && guess >= activeNumberGame.min && guess <= activeNumberGame.max) {
                await handleNumberGuess(sock, activeNumberGame, guess);
                return;
            }
        }

        const activeScrambleGame = activeScrambleGames.get(groupId);
        if (activeScrambleGame && !text.includes('cupidon')) {
            await handleScrambleGuess(sock, activeScrambleGame, rawText);
            return;
        }

        const activeHangmanGame = activeHangmanGames.get(groupId);
        if (activeHangmanGame && !text.includes('cupidon')) {
            await handleHangmanGuess(sock, activeHangmanGame, rawText);
            return;
        }

        const activeAnagramGame = activeAnagramGames.get(groupId);
        if (activeAnagramGame && !text.includes('cupidon')) {
            await handleAnagramGuess(sock, activeAnagramGame, rawText);
            return;
        }

        const activeEmojiQuizGame = activeEmojiQuizGames.get(groupId);
        if (activeEmojiQuizGame && !text.includes('cupidon')) {
            await handleEmojiQuizGuess(sock, activeEmojiQuizGame, rawText);
            return;
        }

        const activeMathGame = activeMathGames.get(groupId);
        if (activeMathGame && !text.includes('cupidon')) {
            await handleMathGuess(sock, activeMathGame, rawText);
            return;
        }

        const activeColorGame = activeColorGames.get(groupId);
        if (activeColorGame && !text.includes('cupidon')) {
            await handleColorGuess(sock, activeColorGame, rawText);
            return;
        }

        const activeTriviaGame = activeTriviaGames.get(groupId);
        if (activeTriviaGame && !text.includes('cupidon')) {
            await handleTriviaGuess(sock, activeTriviaGame, rawText);
            return;
        }

        const activeAnimalGame = activeAnimalGames.get(groupId);
        if (activeAnimalGame && !text.includes('cupidon')) {
            await handleAnimalGuess(sock, activeAnimalGame, rawText);
            return;
        }

        if (!text) return;

        // ==================== SPOTIFY ====================
        if (text.includes('spotify')) {
            await botSend(sock, groupId, {
                text: `🎵 *Spotify*\n\n` +
                      `Ascultă playlist-ul nostru special de dragoste:\n\n` +
                      `https://open.spotify.com/playlist/0OjuUrZ2DLU3YR9BmR59kU?si=d885f30b548745dd&pt=ab91f3b996cfc94966ce8c0f2b09834e\n\n` +
                      `❤️ Pune-l pe repeat când ești cu Stefania!`
            }, 'spotify');
            return;
        }

        // ==================== AMINTIRI ====================
        if (text.includes('amintiri')) {
            const amintiriMessages = [
                "📸 Mai ții minte Stefania când aproape m-ai luat în brațe pe ulița aia plină cu noroi?",
                "📸 Mai ții minte Stefania când aproape m-ai luat în brațe când era să intru în Albu?",
                "📸 Mai ții minte Stefania când aproape te-am sărutat după ce ți-am luat telefonul și ai alergat după mine?",
                "📸 Mai ții minte Stefania când ne-am luat în brațe din greșeală după ce ți-am luat telefonul?",
                "📸 Mai ții minte Stefania când ne-am bătut cu portocale pe holul școlii?",
                "📸 Mai ții minte Stefania când ne-am bătut pe hol și ți-am pus mâna în cap zicând „cutu bun”?",
                "📸 Mai ții minte Stefania toate momentele frumoase pe care le-am trăit împreună?",
                "📸 Fiecare plimbare cu tine e o amintire pe care o port în suflet.",
                "📸 Amintirea preferată: când mă uit în ochii tăi și uit de toată lumea.",
                "📸 Tu ești cea mai frumoasă amintire a vieții mele, în fiecare zi."
            ];

            const randomMemory = amintiriMessages[Math.floor(Math.random() * amintiriMessages.length)];

            await botSend(sock, groupId, {
                text: randomMemory
            }, 'amintiri');
            return;
        }

        if (currentRiddle) {
            if (text.includes(currentRiddle.answer.toLowerCase())) {
                await botSend(sock, groupId, { text: `🎉 *Corect!* Ești genială ❤️` }, 'riddle');
                clearTimeout(riddleTimeout);
                currentRiddle = null;
                wrongAnswerCount = 0;
                return;
            } else if (!text.includes('cupidon')) {
                wrongAnswerCount++;
                if (wrongAnswerCount >= maxWrongAnswers()) {
                    await botSend(sock, groupId, {
                        text: `❌ Ai greșit de ${maxWrongAnswers()} ori! Ai pierdut 😅\nRăspunsul era: *${currentRiddle.answer}* ❤️`
                    }, 'riddle');
                    clearTimeout(riddleTimeout);
                    currentRiddle = null;
                    wrongAnswerCount = 0;
                } else {
                    const remaining = maxWrongAnswers() - wrongAnswerCount;
                    await botSend(sock, groupId, {
                        text: `❌ Greșit, mai încearcă!\n\n${livesBar(remaining, maxWrongAnswers())}`
                    }, 'riddle');
                }
                return;
            }
        }

        if (await handleSettingsText(sock, rawText)) {
            return;
        }

        if (text.includes('cupidon')) {
            const tokens = text.split(/\s+/).filter(Boolean);

            if (text.includes('setari') || text.includes('settings')) {
                await sendSettingsMenu(sock);
                return;
            }

            // Immediate test sender: `cupidon sendnow <type>`
            if (text.includes('sendnow')) {
                const idx = tokens.indexOf('sendnow');
                const typeArg = tokens[idx + 1] || null;
                const allowed = ['romantic', 'rizz', 'flirt', 'pickup', 'riddle'];
                if (typeArg && allowed.includes(typeArg)) {
                    await sendCommandReply(sock, typeArg);
                } else {
                    await botSend(sock, groupId, { text: `Usage: cupidon sendnow <romantic|rizz|flirt|pickup|riddle>` });
                }
                return;
            }

            if (text.includes('impreuna')) {
                await botSend(sock, groupId, {
                    text: `❤️ Sunteți împreună de:\n*${getTimeTogether()}*`
                }, 'relationship');
                return;
            }

            if (text.includes('riddle') || text.includes('ghicitoare')) {
                await sendCommandReply(sock, 'riddle');
                return;
            }

            if (text.includes('help')) {
                // Sent raw (bypassing decorateMessage) since the help menu already
                // has its own complete card/banner design — wrapping it again would
                // just stack a second, redundant header on top.
                await trackSendMessage(sock, groupId, { text: HELP_TEXT });
                return;
            }

            if (text.includes('lovemeter')) {
                await botSend(sock, groupId, { text: buildRelationshipMessage('lovemeter') }, 'lovemeter');
                return;
            }

            if (text.includes('compatibility')) {
                await botSend(sock, groupId, { text: buildRelationshipMessage('compatibility') }, 'compatibility');
                return;
            }

            if (text.includes('stefi') || text.includes('stefania')) {
                await sendTextWithImage(
                    sock,
                    `Iată o imagine specială pentru tine! Stefania 🖼️`,
                    'general',
                    path.join(__dirname, 'Stefania', 'poze')
                );
                return;
            }

            if (text.includes('denis')) {
                await sendTextWithImage(
                    sock,
                    `Iată o imagine specială pentru tine! Denis 🖼️`,
                    'general',
                    path.join(__dirname, 'Denis', 'poze')
                );
                return;
            }

            if (text.includes('temp')) {
                const time = getTimeTogether().split(',')[0];
                await sendImageFromFolder(sock, path.join(__dirname, 'Denis', 'poze'), `🖼️`, groupId);
                await sendImageFromFolder(sock, path.join(__dirname, 'Stefania', 'poze'), `🖼️`, groupId);
                await botSend(sock, groupId, {
                    text: `🎉 Ați ajuns la ❤️ *${time}* ❤️ împreună!\n\n💖 Eu, Denis, te iubesc din tot sufletul și nu te voi uita niciodată.\n✨ Fiecare zi cu tine este mai frumoasă, mai caldă și mai specială.\n💞 În acest moment aș vrea să vin acasă, să te iau în brațe și să te țin permanent în brațele mele.\n🌹 Tu ești minunată și aș vrea să te sărut pe buze pentru cât de frumoasă și de deșteaptă ești ❤️`
                }, 'milestone');
                return;
            }

            if (text.includes('memory')) {
                await sendTextWithImage(sock, buildRelationshipMessage('memory'), 'memory');
                return;
            }

            if (text.includes('firstdate')) {
                await botSend(sock, groupId, { text: buildRelationshipMessage('firstdate') }, 'firstdate');
                return;
            }

            if (text.includes('anniversary')) {
                await botSend(sock, groupId, { text: buildRelationshipMessage('anniversary') }, 'anniversary');
                return;
            }

            if (text.includes('countdown')) {
                await botSend(sock, groupId, { text: buildRelationshipMessage('countdown') }, 'countdown');
                return;
            }

            if (text.includes('imagineazati') || text.includes('imagineaza')) {
                await botSend(sock, groupId, { text: buildImagineMessage() }, 'imagine');
                return;
            }

            // AI removed — no action for "cupidon ai" commands; continue with built-in commands

            if (text.includes('website')) {
                await sendCommandReply(sock, 'website');
                return;
            }

            if (text.includes('romantic')) {
                await sendCommandReply(sock, 'romantic');
                return;
            }

            if (text.includes('rizz')) {
                await sendCommandReply(sock, 'rizz');
                return;
            }

            if (text.includes('compliment')) {
                await sendCommandReply(sock, 'compliment');
                return;
            }

            if (text.includes('flirt')) {
                await sendCommandReply(sock, 'flirt');
                return;
            }

            if (text.includes('pickup')) {
                await sendCommandReply(sock, 'pickup');
                return;
            }

            if (text.includes('lovequote')) {
                await sendCommandReply(sock, 'lovequote');
                return;
            }

            if (text.includes('vibe') || text.includes('mood')) {
                await startMoodCheck(sock);
                return;
            }

            if (text.includes('aura')) {
                await startAuraReading(sock);
                return;
            }

            if (text.includes('quote')) {
                await startDailyQuote(sock);
                return;
            }

            if (text.includes('tarot')) {
                await startTarotSpread(sock);
                return;
            }

            if (text.includes('rate')) {
                await startRateCommand(sock, rawText);
                return;
            }

            if (text.includes('reasons') || text.includes('reason')) {
                await sendCommandReply(sock, 'reasons');
                return;
            }

            if (text.includes('promise')) {
                await sendCommandReply(sock, 'promise');
                return;
            }

            if (text.includes('missyou')) {
                await sendCommandReply(sock, 'missyou');
                return;
            }

            if (text.includes('goodmorning') || text.includes('buna dimineata')) {
                await sendCommandReply(sock, 'goodmorning');
                return;
            }

            if (text.includes('goodnight') || text.includes('buna noapte')) {
                await sendCommandReply(sock, 'goodnight');
                return;
            }

            if (text.includes('hugmessage')) {
                await sendCommandReply(sock, 'hugmessage');
                return;
            }

            if (text.includes('kissmessage')) {
                await sendCommandReply(sock, 'kissmessage');
                return;
            }

            // FIX (carried over): 'foreheadkiss'/'cheekkiss'/'handkiss' all contain
            // the substring 'kiss', so they must be checked before the generic
            // 'kiss' branch below or the generic one always wins and these three
            // commands can never be reached.
            if (text.includes('foreheadkiss')) {
                await sendCommandReply(sock, 'foreheadkiss');
                return;
            }

            if (text.includes('cheekkiss')) {
                await sendCommandReply(sock, 'cheekkiss');
                return;
            }

            if (text.includes('handkiss')) {
                await sendCommandReply(sock, 'handkiss');
                return;
            }

            if (text.includes('kiss')) {
                await sendCommandReply(sock, 'kiss');
                return;
            }

            if (text.includes('hug')) {
                await sendCommandReply(sock, 'hug');
                return;
            }

            if (text.includes('cuddle')) {
                await sendCommandReply(sock, 'cuddle');
                return;
            }

            if (text.includes('dance')) {
                await sendCommandReply(sock, 'dance');
                return;
            }

            if (text.includes('massage')) {
                await sendCommandReply(sock, 'massage');
                return;
            }

            if (text.includes('holdhands')) {
                await sendCommandReply(sock, 'holdhands');
                return;
            }

            if (text.includes('surprise')) {
                await sendCommandReply(sock, 'surprise');
                return;
            }

            if (text.includes('truth')) {
                await sendCommandReply(sock, 'truth');
                return;
            }

            if (text.includes('dare')) {
                await sendCommandReply(sock, 'dare');
                return;
            }

            if (text.includes('challenge')) {
                await sendCommandReply(sock, 'challenge');
                return;
            }

            if (text.includes('wouldyourather')) {
                await sendCommandReply(sock, 'wouldyourather');
                return;
            }

            if (text.includes('thisorthat')) {
                await sendCommandReply(sock, 'thisorthat');
                return;
            }

            // FIX (carried over): 'emojiquiz' contains the substring 'emoji' (and
            // 'quiz'), so it must be checked before both those generic branches
            // or it can never be reached.
            if (text.includes('emojiquiz')) {
                await startEmojiQuizGame(sock);
                return;
            }

            if (text.includes('emoji')) {
                await sendCommandReply(sock, 'emoji');
                return;
            }

            if (text.includes('guess')) {
                await sendCommandReply(sock, 'guess');
                return;
            }

            if (text.includes('spin')) {
                await sendCommandReply(sock, 'spin');
                return;
            }

            if (text.includes('question')) {
                await sendCommandReply(sock, 'question');
                return;
            }

            if (text.includes('date')) {
                await sendCommandReply(sock, 'date');
                return;
            }

            if (text.includes('gift')) {
                await sendCommandReply(sock, 'gift');
                return;
            }

            if (text.includes('bucketlist')) {
                await sendCommandReply(sock, 'bucketlist');
                return;
            }

            if (text.includes('punish')) {
                await sendCommandReply(sock, 'punish');
                return;
            }

            if (text.includes('reward')) {
                await sendCommandReply(sock, 'reward');
                return;
            }

            if (text.includes('dedicatie')) {
                await sendCommandReply(sock, 'dedicatie');
                return;
            }

            if (text.includes('poezie') || text.includes('poem')) {
                await sendCommandReply(sock, 'poezie');
                return;
            }

            if (text.includes('tictactoe')) {
                console.log('🎮 TicTacToe command detected.');
                await startTicTacToeGame(sock);
                return;
            }

            if (text.includes('rps') || text.includes('piatrafoarfecahartie')) {
                await startRpsGame(sock);
                return;
            }

            if (text.includes('quiz')) {
                await startQuizGame(sock);
                return;
            }

            if (text.includes('numar')) {
                await startNumberGuessGame(sock);
                return;
            }

            if (text.includes('games') || text.includes('jocuri')) {
                await botSend(sock, groupId, {
                    text: `🧠 riddle / ghicitoare\n🎮 tictactoe\n🪨 rps\n🧠 quiz\n🔢 numar\n🎲 dice\n🪙 coin\n🔮 8ball / fortune\n🎰 slot\n🧩 scramble\n🎯 hangman\n🧩 anagram\n🧠 emojiquiz\n🧮 math\n🎨 color\n🐾 animal\n🎲 choose\n\nScrie *cupidon <nume joc>* pentru a începe!`
                }, 'help');
                return;
            }

            if (text.includes('dice')) {
                await startDiceGame(sock);
                return;
            }

            if (text.includes('coin')) {
                await startCoinFlipGame(sock);
                return;
            }

            if (text.includes('8ball') || text.includes('fortune')) {
                await startEightBallGame(sock);
                return;
            }

            if (text.includes('slot')) {
                await startSlotMachineGame(sock);
                return;
            }

            if (text.includes('scramble')) {
                await startScrambleGame(sock);
                return;
            }

            if (text.includes('hangman')) {
                await startHangmanGame(sock);
                return;
            }

            if (text.includes('anagram')) {
                await startAnagramGame(sock);
                return;
            }

            if (text.includes('math')) {
                await startMathQuizGame(sock);
                return;
            }

            if (text.includes('color')) {
                await startColorGame(sock);
                return;
            }

            if (text.includes('trivia')) {
                await startTriviaGame(sock);
                return;
            }

            if (text.includes('animal')) {
                await startAnimalGame(sock);
                return;
            }

            // FIX: these used to check for the literal substring "cupidon sapt"
            // etc, which happened to work but only because "cupidon" is always
            // the first word — fragile if extra words were added. They also
            // used to have no safe fallback (see sendMilestoneMessage fix
            // above). Now driven off whole-word tokens so nothing collides
            // with words like "rom-an-tic" that merely contain "an".
            if (tokens.includes('sapt') || tokens.includes('saptamana')) {
                await sendMilestoneMessage(sock, 'sapt');
                return;
            }

            if (tokens.includes('luna')) {
                await sendMilestoneMessage(sock, 'luna');
                return;
            }

            if (tokens.includes('an')) {
                await sendMilestoneMessage(sock, 'an');
                return;
            }

            if (text.includes('choose')) {
                const parts = rawText.split(/\s+/).filter(Boolean);
                const chooseIndex = parts.findIndex(part => normalizeText(part) === 'choose');
                const options = chooseIndex >= 0 ? parts.slice(chooseIndex + 1) : [];
                if (options.length >= 2) {
                    const picked = options[Math.floor(Math.random() * options.length)];
                    await botSend(sock, groupId, { text: `🎲 Am ales: *${picked}*` });
                } else {
                    await botSend(sock, groupId, { text: `⚠️ Folosește: *cupidon choose opțiune1 opțiune2*` });
                }
                return;
            }

            if (text.includes('test')) {
                await sendCommandReply(sock, null);
                return;
            }

            if (text.includes('100')) {
                if (!active100Game.has(groupId)) {
                    active100Game.set(groupId, { currentTotal: 0 });
                    await botSend(sock, groupId, {
                        text: `🔢 *Jocul 100* a început!\n\n` +
                              `Total actual: *0*\n\n` +
                              `Fiecare jucător adaugă un număr între *1* și *10*.\n` +
                              `Cine ajunge primul la exact *100* câștigă! 🎉\n\n` +
                              `Scrie un număr (1-10)`,
                    }, 'game100');
                } else {
                    const total = active100Game.get(groupId).currentTotal;
                    await botSend(sock, groupId, {
                        text: `🔢 Jocul 100 este deja activ!\nTotal actual: *${total}*`
                    }, 'game100');
                }
                return;
            }

            await botSend(sock, groupId, {
                text: `Nu am înțeles comanda 🤔\nÎncearcă: *cupidon help* și ghidează-te de acolo`
            });
            return;
        }

        if (settings.testMode) {
            await sendCommandReply(sock, null);
        }
    });

    // Schedule hourly messages from 10:00 to 23:00 with rotating message types.
    // Reads settings.hourlyMessageTypes and settings.hourlyMessagesEnabled live
    // on every tick, so toggling them in "cupidon setari" takes effect on the
    // very next scheduled hour without needing a restart.
    for (let hour = 10; hour <= 23; hour++) {
        const cronTime = `0 ${hour} * * *`;

        cron.schedule(cronTime, async () => {
            if (!settings.hourlyMessagesEnabled) return;
            const types = settings.hourlyMessageTypes && settings.hourlyMessageTypes.length
                ? settings.hourlyMessageTypes
                : DEFAULT_SETTINGS.hourlyMessageTypes;
            const messageType = types[(hour - 10) % types.length];
            await sendCommandReply(sock, messageType);
        }, { timezone: 'Europe/Bucharest' });
    }

    cron.schedule('0 0 * * *', async () => {
        if (!settings.dailyMilestoneEnabled) return;
        const time = getTimeTogether().split(',')[0];
        await botSend(sock, groupId, {
            text: `🎉 Ați ajuns la ❤️ *${time}* ❤️ împreună!\n\n💖 Eu, Denis, te iubesc din tot sufletul și nu te voi uita niciodată.\n✨ Fiecare zi cu tine este mai frumoasă, mai caldă și mai specială.\n💞 În acest moment aș vrea să vin acasă, să te iau în brațe și să te țin permanent în brațele mele.\n🌹 Tu ești minunată și aș vrea să te sărut pe buze pentru cât de frumoasă și de deșteaptă ești ❤️`
        }, 'milestone');
    }, { timezone: 'Europe/Bucharest' });
}

startBot().catch((error) => {
    console.error('❌ CRITICAL: Failed to initialize bot:', error);
    console.error('Stack trace:', error.stack);
    console.log('⚠️ Web server remains active. Check auth directory and environment variables.');
});
