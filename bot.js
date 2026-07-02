const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const startDate = new Date('2026-06-24T00:00:00');
const groupId = '58145535742158@lid';

const BOT_NAME = '🏹 *Cupidon*';
const RIDDLE_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_WRONG_ANSWERS = 3;
const TEST_MODE = false;

// AI integration removed — Cupidon will use only built-in message pools.

const botSentIds = new Set();
let startupAnnounced = false;
let shutdownAnnounced = false;

const styleMap = {
    general: { title: '🏹 Cupidon', icon: '💖' },
    riddle: { title: '🧠 Ghicitoare', icon: '🧠' },
    romantic: { title: '💘 Mesaj romantic', icon: '💖' },
    rizz: { title: '😏 Rizz', icon: '🔥' },
    compliment: { title: '💝 Compliment', icon: '✨' },
    flirt: { title: '💬 Flirt', icon: '🌹' },
    pickup: { title: '🫶 Pickup', icon: '💫' },
    lovequote: { title: '📜 Love quote', icon: '💌' },
    reasons: { title: '💡 Motive', icon: '💡' },
    promise: { title: '🤝 Promisiune', icon: '💞' },
    missyou: { title: '💔 Mi-e dor', icon: '🌙' },
    goodmorning: { title: '🌞 Bună dimineața', icon: '🌞' },
    goodnight: { title: '🌙 Noapte bună', icon: '🌙' },
    hugmessage: { title: '🤗 Mesaj îmbrățișare', icon: '🤗' },
    kissmessage: { title: '💋 Mesaj sărut', icon: '💋' },
    kiss: { title: '💋 Sărut', icon: '💋' },
    hug: { title: '🤗 Îmbrățișare', icon: '🤗' },
    cuddle: { title: '🥰 Îmbrățișare caldă', icon: '🥰' },
    foreheadkiss: { title: '💫 Sărut pe frunte', icon: '💫' },
    cheekkiss: { title: '💋 Sărut pe obraz', icon: '💋' },
    handkiss: { title: '💍 Sărut pe mână', icon: '💍' },
    dance: { title: '💃 Dans', icon: '💃' },
    massage: { title: '🪷 Masaj', icon: '🪷' },
    holdhands: { title: '🤝 Țineți-vă de mână', icon: '🤝' },
    surprise: { title: '🎁 Surpriză', icon: '🎁' },
    truth: { title: '🧠 Adevăr', icon: '🧠' },
    dare: { title: '🔥 Provocare', icon: '🔥' },
    challenge: { title: '🎯 Provocare', icon: '🎯' },
    wouldyourather: { title: '🤔 Alege', icon: '🤔' },
    thisorthat: { title: '💞 Alege', icon: '💞' },
    emoji: { title: '😀 Emoji', icon: '😀' },
    guess: { title: '🎲 Ghicește', icon: '🎲' },
    spin: { title: '🎡 Rotiți', icon: '🎡' },
    question: { title: '❓ Întrebare', icon: '❓' },
    dedicatie: { title: '💌 Dedicație', icon: '💌' },
    poezie: { title: '📜 Poezie', icon: '📜' },
    date: { title: '💘 Idei de date', icon: '💘' },
    gift: { title: '🎁 Cadou', icon: '🎁' },
    bucketlist: { title: '📝 Bucket list', icon: '📝' },
    punish: { title: '😈 Pedepse', icon: '😈' },
    reward: { title: '🎉 Recompensă', icon: '🎉' },
    website: { title: '🌐 Website', icon: '🌐' },
    help: { title: '📖 Help', icon: '📖' },
    relationship: { title: '💕 Relație', icon: '💕' }
};

function decorateMessage(body, type = 'general') {
    const style = styleMap[type] || styleMap.general;
    const divider = '━━━━━━━━━━━━━━━━━━━━';
    const cleanBody = String(body).replace(/\n{3,}/g, '\n\n').trim();
    return `${style.icon} ${style.title}\n${divider}\n${cleanBody}\n${divider}`;
}

