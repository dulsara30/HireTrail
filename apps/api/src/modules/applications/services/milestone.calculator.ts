import { StatusCategory, ClosedReason } from '@hiretrail/shared';
import { ApplicationMilestones } from '../models/application.model';

export class MilestoneCalculator {
  public static calculateMilestones(
    currentMilestones: ApplicationMilestones = {},
    newCategory: StatusCategory,
    appliedDate?: Date,
    closedReason?: ClosedReason,
  ): ApplicationMilestones {
    const updated: ApplicationMilestones = { ...currentMilestones };
    const now = new Date();

    // 1. APPLIED or any later category when appliedAt is still empty
    if (newCategory !== StatusCategory.SAVED && !updated.appliedAt) {
      updated.appliedAt = appliedDate || now;
    }

    // 2. IN_PROGRESS, INTERVIEW, OFFER, ACCEPTED, or CLOSED with reason REJECTED sets firstResponseAt
    const isResponseCategory =
      [
        StatusCategory.IN_PROGRESS,
        StatusCategory.INTERVIEW,
        StatusCategory.OFFER,
        StatusCategory.ACCEPTED,
      ].includes(newCategory) ||
      (newCategory === StatusCategory.CLOSED && closedReason === ClosedReason.REJECTED);

    if (isResponseCategory && !updated.firstResponseAt) {
      updated.firstResponseAt = now;
    }

    // 3. INTERVIEW
    if (newCategory === StatusCategory.INTERVIEW && !updated.firstInterviewAt) {
      updated.firstInterviewAt = now;
    }

    // 4. OFFER (an accepted application also had an offer)
    if (
      (newCategory === StatusCategory.OFFER || newCategory === StatusCategory.ACCEPTED) &&
      !updated.offerAt
    ) {
      updated.offerAt = now;
    }

    // 5. ACCEPTED
    if (newCategory === StatusCategory.ACCEPTED && !updated.acceptedAt) {
      updated.acceptedAt = now;
    }

    // 6. CLOSED records closedAt and the reason; moving back to an active state clears both
    if (newCategory === StatusCategory.CLOSED) {
      updated.closedAt = now;
      updated.closedReason = closedReason ?? ClosedReason.OTHER;
    } else {
      updated.closedAt = undefined;
      updated.closedReason = undefined;
    }

    return updated;
  }
}
