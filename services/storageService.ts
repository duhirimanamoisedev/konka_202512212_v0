
import { AppState } from '../types';

const STORAGE_KEY = 'KONKA_DATA_V10_PHONE_AUTH';

const INITIAL_STATE: AppState = {
  // Auth Registry - Start Empty
  registeredUsers: [], 
  
  // Default Empty User Template
  user: {
    id: "",
    name: "",
    title: "New Student",
    phoneNumber: "",
    bio: "Ready to organize my academic and personal life.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=student&backgroundColor=b6e3f4",
    institutions: [],
    currency: "$",
    preferences: {
      theme: 'midnight',
      accentColor: '#10b981',
      glassOpacity: 'medium',
      blurStrength: 'lg',
      borderRadius: 'md',
      notifications: true,
      publicProfile: false,
      language: 'en'
    },
    goals: [],
    socialLinks: {}
  },
  
  // Empty Data Arrays
  courses: [],
  assignments: [],
  resources: [],
  expenses: [],
  subscriptions: [],
  assets: [],
  budgets: [],
  wellbeing: [],
  tasks: []
};

export const getStoredData = (): AppState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Ensure registeredUsers exists for migration
      if (!parsed.registeredUsers) {
        parsed.registeredUsers = INITIAL_STATE.registeredUsers;
      }
      // Ensure tasks exists for migration
      if (!parsed.tasks) {
        parsed.tasks = INITIAL_STATE.tasks;
      }
      return parsed;
    } catch (e) {
      return INITIAL_STATE;
    }
  }
  return INITIAL_STATE;
};

export const saveStoredData = (data: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};