function buildExpandedPool(templates, targetCount) {
    const pool = [];
    for (let i = 0; i < targetCount; i++) {
        const template = templates[i % templates.length];
        pool.push(template.replace('{i}', i + 1));
    }
    return pool;
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

const morningMessages = [
    '🌞 Bună dimineața, iubirea mea, ce frumoasă ești tu ❤️',
    '🌞 Bună dimineața, prințesa mea! Sper să ai o zi la fel de frumoasă ca tine ❤️',
    '🌞 Bună dimineața! Primul gând al dimineții e la tine ❤️',
    '🌞 Bună dimineața, cea mai frumoasă fată din galaxie ❤️'
];

const HELP_TEXT = `
╔═════━━━ 💘 ━━━═════╗
        🏹  *CUPIDON BOT*  🏹
     ❤️ *Love • Fun • Romance* ❤️
╚═════━━━ 💘 ━━━═════╝

🌟 *Cupidon a devenit mai inteligent și mai viu!*
✨ Ce am Adaugat:
- Mai multe comenzi și acțiuni pentru cupluri.
- Mesaje personalizate și surprize pentru fiecare comandă.
- Jocuri interactive și provocări pentru a vă distra împreună.
- Funcționalități noi pentru a sărbători relația voastră.
- 1 Milion de mesaje pentru multe categorii

✨ *Bine ai venit!*
Scrie:
➜ *cupidon <comandă>*

━━━━━━━━━━━━━━━━━━━━━━
❤️ *LOVE*
━━━━━━━━━━━━━━━━━━━━━━
🌹 romantic
😏 rizz
💖 compliment
😘 flirt
💌 pickup
❤️ lovequote
🤍 promise
💍 reasons
🥺 missyou

━━━━━━━━━━━━━━━━━━━━━━
💋 *ACȚIUNI*
━━━━━━━━━━━━━━━━━━━━━━
💋 kiss
🤗 hug
🥰 cuddle
😘 foreheadkiss
😊 cheekkiss
🤲 handkiss
💃 dance
💆 massage
🤝 holdhands
🎁 surprise
🤔 imagineazati

━━━━━━━━━━━━━━━━━━━━━━
🎮 *JOCURI DE CUPLU*
━━━━━━━━━━━━━━━━━━━━━━
❓ truth
🔥 dare
🎯 challenge
🤔 wouldyourather
⚖️ thisorthat
😀 emoji

━━━━━━━━━━━━━━━━━━━━━━
💕 *RELAȚIE*
━━━━━━━━━━━━━━━━━━━━━━
⏳ impreuna
❤️ lovemeter
💞 compatibility
🎉 anniversary
📸 memory
⌛ countdown
🌹 firstdate

━━━━━━━━━━━━━━━━━━━━━━
🎁 *FUN*
━━━━━━━━━━━━━━━━━━━━━━
🍽️ date
🏆 reward
😈 punish
🎀 gift
📝 bucketlist
🌐 website
🎮 tictactoe

━━━━━━━━━━━━━━━━━━━━━━
📖 *INFO*
━━━━━━━━━━━━━━━━━━━━━━
📚 help

━━━━━━━━━━━━━━━━━━━━━━
✨ *EXEMPLE*
━━━━━━━━━━━━━━━━━━━━━━
💖 cupidon romantic
💋 cupidon kiss
🤗 cupidon hug
🔥 cupidon dare
❓ cupidon truth
❤️ cupidon lovemeter
🍽️ cupidon date
🌐 cupidon website
📚 cupidon help
📸 cupidon imagine

━━━━━━━━━━━━━━━━━━━━━━
💝 *Mesaj de la Cupidon*

❤️ Dragostea nu înseamnă să găsești persoana perfectă...
ci să vezi perfecțiunea într-o persoană imperfectă.

🏹 *Cupidon este mereu aici pentru Denis ❤️ Stefania*
💞 Fiecare comandă ascunde o surpriză!
━━━━━━━━━━━━━━━━━━━━━━`;

let currentRiddle = null;
let riddleTimeout = null;
let wrongAnswerCount = 0;

const activeTicTacToeGames = new Map();
let ticTacToeFont = null;

function getTimeTogether(offsetHours = 0) {
    const now = new Date();
    if (offsetHours) now.setHours(now.getHours() + offsetHours);
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

const BOT_MESSAGE_PREFIX = normalizeText(`${styleMap.general.icon} ${styleMap.general.title}`);

function isBotMessageText(text) {
    return typeof text === 'string' && normalizeText(text).startsWith(BOT_MESSAGE_PREFIX);
}

function pickFrom(type) {
    if (type && contentLibrary[type]) {
        const pool = contentLibrary[type];
        return { type, text: pool[Math.floor(Math.random() * pool.length)] };
    }

    const pool = type ? messagePool.filter(m => m.type === type) : messagePool;
    return pool[Math.floor(Math.random() * pool.length)];
}

function buildSimpleMessage(type) {
    const randomMsg = pickFrom(type);
    let text = '';

    if (randomMsg.type === 'riddle') {
        currentRiddle = randomMsg;
        wrongAnswerCount = 0;
        text += randomMsg.text + '\n\n(Ai 5 minute și maxim 3 încercări să răspunzi 😊)';
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

function drawRect(image, x, y, width, height, color) {
    const xEnd = Math.min(image.bitmap.width, x + width);
    const yEnd = Math.min(image.bitmap.height, y + height);
    for (let yy = y; yy < yEnd; yy++) {
        for (let xx = x; xx < xEnd; xx++) {
            image.setPixelColor(color, xx, yy);
        }
    }
}

async function renderTicTacToeBoard(board) {
    const size = 600;
    const cell = size / 3;
    const image = new Jimp.Jimp({ width: size, height: size, color: 0xffffffff });
    const lineColor = 0x000000ff;
    const thickness = 14;

    for (let i = 1; i < 3; i++) {
        const pos = Math.round(i * cell - thickness / 2);
        drawRect(image, pos, 0, thickness, size, lineColor);
        drawRect(image, 0, pos, size, thickness, lineColor);
    }

    for (let index = 0; index < 9; index++) {
        const symbol = board[index];
        if (!symbol) continue;

        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = col * cell;
        const y = row * cell;

        image.print(
            ticTacToeFont,
            x,
            y,
            {
                text: symbol,
                alignmentX: Jimp.HorizontalAlign.CENTER,
                alignmentY: Jimp.VerticalAlign.MIDDLE
            },
            cell,
            cell
        );
    }

    return await new Promise((resolve, reject) => {
        image.getBuffer(Jimp.JimpMime.png, (err, buffer) => {
            if (err) return reject(err);
            resolve(buffer);
        });
    });
}

function createEmptyTicTacToeBoard() {
    return Array(9).fill(null);
}

function getTicTacToeCaption(game) {
    const symbolText = game.currentSymbol || 'X';
    return `${BOT_NAME}\n🎮 TicTacToe Cupidon\nSimbol curent: *${symbolText}*\nAlege o casetă de la 1 la 9.`;
}

function getTicTacToeButtons(rowStart) {
    return [
        { buttonId: `ttt_move_${rowStart}`, buttonText: { displayText: `${rowStart + 1}` }, type: 1 },
        { buttonId: `ttt_move_${rowStart + 1}`, buttonText: { displayText: `${rowStart + 2}` }, type: 1 },
        { buttonId: `ttt_move_${rowStart + 2}`, buttonText: { displayText: `${rowStart + 3}` }, type: 1 }
    ];
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
    const boardBuffer = await renderTicTacToeBoard(game.board);

    await trackSendMessage(sock, groupId, {
        image: boardBuffer,
        caption,
        footer: 'Alege numărul casetei făcând click pe butonul corespunzător.',
        buttons: getTicTacToeButtons(0),
        headerType: 4
    });

    await trackSendMessage(sock, groupId, {
        text: 'Completează mutarea: alege una dintre casetele de jos.',
        footer: 'TicTacToe Cupidon',
        buttons: getTicTacToeButtons(3),
        headerType: 1
    });

    await trackSendMessage(sock, groupId, {
        text: 'Ține minte: 1-3 sus, 4-6 mijloc, 7-9 jos.',
        footer: 'TicTacToe Cupidon',
        buttons: getTicTacToeButtons(6),
        headerType: 1
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
        text: `${BOT_NAME}\n🎮 TicTacToe Cupidon\nAlege primul simbol: *X* sau *O* și apoi scrie *cupidon start* pentru a afișa tabla.`,
        footer: 'Alege X sau O și apoi scrie cupidon start.',
        buttons: [
            { buttonId: 'ttt_choose_x', buttonText: { displayText: 'X' }, type: 1 },
            { buttonId: 'ttt_choose_o', buttonText: { displayText: 'O' }, type: 1 }
        ],
        headerType: 1
    });
    console.log('🎮 TicTacToe start message sent:', result?.key?.id);
}

async function beginTicTacToeGame(sock, game) {
    game.phase = 'playing';
    await botSend(sock, groupId, { text: `${BOT_NAME}\n🎮 TicTacToe Cupidon\nJocul începe acum!` });
    await sendTicTacToeButtons(sock, game);
}

async function handleTicTacToeMove(sock, game, index) {
    if (game.phase !== 'playing') {
        await botSend(sock, groupId, { text: `${BOT_NAME}\n❗Alege mai întâi simbolul X sau O pentru a începe.` });
        return;
    }

    if (game.board[index]) {
        await botSend(sock, groupId, { text: `${BOT_NAME}\n❌ Caseta ${index + 1} este deja ocupată. Alege alta.` });
        return;
    }

    game.board[index] = game.currentSymbol;
    const winner = checkTicTacToeWinner(game.board);
    if (winner) {
        const boardBuffer = await renderTicTacToeBoard(game.board);
        if (winner === 'draw') {
            await trackSendMessage(sock, groupId, {
                image: boardBuffer,
                caption: `${BOT_NAME}\n🤝 Remiză! Jocul s-a terminat.`,
                footer: 'TicTacToe Cupidon',
                headerType: 4
            });
        } else {
            await trackSendMessage(sock, groupId, {
                image: boardBuffer,
                caption: `${BOT_NAME}\n🎉 *${winner}* a câștigat! Felicitări!`,
                footer: 'TicTacToe Cupidon',
                headerType: 4
            });
        }
        activeTicTacToeGames.delete(groupId);
        return;
    }

    game.currentSymbol = game.currentSymbol === 'X' ? 'O' : 'X';
    await sendTicTacToeButtons(sock, game);
}

async function handleTicTacToeButton(sock, buttonId) {
    console.log('🎮 handleTicTacToeButton called with', buttonId);
    const game = activeTicTacToeGames.get(groupId);
    if (!game) {
        await botSend(sock, groupId, { text: `${BOT_NAME}\n❗ Nu există un joc activ. Scrie *cupidon tictactoe* pentru a începe.` });
        return;
    }

    if (buttonId === 'ttt_choose_x' || buttonId === 'ttt_choose_o') {
        if (game.phase !== 'pick-symbol') {
            await botSend(sock, groupId, { text: `${BOT_NAME}\n❗ Jocul este deja pronit.` });
            return;
        }
        game.phase = 'ready';
        game.currentSymbol = buttonId === 'ttt_choose_x' ? 'X' : 'O';
        await botSend(sock, groupId, {
            text: `${BOT_NAME}\n✅ Ai ales *${game.currentSymbol}*. Spune *cupidon start* pentru a porni tabelul de joc.`
        });
        return;
    }

    if (buttonId.startsWith('ttt_move_')) {
        const index = Number(buttonId.replace('ttt_move_', ''));
        if (Number.isNaN(index) || index < 0 || index > 8) {
            await botSend(sock, groupId, { text: `${BOT_NAME}\n❗ Mutare invalidă.` });
            return;
        }
        await handleTicTacToeMove(sock, game, index);
        return;
    }

    await botSend(sock, groupId, { text: `${BOT_NAME}\n❗ Buton TicTacToe necunoscut.` });
}

function buildRelationshipMessage(type) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

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
        const note = pick(['pare să fie o combinație foarte bună', 'chimia este evidentă', 'există mult potențial între voi', 'se simte sincer și cald']);
        return `💖 Love Meter: ${pct}% — ${note}!`;
    }

    if (type === 'compatibility') {
        const pct = Math.floor(Math.random() * 41) + 60;
        const note = pick(['sunteți foarte complementari', 'aveți valori aliniate', 'înțelegerea e la un nivel înalt', 'potențial de lungă durată']);
        return `💕 Compatibilitate: ${pct}% — ${note}!`;
    }

    if (type === 'memory') {
        return pick(memoryPool);
    }

    if (type === 'firstdate') {
        return pick(firstdatePool);
    }

    if (type === 'anniversary') {
        return pick(anniversaryPool);
    }

    if (type === 'countdown') {
        return `⏳ ${getCountdownMessage()}`;
    }

    return pick(relationshipPool);
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
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    return pick(imaginePool);
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

    const randomFile = files[Math.floor(Math.random() * files.length)];
    const ext = path.extname(randomFile).toLowerCase();
    const mimetype = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';

    return {
        image: fs.readFileSync(randomFile),
        caption: text,
        mimetype
    };
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
                text: `${BOT_NAME}\n⏰ Timpul a expirat!\nRăspunsul era: **${currentRiddle.answer}** ❤️`
            });
            currentRiddle = null;
            wrongAnswerCount = 0;
        }
    }, RIDDLE_TIMEOUT_MS);
}

