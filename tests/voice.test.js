// The voice rules in VOICE.md that a machine can check, on every user-facing string in the app.
// (The plan content and Learn pages join this check in the next copy pass.)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const KB = require("../js/knowledge.js");

const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
// Visible text in index.html, and the string literals in the app's scripts.
const html = read("index.html").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "");
const htmlText = [...html.matchAll(/>([^<>]+)</g)].map(m => m[1]).concat([...html.matchAll(/(?:placeholder|aria-label|title|content)="([^"]+)"/g)].map(m => m[1]));
const literals = src => [...src.replace(/^\s*\/\/.*$|\/\*[\s\S]*?\*\//gm, "").matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map(m => m[1] ?? m[2]);
const strings = [
  ...htmlText.map(t => ["index.html", t]),
  ...["js/app.js", "js/shell.js", "js/page.js"].flatMap(f => literals(read(f)).map(t => [f, t])),
  ...KB.QUESTIONS.flatMap(q => [q.title, q.help, ...q.options.flatMap(o => [o.label, o.hint])].map(t => ["questions", t]))
];

const BRITISH = /\b(personalis\w*|organis\w*|optimis\w*|recognis\w*|summaris\w*|analys(e|ed|ing)\b|colour\w*|behaviour\w*|favour\w*|labelled|labelling|cancelled|travelled|centre|licence)\b/i;
const BANNED = /\b(use case|well done|awesome|super easy|just click|oops)\b/i;

test("app strings use American spelling and the agreed terms", () => {
  for (const [file, s] of strings) {
    assert.ok(!BRITISH.test(s), `${file}: British spelling in “${s.trim().slice(0, 80)}”`);
    assert.ok(!BANNED.test(s), `${file}: avoid “${s.match(BANNED)?.[0]}” in “${s.trim().slice(0, 80)}”`);
  }
});

test("app strings have no exclamation marks and no emoji", () => {
  for (const [file, s] of strings) {
    assert.ok(!/[A-Za-z)]![\s"'`<]|[A-Za-z)]!$/.test(s), `${file}: exclamation mark in “${s.trim().slice(0, 80)}”`);
    // Exceptions: the 🧠 logo until the new logo lands, and the ☑ / ☐ checkboxes in the printed plan.
    assert.ok(!/\p{Extended_Pictographic}/u.test(s.replace(/[🧠☑☐]/gu, "")), `${file}: emoji in “${s.trim().slice(0, 80)}”`);
  }
});
