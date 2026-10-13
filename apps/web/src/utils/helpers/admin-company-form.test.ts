import { describe, expect, it } from 'vitest';
import { type CompanyDto } from '@hiretrail/shared';
import { companyToFormValues, formValuesToUpdateInput, isFormDirty } from './admin-company-form';

const company = {
  id: 'c1',
  name: 'Acme Labs',
  isGlobal: true,
  aliases: ['Acme', 'Acme Ltd'],
  techStack: ['Node.js', 'React'],
  region: 'LOCAL',
  tier: 'A',
  websiteUrl: 'https://acme.example',
  reportRatings: { culture: 4, overall: 3.5 },
  createdAt: '',
  updatedAt: '',
} as unknown as CompanyDto;

describe('admin company form helpers', () => {
  it('fills the form from a company, joining lists with commas', () => {
    const values = companyToFormValues(company);
    expect(values.aliases).toBe('Acme, Acme Ltd');
    expect(values.techStack).toBe('Node.js, React');
    expect(values.website).toBe('https://acme.example');
    expect(values.reportRatings.culture).toBe('4');
    expect(values.reportRatings.salary).toBe('');
  });

  it('builds the update with trimmed values, de-duplicated lists and nulls for blanks', () => {
    const values = {
      ...companyToFormValues(company),
      name: '  Acme Labs Ltd ',
      aliases: 'Acme, acme ,Acme, ',
      city: '   ',
      tier: '' as const,
    };
    const input = formValuesToUpdateInput(values, 3, ' Fix name ');
    expect(input.name).toBe('Acme Labs Ltd');
    expect(input.aliases).toEqual(['Acme', 'acme']);
    expect(input.city).toBeNull();
    expect(input.tier).toBeNull();
    expect(input.version).toBe(3);
    expect(input.reason).toBe('Fix name');
  });

  it('sends report ratings as numbers, or null when every one is blank', () => {
    const base = companyToFormValues(company);
    const withRatings = formValuesToUpdateInput(base, 0, 'reason');
    expect(withRatings.reportRatings?.culture).toBe(4);
    expect(withRatings.reportRatings?.salary).toBeNull();

    const cleared = formValuesToUpdateInput(
      {
        ...base,
        reportRatings: {
          culture: '',
          workExperience: '',
          salary: '',
          learning: '',
          overall: '',
          scale: '',
          appeal: '',
        },
      },
      0,
      'reason',
    );
    expect(cleared.reportRatings).toBeNull();
  });

  it('detects changes', () => {
    const values = companyToFormValues(company);
    expect(isFormDirty(values, company)).toBe(false);
    expect(isFormDirty({ ...values, name: 'Other' }, company)).toBe(true);
  });
});