async function sendCommandReply(sock, type) {
    const text = buildSimpleMessage(type);
    await botSend(sock, groupId, { text }, type);
    if (currentRiddle) armRiddleTimeout(sock);
}

async function startBot() {
    const AUTH_DIR = process.env.AUTH_DIR || 'auth';
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

    try {
        const jimpFonts = require('@jimp/plugin-print/fonts');
        ticTacToeFont = await Jimp.loadFont(jimpFonts.SANS_128_BLACK);
    } catch (error) {
        console.error('❌ Nu s-a putut încărca fontul TicTacToe 128:', error.message);
        try {
            const jimpFonts = require('@jimp/plugin-print/fonts');
            ticTacToeFont = await Jimp.loadFont(jimpFonts.SANS_64_BLACK);
        } catch (fallbackError) {
            console.error('❌ Nu s-a putut încărca fontul TicTacToe fallback:', fallbackError.message);
            ticTacToeFont = null;
        }
    }

    const handleShutdown = async (signal) => {
        if (shutdownAnnounced) {
            process.exit(0);
            return;
        }
        shutdownAnnounced = true;
        console.log(`🛑 Se primește oprirea (${signal})...`);
        try {
            await botSend(sock, groupId, { text: `${BOT_NAME}\n😴 Cupidon pleacă, ne vedem data viitoare!` });
        } catch (error) {
            console.log('⚠️ Nu s-a putut trimite mesajul de închidere:', error.message);
        }
        process.exit(0);
    };

    process.once('SIGINT', () => handleShutdown('SIGINT'));
    process.once('SIGTERM', () => handleShutdown('SIGTERM'));

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
                botSend(sock, groupId, { text: `${BOT_NAME}\n🤖 Cupidon este pornit, sunt gata de folosire!` })
                    .catch(() => {});
            }
            if (TEST_MODE) {
                console.log('🧪 TEST_MODE este ACTIV — orice mesaj din grup declanșează un mesaj random.');
            }
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log('❌ Conexiune închisă. Cod:', statusCode, '-', lastDisconnect?.error?.message);

            const loggedOut = statusCode === 401 ||
                (statusCode === 401 && lastDisconnect?.error?.data?.content?.[0]?.attrs?.type === 'device_removed');

            if (loggedOut) {
                console.log('🚪 Autentificarea a eșuat. Șterge folderul "auth" și repornește pentru a te reasocia.');
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
            await handleTicTacToeButton(sock, buttonId);
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
                await botSend(sock, groupId, { text: `${BOT_NAME}\n❗ Ai ales simbolul *${activeGame.currentSymbol}*. Spune *cupidon start* pentru a porni tabla de joc.` });
                return;
            }
        }

        if (!text) return;

        if (currentRiddle) {
            if (text.includes(currentRiddle.answer.toLowerCase())) {
                await botSend(sock, groupId, { text: `${BOT_NAME}\n🎉 Corect! Ești genială ❤️` });
                clearTimeout(riddleTimeout);
                currentRiddle = null;
                wrongAnswerCount = 0;
                return;
            } else if (!text.includes('cupidon')) {
                wrongAnswerCount++;
                if (wrongAnswerCount >= MAX_WRONG_ANSWERS) {
                    await botSend(sock, groupId, {
                        text: `${BOT_NAME}\n❌ Ai greșit de ${MAX_WRONG_ANSWERS} ori! Ai pierdut 😅\nRăspunsul era: **${currentRiddle.answer}** ❤️`
                    });
                    clearTimeout(riddleTimeout);
                    currentRiddle = null;
                    wrongAnswerCount = 0;
                } else {
                    await botSend(sock, groupId, {
                        text: `${BOT_NAME}\n❌ Greșit, mai încearcă! (${wrongAnswerCount}/${MAX_WRONG_ANSWERS})`
                    });
                }
                return;
            }
        }

        if (text.includes('cupidon')) {
            if (text.includes('impreuna') || text.includes('impreuna')) {
                await botSend(sock, groupId, {
                    text: `${BOT_NAME}\n❤️ Sunteți împreună de:\n**${getTimeTogether(2)}**`
                });
                return;
            }

            if (text.includes('riddle') || text.includes('ghicitoare')) {
                await sendCommandReply(sock, 'riddle');
                return;
            }

            if (text.includes('help')) {
                await botSend(sock, groupId, { text: HELP_TEXT });
                return;
            }

            if (text.includes('lovemeter')) {
                await botSend(sock, groupId, { text: buildRelationshipMessage('lovemeter') });
                return;
            }

            if (text.includes('compatibility')) {
                await botSend(sock, groupId, { text: buildRelationshipMessage('compatibility') });
                return;
            }

            if (text.includes('stefi') || text.includes('stefania')) {
                await sendTextWithImage(
                    sock,
                    `${BOT_NAME}\n🖼️ Iată o imagine specială pentru tine! Stefania`,
                    'general',
                    path.join(__dirname, 'Stefania', 'poze')
                );
                return;
            }

            if (text.includes('denis')) {
                await sendTextWithImage(
                    sock,
                    `${BOT_NAME}\n🖼️ Iată o imagine specială pentru tine! Denis`,
                    'general',
                    path.join(__dirname, 'Denis', 'poze')
                );
                return;
            }

            if (text.includes('temp')) {
                const time = getTimeTogether().split(',')[0];
                await sendImageFromFolder(sock, path.join(__dirname, 'Denis', 'poze'), `${BOT_NAME}\n🖼️`, groupId);
                await sendImageFromFolder(sock, path.join(__dirname, 'Stefania', 'poze'), `${BOT_NAME}\n🖼️`, groupId);
                await botSend(sock, groupId, {
                    text: `${BOT_NAME}\n🎉 Ați ajuns la ❤️**${time}**❤️ împreună!\n\n💖 Eu, Denis, te iubesc din tot sufletul și nu te voi uita niciodată.\n✨ Fiecare zi cu tine este mai frumoasă, mai caldă și mai specială.\n💞 În acest moment aș vrea să vin acasă, să te iau în brațe și să te țin permanent în brațele mele.\n🌹 Tu ești minunată și aș vrea să te sărut pe buze pentru cât de frumoasă și de deșteaptă ești ❤️`
                });
                return;
            }

            if (text.includes('memory')) {
                await sendTextWithImage(sock, buildRelationshipMessage('memory'), 'relationship');
                return;
            }

            if (text.includes('firstdate')) {
                await botSend(sock, groupId, { text: buildRelationshipMessage('firstdate') });
                return;
            }

            if (text.includes('anniversary')) {
                await botSend(sock, groupId, { text: buildRelationshipMessage('anniversary') });
                return;
            }

            if (text.includes('countdown')) {
                await botSend(sock, groupId, { text: buildRelationshipMessage('countdown') });
                return;
            }

            if (text.includes('imagineazati') || text.includes('imagineaza') || text.includes('imagineaza')) {
                await botSend(sock, groupId, { text: `${BOT_NAME}\n${buildImagineMessage()}` }, 'romantic');
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

            if (text.includes('lovequote') || text.includes('lovequote')) {
                await sendCommandReply(sock, 'lovequote');
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

            if (text.includes('goodmorning') || text.includes('bunademineata')) {
                await sendCommandReply(sock, 'goodmorning');
                return;
            }

            if (text.includes('goodnight') || text.includes('bunanopate')) {
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

            if (text.includes('dedicatie') || text.includes('dedicatie')) {
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

            if (text.includes('test')) {
                await sendCommandReply(sock, null);
                return;
            }

            await botSend(sock, groupId, {
                text: `${BOT_NAME}\nNu am înțeles comanda 🤔\nÎncearcă: *cupidon help* si Ghideaza-te de acolo`
            });
            return;
        }

        if (TEST_MODE) {
            await sendCommandReply(sock, null);
        }
    });

    cron.schedule('30 7 * * *', async () => {
        const morning = morningMessages[Math.floor(Math.random() * morningMessages.length)];
        await botSend(sock, groupId, { text: `${BOT_NAME}\n${morning}` });
    });

    const randomTimes = ['0 12 * * *', '0 16 * * *', '0 19 * * *', '30 21 * * *'];
    randomTimes.forEach(cronTime => {
        cron.schedule(cronTime, async () => {
            await sendCommandReply(sock, null);
        });
    });

    cron.schedule('0 0 * * *', async () => {
        const time = getTimeTogether().split(',')[0];
        await sendImageFromFolder(sock, path.join(__dirname, 'Denis', 'poze'), `${BOT_NAME}\n🖼️`, groupId);
        await sendImageFromFolder(sock, path.join(__dirname, 'Stefania', 'poze'), `${BOT_NAME}\n🖼️`, groupId);
        await botSend(sock, groupId, {
            text: `${BOT_NAME}\n🎉 Ați ajuns la ❤️**${time}**❤️ împreună!\n\n💖 Eu, Denis, te iubesc din tot sufletul și nu te voi uita niciodată.\n✨ Fiecare zi cu tine este mai frumoasă, mai caldă și mai specială.\n💞 În acest moment aș vrea să vin acasă, să te iau în brațe și să te țin permanent în brațele mele.\n🌹 Tu ești minunată și aș vrea să te sărut pe buze pentru cât de frumoasă și de deșteaptă ești ❤️`
        });
    });
}

startBot();
