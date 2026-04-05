import mongoose from "mongoose";

const inputSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Input", inputSchema);
