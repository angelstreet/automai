'use server';
// DEPRECATED: This file is deprecated. Import from @/app/actions/team instead.

export * from '@/app/actions/team';

console.warn(
  '[@deprecated] Importing from @/app/[locale]/[tenant]/team/actions is deprecated. ' +
    'Please import from @/app/actions/team instead.',
);
