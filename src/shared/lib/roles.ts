import type { Role } from '@/shared/types';export const canManage=(r?:Role)=>r==='OWNER'||r==='MANAGER'
