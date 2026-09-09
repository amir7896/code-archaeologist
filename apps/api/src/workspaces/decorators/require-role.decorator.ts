import { SetMetadata } from '@nestjs/common';
import { type WorkspaceRoleName } from '@code-archaeologist/shared';

export const REQUIRE_ROLE_KEY = 'requireRole';

export const RequireRole = (role: WorkspaceRoleName) => SetMetadata(REQUIRE_ROLE_KEY, role);
