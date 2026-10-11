import { HealthController } from '../../modules/health/health.controller';
import { SystemClock } from '../../infrastructure/clock/system.clock';
import { type Clock } from '../ports/clock.port';

export class Container {
  private static instance: Container | null = null;

  // Ports / Infrastructure
  public readonly clock: Clock;

  // Controllers
  public readonly healthController: HealthController;

  private constructor() {
    this.clock = new SystemClock();
    this.healthController = new HealthController();
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}

export const container = Container.getInstance();
