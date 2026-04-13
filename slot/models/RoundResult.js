import mongoose from 'mongoose';

const roundResultSchema = new mongoose.Schema({
  game: { type: String, default: "teenpatti", index: true },
  roundId: { type: String, unique: true, required: true },
  winner: { type: String, enum: ["A", "B", "C"], required: true },
  winnerIndex: { type: Number },
  timestamp: { type: Date, default: Date.now },
}, { 
  timestamps: true,
  strict: false 
});

const RoundResult = mongoose.model('RoundResult', roundResultSchema);
export default RoundResult;
