import { describe, expect, it } from 'vitest';
import { type CompanyLookupDto } from '@hiretrail/shared';
import {
  EMPTY_CREATE_FORM,
  formValuesToCreateInput,
  lookupToFormValues,
} from './admin-company-create';

const found: CompanyLookupDto = {
  isAiResult: true,
  found: true,
  fromCache: false,
  profile: {
    name: 'Acentura Inc',
    website: 'https://acentura.example',
    careersUrl: null,
    country: 'Sri Lanka',
    city: null,
    industry: 'Software',
    size: null,
    description: 'Software services.',
    linkedinUrl: 'https://www.linkedin.com/company/acentura',
    contactEmail: 'info@acentura.example',
    foundedYear: '2012',
    techStack: ['React', 'Node.js'],
  },
  sources: [{ url: 'https://acentura.example/about' }],
};

const notFound: CompanyLookupDto = {
  isAiResult: true,
  found: false,
  fromCache: false,
  profile: null,
  sources: [],
};

describe('admin add-company helpers', () => {
  it('fills the form from a found lookup, leaving unsourced fields empty', () => {
    const values = lookupToFormValues(found, 'Acentura');
    expect(values.name).toBe('Acentura Inc');
    expect(values.website).toBe('https://acentura.example');
    expect(values.careersUrl).toBe('');
    expect(values.city).toBe('');
    expect(values.linkedinUrl).toBe('https://www.linkedin.com/company/acentura');
    expect(values.foundedYear).toBe('2012');
    expect(values.techStack).toBe('React, Node.js');
  });

  it('starts from the searched name when nothing was found', () => {
    expect(lookupToFormValues(notFound, '  Acentura ')).toEqual({
      ...EMPTY_CREATE_FORM,
      name: 'Acentura',
    });
  });

  it('marks a lookup-based create and keeps the public source links', () => {
    const input = formValuesToCreateInput(
      lookupToFormValues(found, 'x'),
      found,
      ' Checked sources ',
    );
    expect(input.fromAiLookup).toBe(true);
    expect(input.sourceUrls).toEqual(['https://acentura.example/about']);
    expect(input.reason).toBe('Checked sources');
    expect(input.careersUrl).toBeNull();
    expect(input.contactEmail).toBe('info@acentura.example');
    expect(input.techStack).toEqual(['React', 'Node.js']);
  });

  it('marks a manual create as not from a lookup, with no sources', () => {
    const input = formValuesToCreateInput(
      { ...EMPTY_CREATE_FORM, name: ' Manual Ltd ' },
      null,
      'Added by hand',
    );
    expect(input.fromAiLookup).toBe(false);
    expect(input.sourceUrls).toEqual([]);
    expect(input.name).toBe('Manual Ltd');
    expect(input.region).toBeNull();
  });

  it('treats a lookup that found nothing as manual', () => {
    const input = formValuesToCreateInput(
      { ...EMPTY_CREATE_FORM, name: 'X Co' },
      notFound,
      'Added by hand',
    );
    expect(input.fromAiLookup).toBe(false);
  });
});
