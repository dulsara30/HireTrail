import { describe, expect, it } from 'vitest';
import { aiToQuickAdd, parseQuickAdd } from './quick-add';

// Wed 14 Oct 2026, 10:00 local time
const NOW = new Date(2026, 9, 14, 10, 0, 0);
const day = (d: Date | null) =>
  d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null;

describe('parseQuickAdd', () => {
  it('reads the example sentence: a reminder, two weeks from now, for a company', () => {
    const r = parseQuickAdd('Remind me to check Altrium careers page in 2 weeks', NOW);
    expect(r.kind).toBe('REMINDER');
    expect(r.title).toBe('Check Altrium careers page');
    expect(r.companyQuery).toBe('Altrium');
    expect(day(r.dueAt)).toBe('2026-10-28');
    expect(r.allDay).toBe(true);
    expect(r.dateText).toBe('in 2 weeks');
    expect(r.recurrence).toBeNull();
  });

  it('keeps the time when one is given and marks the day as not all-day', () => {
    const r = parseQuickAdd('Call Sysco tomorrow at 3pm', NOW);
    expect(r.kind).toBe('CALL');
    expect(r.allDay).toBe(false);
    expect(r.dueAt?.getDate()).toBe(15);
    expect(r.dueAt?.getHours()).toBe(15);
    expect(r.title).toBe('Call Sysco');
  });

  it('understands weekdays and always looks forward', () => {
    const r = parseQuickAdd('Interview with ASTA next monday 10am', NOW);
    expect(r.kind).toBe('INTERVIEW');
    expect(r.dueAt!.getTime()).toBeGreaterThan(NOW.getTime());
    expect(r.dueAt?.getDay()).toBe(1);
    expect(r.dueAt?.getHours()).toBe(10);
  });

  it('picks up @company, #tags and !priority and removes them from the title', () => {
    const r = parseQuickAdd(
      'Send portfolio to recruiter @"Sysco LABS" #prep #cv !high friday',
      NOW,
    );
    expect(r.companyQuery).toBe('Sysco LABS');
    expect(r.tags).toEqual(['prep', 'cv']);
    expect(r.priority).toBe('HIGH');
    expect(r.title).toBe('Send portfolio to recruiter');
    expect(r.dueAt?.getDay()).toBe(5);

    const plain = parseQuickAdd('Email @Altrium about the offer !low', NOW);
    expect(plain.companyQuery).toBe('Altrium');
    expect(plain.priority).toBe('LOW');
    expect(plain.title).toBe('Email about the offer');
  });

  it('detects follow-ups, deadlines and meetings', () => {
    expect(parseQuickAdd('Follow up with iLabs in 3 days', NOW).kind).toBe('FOLLOW_UP');
    expect(parseQuickAdd('Application deadline Codrizon on 30 Oct', NOW).kind).toBe('DEADLINE');
    expect(parseQuickAdd('Meeting with the team lead tomorrow 11am', NOW).kind).toBe('MEETING');
  });

  it('falls back to a plain task with no date', () => {
    const r = parseQuickAdd('  update my cv  ', NOW);
    expect(r).toMatchObject({
      kind: 'TASK',
      kindDetected: false,
      dueAt: null,
      allDay: false,
      title: 'Update my cv',
      tags: [],
      companyQuery: null,
      priority: null,
      recurrence: null,
      watchUrl: null,
      unsure: false,
    });
  });

  it('never returns an empty title', () => {
    expect(parseQuickAdd('tomorrow', NOW).title.length).toBeGreaterThan(0);
    expect(parseQuickAdd('#only !high', NOW).title).toBe('Only');
  });
});

