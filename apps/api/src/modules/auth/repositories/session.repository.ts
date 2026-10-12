import { ClientSession, Types } from 'mongoose';
import { RevokeReason, SessionDoc, SessionModel } from '../models/session.model';

export class SessionRepository {
  async create(
    data: {
      userId: Types.ObjectId | string;
      familyId: string;
      tokenHash: string;
      expiresAt: Date;
      userAgent?: string;
      ipHash?: string;
    },
    session?: ClientSession,
  ): Promise<SessionDoc> {
    const [created] = await SessionModel.create([data], { session });
    return created!;
  }

  async findByTokenHash(tokenHash: string, session?: ClientSession): Promise<SessionDoc | null> {
    return SessionModel.findOne({ tokenHash }).session(session ?? null);
  }

  async findByAnyTokenHash(tokenHash: string, session?: ClientSession): Promise<SessionDoc | null> {
    return SessionModel.findOne({
      $or: [{ tokenHash }, { previousTokenHash: tokenHash }],
    }).session(session ?? null);
  }

  async findActiveById(id: string | Types.ObjectId): Promise<SessionDoc | null> {
    return SessionModel.findOne({ _id: id, revokedAt: null });
  }

  async rotateToken(
    sessionId: Types.ObjectId | string,
    currentTokenHash: string,
    newTokenHash: string,
    session?: ClientSession,
  ): Promise<SessionDoc | null> {
    return SessionModel.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          tokenHash: newTokenHash,
          previousTokenHash: currentTokenHash,
          rotatedAt: new Date(),
          lastUsedAt: new Date(),
        },
      },
      { new: true, session: session ?? null },
    );
  }

  async revokeSession(
    sessionId: Types.ObjectId | string,
    reason: RevokeReason,
    session?: ClientSession,
  ): Promise<void> {
    await SessionModel.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: reason,
        },
      },
      { session: session ?? null },
    );
  }

  async revokeFamily(
    familyId: string,
    reason: RevokeReason,
    session?: ClientSession,
  ): Promise<void> {
    await SessionModel.updateMany(
      { familyId, revokedAt: null },
      {
        $set: {
          revokedAt: new Date(),
          revokedReason: reason,
        },
      },
      { session },
    );
  }

  async revokeAllUserSessions(
    userId: Types.ObjectId | string,
    reason: RevokeReason,
    exceptSessionId?: Types.ObjectId | string,
    session?: ClientSession,
  ): Promise<void> {
    const targetUserId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const activeSessions = await SessionModel.find({
      userId: targetUserId,
      revokedAt: null,
    }).session(session ?? null);

    for (const sessionDoc of activeSessions) {
      if (!exceptSessionId || sessionDoc._id.toString() !== exceptSessionId.toString()) {
        await SessionModel.findByIdAndUpdate(
          sessionDoc._id,
          {
            $set: {
              revokedAt: new Date(),
              revokedReason: reason,
            },
          },
          { session: session ?? null },
        );
      }
    }
  }

  async listActiveByUser(userId: Types.ObjectId | string): Promise<SessionDoc[]> {
    return SessionModel.find({
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ lastUsedAt: -1 });
  }
}
