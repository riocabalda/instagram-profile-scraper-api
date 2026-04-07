import mongoose from "mongoose";

const qualifiedSeedSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    following: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

qualifiedSeedSchema.index({ following: 1, username: 1 });

export default mongoose.model("QualifiedSeed", qualifiedSeedSchema);