describe('parseQuickAdd: company watch and repeats', () => {
  it('understands just "company watch" as a company watch with a first check in two weeks', () => {
    const r = parseQuickAdd('company watch', NOW);
    expect(r.kind).toBe('WATCH');
    expect(r.kindDetected).toBe(true);
    expect(r.title).toBe('Company watch');
    expect(r.companyQuery).toBeNull();
    expect(day(r.dueAt)).toBe('2026-10-28');
    expect(r.allDay).toBe(true);
  });

  it('finds the company in "company watch Altrium" and builds a proper title', () => {
    const r = parseQuickAdd('company watch Altrium', NOW);
    expect(r.kind).toBe('WATCH');
    expect(r.companyQuery).toBe('Altrium');
    expect(r.title).toBe('Check Altrium careers');
  });

  it('reads a repeating watch: every 2 weeks', () => {
    const r = parseQuickAdd('Watch Altrium careers every 2 weeks', NOW);
    expect(r.kind).toBe('WATCH');
    expect(r.companyQuery).toBe('Altrium');
    expect(r.title).toBe('Check Altrium careers');
    expect(r.recurrence).toEqual({ freq: 'WEEKLY', interval: 2 });
    expect(r.recurrenceText).toBe('every 2 weeks');
    expect(day(r.dueAt)).toBe('2026-10-28');
  });

  it('reads a multi-word company and a monthly repeat', () => {
    const r = parseQuickAdd('Keep an eye on Sysco LABS jobs monthly', NOW);
    expect(r.kind).toBe('WATCH');
    expect(r.companyQuery).toBe('Sysco LABS');
    expect(r.recurrence).toEqual({ freq: 'MONTHLY', interval: 1 });
    expect(day(r.dueAt)).toBe('2026-11-14');
  });

  it('reads "every monday" as a weekly repeat starting next Monday', () => {
    const r = parseQuickAdd('check Altrium website every monday', NOW);
    expect(r.kind).toBe('WATCH');
    expect(r.title).toBe('Check Altrium website');
    expect(r.recurrence).toEqual({ freq: 'WEEKLY', interval: 1 });
    expect(r.dueAt?.getDay()).toBe(1);
    expect(r.dueAt!.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('reads the other ways to say a repeat', () => {
    expect(parseQuickAdd('stretch daily', NOW).recurrence).toEqual({ freq: 'DAILY', interval: 1 });
    expect(parseQuickAdd('review pipeline every other week', NOW).recurrence).toEqual({
      freq: 'WEEKLY',
      interval: 2,
    });
    expect(parseQuickAdd('send update biweekly', NOW).recurrence).toEqual({
      freq: 'WEEKLY',
      interval: 2,
    });
    expect(parseQuickAdd('pay fees every 3 months', NOW).recurrence).toEqual({
      freq: 'MONTHLY',
      interval: 3,
    });
  });

  it('gives a repeating item without a date its first date one step from today', () => {
    const r = parseQuickAdd('send weekly update', NOW);
    expect(r.recurrence).toEqual({ freq: 'WEEKLY', interval: 1 });
    expect(day(r.dueAt)).toBe('2026-10-21');
    expect(r.allDay).toBe(true);
  });

  it('keeps a plain "check the careers page" without a repeat as a reminder, not a watch', () => {
    const r = parseQuickAdd('check Altrium careers page tomorrow', NOW);
    expect(r.kind).toBe('REMINDER');
    expect(r.companyQuery).toBe('Altrium');
  });

  it('takes a web address as the page to check and keeps the host name in the title', () => {
    const r = parseQuickAdd('Check https://www.altrium.io/careers in 2 weeks', NOW);
    expect(r.watchUrl).toBe('https://www.altrium.io/careers');
    expect(r.title).toContain('altrium.io');
    expect(day(r.dueAt)).toBe('2026-10-28');
  });

  it('prefers an explicit @company over a guessed one', () => {
    const r = parseQuickAdd('company watch careers @"Sysco LABS"', NOW);
    expect(r.companyQuery).toBe('Sysco LABS');
    expect(r.kind).toBe('WATCH');
  });

  it('does not take a generic word as a company', () => {
    expect(parseQuickAdd('watch their careers page', NOW).companyQuery).toBeNull();
    expect(parseQuickAdd('company watch the company', NOW).companyQuery).toBeNull();
  });

  it('does not mistake ordinary sentences for a watch', () => {
    expect(parseQuickAdd('watch the interview prep video', NOW).kind).not.toBe('WATCH');
    expect(parseQuickAdd('track my expenses', NOW).kind).toBe('TASK');
  });

  it('says when the words were not enough, so the AI refine button can be suggested', () => {
    expect(
      parseQuickAdd('think about what to ask the recruiter regarding growth', NOW).unsure,
    ).toBe(true);
    expect(parseQuickAdd('update my cv', NOW).unsure).toBe(false);
    expect(parseQuickAdd('Call Sysco about the offer details today', NOW).unsure).toBe(false);
  });
});

describe('aiToQuickAdd', () => {
  it('turns the AI answer into the same shape', () => {
    const r = aiToQuickAdd({
      title: 'Check Altrium careers',
      kind: 'WATCH',
      dueAt: '2026-10-28T00:00:00.000Z',
      allDay: true,
      priority: null,
      tags: ['jobs'],
      company: 'Altrium',
      recurrence: { freq: 'WEEKLY', interval: 2 },
      watchUrl: null,
    });
    expect(r).toMatchObject({
      kind: 'WATCH',
      companyQuery: 'Altrium',
      recurrence: { freq: 'WEEKLY', interval: 2 },
      tags: ['jobs'],
      unsure: false,
    });
    expect(r.dueAt?.toISOString()).toBe('2026-10-28T00:00:00.000Z');
  });
});
