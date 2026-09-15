import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Tandai route/controller ini boleh diakses tanpa token JWT. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
