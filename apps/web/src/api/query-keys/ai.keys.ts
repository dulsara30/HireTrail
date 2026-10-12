export const aiKeys = {
  all: ['ai'] as const,
  usage: () => [...aiKeys.all, 'usage'] as const,
};
