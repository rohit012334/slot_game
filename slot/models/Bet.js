import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
  game: { type: String, default: "slot", index: true },
  userId: { type: String, required: true },
  roundId: { type: String, required: false }, // No longer strictly needed for slot maybe
  side: { type: String, required: false },
  resultSymbols: { type: [String], default: [] },
  amount: { type: Number, required: true },
  won: { type: Boolean, default: false },
  payout: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "settled"], default: "pending" },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

betSchema.index({ userId: 1, game: 1, createdAt: -1 });
betSchema.index({ roundId: 1, game: 1 });


const Bet = mongoose.model('Bet', betSchema);
export default Bet;