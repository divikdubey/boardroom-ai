import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    idea: { type: String, required: true },
    market: String,
    competitors: String,
    critic: String,
    financial: String,
    judge: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);