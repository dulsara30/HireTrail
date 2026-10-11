import { Clock } from '../../core/ports/clock.port';

export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}
