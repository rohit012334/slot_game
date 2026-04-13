import User from '../models/User.js';
import Bet from '../models/Bet.js';
import gameService from '../services/gameService.js';

const betTimeouts = new Map();
const MIN_BET = 100;
const MAX_BET = 100000000;
const GAME_TAG = "slot";

const processSingleSlotBetSocket = async (betItem, socket) => {
  const userId = betItem.userId;
  const amount = betItem.amount;
  const parsedAmount = Math.floor(parseInt(amount));

  if (!userId) throw new Error("userId required");
  if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Invalid amount");
  if (parsedAmount < MIN_BET) throw new Error(`Minimum bet ${MIN_BET}`);
  if (parsedAmount > MAX_BET) throw new Error(`Maximum bet 10 Crore`);

  const user = await User.findOneAndUpdate(
    { firebaseUid: userId, coin: { $gte: parsedAmount }, isBlock: false },
    { $inc: { coin: -parsedAmount } },
    { new: true }
  );

  if (!user) throw new Error(`Insufficient coins`);

  // Generate Smart RTP Outcome
  const outcome = gameService.generateSlotOutcome(0.35); // 35% Win rate -> ~67% RTP
  const reels = outcome.reels;
  const isWin = outcome.isWin;
  const payoutMulti = outcome.payoutMulti;

  const payout = isWin ? Math.floor(parsedAmount * payoutMulti) : 0;
  const won = isWin;

  // Simulate 5 seconds slot spin
  await new Promise(resolve => setTimeout(resolve, 5000));

  if (payout > 0) {
    await User.findOneAndUpdate(
      { firebaseUid: userId },
      { $inc: { coin: payout } }
    );
  } else {
    await User.findOneAndUpdate(
      { firebaseUid: userId },
      { $inc: { spentCoins: parsedAmount } }
    );
  }

  const betData = {
    game: GAME_TAG,
    userId,
    roundId: betItem.roundId || `spin_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    amount: parsedAmount,
    timestamp: Date.now(),
    won,
    payout,
    resultSymbols: reels.map(r => r.emoji),
    status: "settled"
  };

  await Bet.create(betData);
  const updatedUser = await User.findOne({ firebaseUid: userId }).select('coin');

  return {
    message: won ? `Won ${payout}!` : "Better luck next time!",
    coin: updatedUser.coin,
    amount: parsedAmount,
    won,
    payout,
    resultSymbols: betData.resultSymbols
  };
};

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    gameService.onlineCount++;
    console.log("🤝 User connected:", socket.id, "| Online:", gameService.onlineCount);

    socket.on('bet', async (data) => {
      const now = Date.now();
      const lastBet = betTimeouts.get(socket.id);
      if (lastBet && now - lastBet < 100) {
        return socket.emit('error', { message: "Too many requests" });
      }
      betTimeouts.set(socket.id, now);

      try {
        const betsToProcess = Array.isArray(data) ? data : [data];
        for (const b of betsToProcess) {
          try {
            const result = await processSingleSlotBetSocket(b, socket);
            socket.emit('betConfirmed', result);
          } catch (err) {
            socket.emit('betError', { message: err.message });
          }
        }
      } catch (err) {
        console.error("Batch bet error:", err);
        socket.emit('error', { message: "Server error" });
      }
    });

    socket.on('disconnect', () => {
      gameService.onlineCount = Math.max(0, gameService.onlineCount - 1);
      if (socket.userId) gameService.removeSocketMapping(socket.userId);
      betTimeouts.delete(socket.id);
      console.log("⛵ Disconnected:", socket.id, "| Online:", gameService.onlineCount);
    });
  });
};

setInterval(() => {
  if (global.ioInstance) {
    global.ioInstance.emit('ONLINE_COUNT', { type: "ONLINE_COUNT", data: gameService.onlineCount });
  }
}, 5000);

export default socketHandler;