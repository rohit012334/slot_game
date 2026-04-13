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
  { emoji: "🃏", name: "Wild", multiplier: 5.0, weight: 4 } // Wild counts as 5x if 3 of them
];
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

class GameService {
  constructor() {
    this.io = null;
    this.onlineCount = 0;
    this.socketMappings = new Map();
  }

  setIO(io) {
    this.io = io;
  }

  setSocketMapping(userId, socketId) {
    this.socketMappings.set(userId, socketId);
  }

  removeSocketMapping(userId) {
    this.socketMappings.delete(userId);
  }

  getRandomWinningSymbol() {
    let r = Math.random() * TOTAL_WEIGHT;
    for (let s of SYMBOLS) {
      r -= s.weight;
      if (r <= 0) return { ...s };
    }
    return { ...SYMBOLS[SYMBOLS.length - 1] };
  }

  getLosingReels() {
    // Generate 3 random symbols that DO NOT match and do not create a win.
    // Pick 3 random distinct symbols without Wilds
    const nonWilds = SYMBOLS.filter(s => s.name !== "Wild");
    const shuffled = nonWilds.sort(() => 0.5 - Math.random());
    return [shuffled[0], shuffled[1], shuffled[2]];
  }

  generateSlotOutcome(winProbability = 0.35) {
    const isWin = Math.random() < winProbability;
    
    if (isWin) {
      const winSymbol = this.getRandomWinningSymbol();
      let reels = [winSymbol, winSymbol, winSymbol];
      // Inject fake flair: 20% chance to replace one symbol with a Wild
      if (winSymbol.name !== "Wild" && Math.random() < 0.2) {
        const wildSymbol = SYMBOLS.find(s => s.name === "Wild");
        const replaceIdx = Math.floor(Math.random() * 3);
        reels[replaceIdx] = wildSymbol;
      }
      return {
        isWin: true,
        reels,
        payoutMulti: winSymbol.multiplier
      };
    } else {
      return {
        isWin: false,
        reels: this.getLosingReels(),
        payoutMulti: 0
      };
    }
  }
}

const gameService = new GameService();
export default gameService;
