import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import {
  ORBIT_GRID,
  ORBIT_WIDGET_META,
  ORBIT_TEXT_LIMITS,
  type CreateOrbitSpaceInput,
  type OrbitSpaceDto,
  type OrbitWidgetInput,
  type UpdateOrbitSpaceInput,
} from '@hiretrail/shared';
import { NotFoundError, ValidationError } from '../../../core/errors/domain-errors';
import { OrbitMapper } from '../mappers/orbit.mapper';
import { type OrbitSpaceDoc, type OrbitWidgetDoc } from '../models/orbit-space.model';
import { type OrbitSpaceRepository } from '../repositories/orbit-space.repository';
import { isProWidget, limitReached, limitsFor, proRequired } from './orbit-plan';
import { widgetsForTemplate } from './orbit-templates';
import { type OrbitActor } from './orbit-task-command.service';

const MAX_CONFIG_CHARS = 4000;

/** Saved layouts ("spaces") of the Orbit board. */
export class OrbitSpaceService {
  constructor(private readonly spaces: OrbitSpaceRepository) {}

  /** All spaces. The first time, a default one is created. */
  public async list(actor: OrbitActor): Promise<OrbitSpaceDto[]> {
    let docs = await this.spaces.listForUser(actor.id);
    if (docs.length === 0) {
      await this.spaces.createSpace({
        userId: this.owner(actor.id),
        name: 'Today',
        order: 0,
        widgets: widgetsForTemplate('TODAY'),
      });
      docs = await this.spaces.listForUser(actor.id);
    }
    return docs.map(OrbitMapper.toSpaceDto);
  }

  public async create(actor: OrbitActor, input: CreateOrbitSpaceInput): Promise<OrbitSpaceDto> {
    const limits = limitsFor(actor.plan);
    const count = await this.spaces.countForUser(actor.id);
    if (count >= limits.spaces) throw limitReached(actor.plan, 'spaces', limits.spaces);
    if (input.template && !limits.templates) throw proRequired('Space templates');

    const doc = await this.spaces.createSpace({
      userId: this.owner(actor.id),
      name: input.name,
      order: count,
      widgets: widgetsForTemplate(input.template ?? 'TODAY'),
    });
    return OrbitMapper.toSpaceDto(doc);
  }

  public async update(
    actor: OrbitActor,
    id: string,
    input: UpdateOrbitSpaceInput,
  ): Promise<OrbitSpaceDto> {
    const existing = await this.requireOwned(actor.id, id);
    const changes: Record<string, unknown> = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.widgets !== undefined) {
      changes.widgets = this.validateWidgets(actor, existing, input.widgets);
    }
    const updated = await this.spaces.updateOwnedWithVersion(actor.id, id, input.version, {
      $set: changes,
    });
    return OrbitMapper.toSpaceDto(updated);
  }

  public async delete(actor: OrbitActor, id: string): Promise<void> {
    await this.requireOwned(actor.id, id);
    if ((await this.spaces.countForUser(actor.id)) <= 1) {
      throw new ValidationError('Keep at least one space');
    }
    await this.spaces.deleteOwned(actor.id, id);
  }

  /**
   * Checks the layout: sizes, the grid edges, ids, how many widgets, and which types the plan allows.
   * A Pro-only widget already on the board stays after leaving Pro; new ones cannot be added.
   */
  private validateWidgets(
    actor: OrbitActor,
    existing: OrbitSpaceDoc,
    widgets: OrbitWidgetInput[],
  ): OrbitWidgetDoc[] {
    const limits = limitsFor(actor.plan);
    if (widgets.length > limits.widgetsPerSpace) {
      throw limitReached(actor.plan, 'widgets per space', limits.widgetsPerSpace);
    }
    const known = new Map(existing.widgets.map((w) => [w.id, w.type]));
    const ids = new Set<string>();

    return widgets.map((w) => {
      if (ids.has(w.id)) throw new ValidationError('Widget ids must be unique');
      ids.add(w.id);

      const meta = ORBIT_WIDGET_META[w.type];
      if (w.x + w.w > ORBIT_GRID.COLUMNS)
        throw new ValidationError('A widget goes past the grid edge');
      if (w.w < meta.minW || w.h < meta.minH) {
        throw new ValidationError(`${meta.label} is too small`);
      }
      const isNew = known.get(w.id) !== w.type;
      if (isNew && isProWidget(w.type) && actor.plan !== 'PRO') throw proRequired(meta.label);

      const config = (w.config ?? {}) as Record<string, unknown>;
      if (JSON.stringify(config).length > MAX_CONFIG_CHARS) {
        throw new ValidationError('A widget has too many settings');
      }
      const note = config.text;
      if (typeof note === 'string' && note.length > ORBIT_TEXT_LIMITS.WIDGET_NOTE_MAX) {
        throw new ValidationError('The note is too long');
      }
      return { id: w.id || randomUUID(), type: w.type, x: w.x, y: w.y, w: w.w, h: w.h, config };
    });
  }

  private async requireOwned(userId: string, id: string): Promise<OrbitSpaceDoc> {
    const doc = await this.spaces.findOwnedById(userId, id);
    if (!doc) throw new NotFoundError(undefined, 'Space not found');
    return doc;
  }

  private owner(userId: string) {
    return new Types.ObjectId(userId);
  }
}
