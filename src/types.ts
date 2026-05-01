export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  monthlyBudget: number;
  currency: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: number;
  description: string;
  userId: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  userId: string;
}

export interface Budget {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  limit: number;
  categoryId?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
