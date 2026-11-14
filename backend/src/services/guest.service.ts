import crypto from "crypto";
import { ipKeyGenerator } from "express-rate-limit";

import { GuestSession } from "../models/guestSession.model";
import { Conversation } from "../models/conversation.model";
import { Message } from "../models/message.model";
import { ApiError } from "../utils/ApiError";
import { signGuestToken, verifyGuestToken } from "../utils/jwt";

// Read lazily so values come from .env regardless of import order.
const messageLimit = () => Number(process.env.GUEST_MESSAGE_LIMIT || 10);
const ttlHours = () => Number(process.env.GUEST_TTL_HOURS || 24);

/**
 * Keyed hash of the caller's network address. IPv6 addresses are grouped
 * by subnet (so rotating addresses inside one network doesn't earn a new
 * guest slot) and IPv4-mapped IPv6 is normalised to plain IPv4.
 */
function hashIp(ip: string): string {
  return crypto
    .createHmac("sha256", process.env.JWT_ACCESS_SECRET as string)
    .update(ipKeyGenerator(ip || "unknown"))
    .digest("hex");
}

export function guestUsage(session: { messageCount: number; expiresAt: Date }) {
  return {
    messagesUsed: session.messageCount,
    messageLimit: messageLimit(),
    expiresAt: session.expiresAt,
  };
}

// Abuse guard: how many live guest sessions one network may open. Generous,
// because a campus, office or mobile carrier shares one address among many
// real visitors.
const maxSessionsPerIp = () => Number(process.env.GUEST_MAX_SESSIONS_PER_IP || 50);

/**
 * Gives every visitor their own guest session.
 *  - valid, unexpired token -> resume that session
 *  - otherwise              -> create a new one (up to the per-network cap)
 */
export async function claimGuestSession(ip: string, existingToken?: string) {
  const ipHash = hashIp(ip);

  // Expired sessions shouldn't count against this network.
  await purgeExpiredGuests({ ipHash });

  if (existingToken) {
    try {
      const { guestId } = verifyGuestToken(existingToken);
      const existing = await GuestSession.findOne({
        _id: guestId,
        expiresAt: { $gt: new Date() },
      });

      if (existing) return { session: existing, token: existingToken };
    } catch {
      // Invalid or stale token: fall through and issue a fresh session.
    }
  }

  const active = await GuestSession.countDocuments({ ipHash });

  if (active >= maxSessionsPerIp()) {
    throw new ApiError(
      429,
      "Too many guest chats have been started from this network. Log in or create a free account to continue.",
      "GUEST_CAPACITY",
    );
  }

  const session = await GuestSession.create({
    ipHash,
    expiresAt: new Date(Date.now() + ttlHours() * 3600 * 1000),
  });

  return {
    session,
    token: signGuestToken(session.id, ttlHours() * 3600),
  };
}

/** Atomically counts one message against the guest's allowance. */
export async function consumeGuestMessage(guestId: string) {
  const updated = await GuestSession.findOneAndUpdate(
    { _id: guestId, messageCount: { $lt: messageLimit() } },
    { $inc: { messageCount: 1 } },
    { returnDocument: "after" },
  );

  if (!updated) {
    throw new ApiError(
      403,
      `You've used all ${messageLimit()} free guest messages. Create a free account to keep chatting.`,
      "GUEST_LIMIT_REACHED",
    );
  }

  return updated;
}

export async function isGuestSessionActive(guestId: string) {
  return !!(await GuestSession.exists({
    _id: guestId,
    expiresAt: { $gt: new Date() },
  }));
}

/** Deletes expired guest sessions together with their chats. */
export async function purgeExpiredGuests(extraFilter: Record<string, unknown> = {}) {
  const expired = await GuestSession.find({
    expiresAt: { $lte: new Date() },
    ...extraFilter,
  }).select("_id");

  if (expired.length === 0) return 0;

  const ids = expired.map((s) => s._id);
  const conversations = await Conversation.find({ guestId: { $in: ids } }).select("_id");

  await Message.deleteMany({ conversationId: { $in: conversations.map((c) => c._id) } });
  await Conversation.deleteMany({ guestId: { $in: ids } });
  await GuestSession.deleteMany({ _id: { $in: ids } });

  return ids.length;
}
