import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
export declare const authorizeRoles: (...allowedRoles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=rbacMiddleware.d.ts.map