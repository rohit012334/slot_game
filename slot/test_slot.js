const SYMBOLS = [
  { emoji: "🍎", name: "Apple", multiplier: 1.5, weight: 20 },
  { emoji: "🍊", name: "Orange", multiplier: 1.5, weight: 20 },
  { emoji: "🍋", name: "Lemon", multiplier: 1.5, weight: 18 },
  { emoji: "🍇", name: "Grapes", multiplier: 1.5, weight: 18 },
  { emoji: "🍒", name: "Cherry", multiplier: 1.8, weight: 16 },
  { emoji: "🔔", name: "Bell", multiplier: 2.0, weight: 12 },
  { emoji: "⭐", name: "Star", multiplier: 3.0, weight: 8 },
  { emoji: "🎰", name: "Jackpot", multiplier: 2.5, weight: 6 },
  { emoji: "💎", name: "Diamond", multiplier: 5.0, weight: 3 },
  { emoji: "🃏", name: "Wild", multiplier: 0, weight: 4 } // Wild substitutes for any
];

const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

function getRandomSymbol() {
  let r = Math.random() * totalWeight;
  for (let s of SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

let wins = 0;
let totalCost = 100000;
let payoutTotal = 0;
for(let i=0; i<100000; i++) {
  const r1 = getRandomSymbol();
  const r2 = getRandomSymbol();
  const r3 = getRandomSymbol();
  
  // check win
  // 3 same or wild
  let nonWilds = [r1, r2, r3].filter(s => s.name !== "Wild");
  if(nonWilds.length === 0) {
    payoutTotal += 5.0; // 3 wilds = 5x
    wins++;
  } else {
    // all nonWilds must be same
    let first = nonWilds[0].name;
    let allSame = nonWilds.every(s => s.name === first);
    if(allSame) {
      wins++;
      payoutTotal += nonWilds[0].multiplier;
    }
  }
}
console.log("Wins:", wins, "Out of:", totalCost);
console.log("Win rate:", (wins/totalCost*100).toFixed(2), "%");
console.log("Total spent:", totalCost, "Total won:", payoutTotal);
console.log("RTP:", (payoutTotal/totalCost*100).toFixed(2), "%");
