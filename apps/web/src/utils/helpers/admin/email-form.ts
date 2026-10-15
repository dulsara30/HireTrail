import {
  ADMIN_EMAIL_TEMPLATE_META,
  adminEmailPreviewSchema,
  type AdminEmailPreviewInput,
  type AdminEmailTemplate,
  type AdminSendEmailInput,
} from '@hiretrail/shared';

export interface EmailFormValues {
  template: AdminEmailTemplate;
  subject: string;
  heading: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
}

/** A fresh form filled with the template's suggested wording. */
export function emailFormFor(template: AdminEmailTemplate): EmailFormValues {
  const meta = ADMIN_EMAIL_TEMPLATE_META[template];
  return {
    template,
    subject: meta.defaultSubject,
    heading: meta.defaultHeading,
    message: meta.defaultMessage,
    ctaLabel: meta.defaultCtaLabel,
    ctaUrl: '',
  };
}

/** Empty optional fields are left out so the server falls back to the template defaults. */
export function toPreviewPayload(values: EmailFormValues): AdminEmailPreviewInput {
  return {
    template: values.template,
    subject: values.subject.trim(),
    heading: values.heading.trim() || undefined,
    message: values.message.trim() || undefined,
    ctaLabel: values.ctaLabel.trim() || undefined,
    ctaUrl: values.ctaUrl.trim() || undefined,
  };
}

export function toSendPayload(values: EmailFormValues, userIds: string[]): AdminSendEmailInput {
  return { ...toPreviewPayload(values), userIds };
}

/** The first problem with the form, or null when it can be sent. */
export function emailFormError(values: EmailFormValues): string | null {
  try {
    adminEmailPreviewSchema.validateSync(toPreviewPayload(values));
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Check the form';
  }
}
