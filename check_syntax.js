
const fs = require('fs');
const content = fs.readFileSync('/app/applet/app/feed/page.tsx', 'utf8');
let paren = 0;
let brace = 0;
let bracket = 0;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '(') paren++;
    if (content[i] === ')') paren--;
    if (content[i] === '{') brace++;
    if (content[i] === '}') brace--;
    if (content[i] === '[') bracket++;
    if (content[i] === ']') bracket--;
    if (paren < 0 || brace < 0 || bracket < 0) {
        console.log(`Imbalance at index ${i}, char ${content[i]}`);
    }
}
console.log(`Final: paren=${paren}, brace=${brace}, bracket=${bracket}`);
