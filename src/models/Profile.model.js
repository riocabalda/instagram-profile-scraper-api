import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const profileSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true, // apify profile id
    },
    full_name: { type: String, default: "" },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    url: { type: String, default: "" },
    input_url: { type: String, default: "" },
    followers_count: { type: Number, default: 0 },
    follows_count: { type: Number, default: 0 },
    bio: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "checked", "error"],
      default: "pending",
    },
    external_url: { type: String, default: "" },
  },
  { timestamps: true, _id: false },
);

profileSchema.plugin(mongoosePaginate);
profileSchema.index({ status: 1, createdAt: -1 });
export default mongoose.model("Profile", profileSchema);
