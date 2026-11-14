import { Schema, model } from "mongoose";

/**
 * One anonymous "guest" session per visitor (browser). The raw IP is never
 * stored, only a keyed hash of it, and it is used purely to cap how many
 * guest sessions one network can open (abuse protection), not to give a
 * network a single shared slot.
 */
const guestSessionSchema = new Schema(
  {
    ipHash: {
      type: String,
      required: true,
      index: true, // NOT unique: many visitors can share one network
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export const GuestSession = model("GuestSession", guestSessionSchema);
