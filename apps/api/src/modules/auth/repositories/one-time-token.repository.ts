import { ClientSession, Types } from 'mongoose';
import {
  OneTimeTokenDoc,
  OneTimeTokenModel,
  OneTimeTokenPurpose,
} from '../models/one-time-token.model';

export class OneTimeTokenRepository {
  async create(
    data: {
      userId: Types.ObjectId | string;
      purpose: OneTimeTokenPurpose;
      tokenHash: string;
      expiresAt: Date;
    },
    session?: ClientSession,
  ): Promise<OneTimeTokenDoc> {
    // Invalidate existing unused tokens for same purpose
    await OneTimeTokenModel.updateMany(
      {
        userId: data.userId,
        purpose: data.purpose,
        usedAt: null,
      },
      {
        $set: { usedAt: new Date() },
      },
      { session },
    );

    const [created] = await OneTimeTokenModel.create([data], { session });
    return created!;
  }

  async findValidByTokenHash(
    tokenHash: string,
    purpose: OneTimeTokenPurpose,
    session?: ClientSession,
  ): Promise<OneTimeTokenDoc | null> {
    return OneTimeTokenModel.findOne({
      tokenHash,
      purpose,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    }).session(session ?? null);
  }

  async markUsed(id: Types.ObjectId | string, session?: ClientSession): Promise<void> {
    await OneTimeTokenModel.findByIdAndUpdate(
      id,
      { $set: { usedAt: new Date() } },
      { session: session ?? null },
    );
  }
}
