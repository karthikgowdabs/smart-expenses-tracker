import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Expense, Category, Budget, OperationType } from '../types';

// Expenses
export function subscribeExpenses(userId: string, callback: (expenses: Expense[]) => void) {
  const path = `users/${userId}/expenses`;
  const q = query(collection(db, path), orderBy('date', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
    callback(expenses);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function addExpense(userId: string, expense: Omit<Expense, 'id' | 'userId'>) {
  const path = `users/${userId}/expenses`;
  try {
    await addDoc(collection(db, path), { ...expense, userId, createdAt: Date.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateExpense(userId: string, id: string, data: Partial<Expense>) {
  const path = `users/${userId}/expenses/${id}`;
  try {
    await updateDoc(doc(db, path), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteExpense(userId: string, id: string) {
  const path = `users/${userId}/expenses/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Categories
export function subscribeCategories(userId: string, callback: (categories: Category[]) => void) {
  const path = `users/${userId}/categories`;
  const q = query(collection(db, path), orderBy('name', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    callback(categories);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function getCategories(userId: string) {
  const path = `users/${userId}/categories`;
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addCategory(userId: string, category: Omit<Category, 'id' | 'userId'>) {
  const path = `users/${userId}/categories`;
  try {
    await addDoc(collection(db, path), { ...category, userId });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCategory(userId: string, id: string) {
  console.log('[deleteCategory] Sequential deletion started for ID:', id);
  
  try {
    // 1. Update associated expenses
    const expensesPath = `users/${userId}/expenses`;
    const expensesQuery = query(collection(db, expensesPath), where('categoryId', '==', id));
    const expenseDocs = await getDocs(expensesQuery);
    console.log(`[deleteCategory] Found ${expenseDocs.size} expenses to re-categorize`);
    
    // Update expenses one by one or in smaller chunks if needed, but for now we try sequential to see errors
    const expenseUpdates = expenseDocs.docs.map(d => updateDoc(d.ref, { categoryId: '' }));
    await Promise.all(expenseUpdates);
    console.log('[deleteCategory] Expenses updated');

    // 2. Delete associated budgets
    const budgetsPath = `users/${userId}/budgets`;
    const budgetsQuery = query(collection(db, budgetsPath), where('categoryId', '==', id));
    const budgetDocs = await getDocs(budgetsQuery);
    console.log(`[deleteCategory] Found ${budgetDocs.size} budgets to purge`);
    
    const budgetDeletes = budgetDocs.docs.map(d => deleteDoc(d.ref));
    await Promise.all(budgetDeletes);
    console.log('[deleteCategory] Budgets purged');

    // 3. Delete the category itself
    const categoryPath = `users/${userId}/categories/${id}`;
    await deleteDoc(doc(db, categoryPath));
    console.log('[deleteCategory] Category document deleted');

  } catch (error) {
    console.error('[deleteCategory] Critical failure in deletion flow:', error);
    const categoryPath = `users/${userId}/categories/${id}`;
    handleFirestoreError(error, OperationType.DELETE, categoryPath);
  }
}

// Budgets
export function subscribeBudgets(userId: string, callback: (budgets: Budget[]) => void) {
  const path = `users/${userId}/budgets`;
  const q = query(collection(db, path));
  
  return onSnapshot(q, (snapshot) => {
    const budgets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
    callback(budgets);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function addBudget(userId: string, budget: Omit<Budget, 'id' | 'userId'>) {
  const path = `users/${userId}/budgets`;
  try {
    await addDoc(collection(db, path), { ...budget, userId });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteBudget(userId: string, id: string) {
  const path = `users/${userId}/budgets/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// User Profile
export async function updateProfile(userId: string, data: { monthlyBudget?: number, currency?: string, displayName?: string }) {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, path), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
