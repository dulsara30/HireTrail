import React from 'react';
import { useApplicationsInfinite } from '../../../api/hooks/queries/useApplicationsInfinite';
import { useCompanySearch } from '../../../api/hooks/queries/useCompanySearch';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { LinkPicker, type LinkFieldProps } from './LinkPicker';

export const ApplicationLinkField: React.FC<LinkFieldProps> = ({ value, onChange }) => {
  const [query, setQuery] = React.useState('');
  const q = useDebouncedValue(query.trim(), 250);
  const { data, isLoading } = useApplicationsInfinite({
    q: q || undefined,
    archived: false,
    limit: 8,
  });
  const options = (data?.pages[0]?.items ?? []).slice(0, 8).map((a) => ({
    id: a.id,
    label: `${a.roleTitle} at ${a.companyName}`,
    sub: a.resolvedStatus?.label,
  }));
  return (
    <LinkPicker
      id="orbit-link-application"
      label="Application"
      value={value}
      onChange={onChange}
      query={query}
      onQueryChange={setQuery}
      options={options}
      isLoading={isLoading}
      placeholder="Link an application"
    />
  );
};

export const CompanyLinkField: React.FC<LinkFieldProps> = ({ value, onChange }) => {
  const [query, setQuery] = React.useState('');
  const q = useDebouncedValue(query.trim(), 250);
  const { data, isLoading } = useCompanySearch(q, true);
  const options = (data ?? []).map((c) => ({
    id: c.id,
    label: c.name,
    sub: c.location ?? undefined,
  }));
  return (
    <LinkPicker
      id="orbit-link-company"
      label="Company"
      value={value}
      onChange={onChange}
      query={query}
      onQueryChange={setQuery}
      options={options}
      isLoading={isLoading}
      placeholder="Link a company"
    />
  );
};
