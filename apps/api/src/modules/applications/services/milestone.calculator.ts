import { StatusCategory, ClosedReason } from '@hiretrail/shared';
import { ApplicationMilestones } from '../models/application.model';

export class MilestoneCalculator {
  public static calculateMilestones(
    currentMilestones: ApplicationMilestones = {},
    newCategory: StatusCategory,
    appliedDate?: Date,
  ): ApplicationMilestones {
    const updated: ApplicationMilestones = { ...currentMilestones };
    const now = new Date();

    // 1. APPLIED or any later category when appliedAt is still empty
    if (newCategory !== StatusCategory.SAVED && !updated.appliedAt) {
      updated.appliedAt = appliedDate || now;
    }

    // 2. IN_PROGRESS, INTERVIEW, OFFER, ACCEPTED, or CLOSED with reason REJECTED sets firstResponseAt
    const isResponseCategory = [
      StatusCategory.SCREENING,
      StatusCategory.INTERVIEW,
      StatusCategory.OFFER,
      StatusCategory.REJECTED,
      StatusCategory.GHOSTED,
    ].includes(newCategory);

    if (isResponseCategory && !updated.firstResponseAt) {
      updated.firstResponseAt = now;
    }

    // 3. INTERVIEW
    if (newCategory === StatusCategory.INTERVIEW && !updated.firstInterviewAt) {
      updated.firstInterviewAt = now;
    }

    // 4. OFFER
    if (newCategory === StatusCategory.OFFER && !updated.offerAt) {
      updated.offerAt = now;
    }

    // 5. REJECTED or GHOSTED (Closed status)
    if (newCategory === StatusCategory.REJECTED) {
      updated.closedAt = now;
      updated.closedReason = ClosedReason.REJECTED;
    } else if (newCategory === StatusCategory.GHOSTED) {
      updated.closedAt = now;
      updated.closedReason = ClosedReason.GHOSTED;
    } else {
      // Moving back to active states clears closedAt and closedReason
      updated.closedAt = undefined;
      updated.closedReason = undefined;
    }

    return updated;
  }
}
