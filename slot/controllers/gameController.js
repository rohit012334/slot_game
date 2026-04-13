import User from '../models/User.js';
import Bet from '../models/Bet.js';
import RoundResult from '../models/RoundResult.js';
import gameService from '../services/gameService.js';

const MIN_BET = 100;
const MAX_BET = 100000000;
const GAME_TAG = "slot";

const normalizeUserId = (value) => String(value || '').trim();

export const getWallet = async (req, res) => {
  const userId = normalizeUserId(req.params.userId);
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    const user = await User.findOne({ firebaseUid: userId }).select('coin uniqueId name');
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ coin: user.coin });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getCurrentRound = (req, res) => {
  // Slot is single-player and doesn't have rounds. Dummy response.
  res.json({
    roundId: "slot-mode",
    time: 5,
    status: "betting",
    totals: {}
  });
};

export const getHistory = async (req, res) => {
  const userId = normalizeUserId(req.params.userId);
  if (!userId) return res.status(400).json({ error: "userId required" });
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const query = { userId, game: GAME_TAG };

  try {
    const total = await Bet.countDocuments(query);
    const bets = await Bet.find(query)
      .sort({ createdAt: -1, timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: bets.map(bet => ({
        settlementStatus: bet.status,
        roundId: bet.roundId,
        amount: bet.amount,
        won: bet.won,
        payout: bet.payout,
        net: bet.payout - bet.amount,
        resultSymbols: bet.resultSymbols,
        status: bet.won ? "win" : "loss",
        timestamp: bet.timestamp
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const processSingleSlotBet = async (betItem) => {
  const userId = betItem.userId;
  const amount = betItem.amount;
  const parsedAmount = Math.floor(parseInt(amount));

  if (!userId) throw new Error("userId required");
  if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Invalid amount");
  if (parsedAmount < MIN_BET) throw new Error(`Minimum bet ${MIN_BET}`);
  if (parsedAmount > MAX_BET) throw new Error("Maximum bet 10 Crore");

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

  // Simulate 5 seconds slot spin as requested: "5 seconds ke baad result aayga"
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

  const newBet = await Bet.create(betData);

  return { 
    success: true, 
    message: won ? `Won ${payout}!` : "Better luck next time!", 
    won, 
    payout, 
    resultSymbols: betData.resultSymbols, 
    amount: parsedAmount
  };
};

export const placeBet = async (req, res) => {
  try {
    const data = req.body;
    const betsToProcess = Array.isArray(data) ? data : [data];
    const results = await Promise.all(
      betsToProcess.map(async (b) => {
        try {
          const resObj = await processSingleSlotBet(b);
          const user = await User.findOne({ firebaseUid: b.userId }).select('coin');
          resObj.coin = user ? user.coin : 0;
          return resObj;
        } catch (err) {
          return { success: false, message: err.message };
        }
      })
    );

    const anySucceeded = results.some(r => r.success);
    const allFailed = results.every(r => !r.success);

    if (allFailed && betsToProcess.length > 0) {
      return res.status(400).json({ success: false, results });
    }

    res.json({ success: anySucceeded, results });
  } catch (err) {
    console.error("HTTP Bet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getRecentResults = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const total = await Bet.countDocuments({ game: GAME_TAG, status: "settled" });
    const results = await Bet.find({ game: GAME_TAG, status: "settled" })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select('userId amount won payout resultSymbols timestamp');

    res.json({
      data: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getRoundStats = (req, res) => {
  // Dummy
  res.json({ roundId: "slot", totals: {} });
};
