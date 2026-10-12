import { ClientSession, Types } from 'mongoose';
import { UserDoc, UserModel } from '../models/user.model';

export class UserRepository {
  async findById(id: string | Types.ObjectId, session?: ClientSession): Promise<UserDoc | null> {
    return UserModel.findById(id).session(session ?? null);
  }

  async findByEmail(email: string, session?: ClientSession): Promise<UserDoc | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() }).session(session ?? null);
  }

  async findByGoogleSub(sub: string, session?: ClientSession): Promise<UserDoc | null> {
    return UserModel.findOne({ 'google.sub': sub }).session(session ?? null);
  }

  async create(data: Partial<UserDoc>, session?: ClientSession): Promise<UserDoc> {
    const [user] = await UserModel.create([data], { session });
    return user!;
  }

  async updatePassword(
    userId: string | Types.ObjectId,
    passwordHash: string,
    session?: ClientSession,
  ): Promise<UserDoc | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          passwordHash,
          'security.passwordChangedAt': new Date(),
        },
      },
      { new: true, session: session ?? null },
    );
  }

  async updateProfile(
    userId: string | Types.ObjectId,
    data: { name?: string; preferences?: Partial<UserDoc['preferences']> },
    session?: ClientSession,
  ): Promise<UserDoc | null> {
    const updateOps: Record<string, unknown> = {};
    if (data.name) updateOps.name = data.name;
    if (data.preferences) {
      for (const [k, v] of Object.entries(data.preferences)) {
        updateOps[`preferences.${k}`] = v;
      }
    }

    return UserModel.findByIdAndUpdate(
      userId,
      { $set: updateOps },
      { new: true, session: session ?? null },
    );
  }

  async markEmailVerified(userId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await UserModel.findByIdAndUpdate(
      userId,
      { $set: { emailVerifiedAt: new Date() } },
      { session: session ?? null },
    );
  }

  async linkGoogle(
    userId: string | Types.ObjectId,
    google: { sub: string; email: string },
    session?: ClientSession,
  ): Promise<UserDoc | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          google: {
            ...google,
            linkedAt: new Date(),
          },
        },
      },
      { new: true, session: session ?? null },
    );
  }

  async updateLastLogin(userId: string | Types.ObjectId): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { $set: { lastLoginAt: new Date() } });
  }

  async deletePermanently(userId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await UserModel.findByIdAndDelete(userId).session(session ?? null);
  }
}
