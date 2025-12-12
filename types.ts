
import { LanguageCode } from './services/translations';

export interface Institution {
  id: string;
  name: string;
  type: 'University' | 'College' | 'Bootcamp' | 'High School' | 'Online';
  program: string;
  startDate: string;
  expectedGraduation: string;
  studentId?: string;
  location?: string;
  primary: boolean;
  color?: string;
}

export interface Course {
  id: string;
  institutionId?: string; // Links course to a specific school
  code: string;
  name: string;
  credits: number;
  grade: number; // Always stored as 0-100 percentage
  gpaScale?: number; // e.g. 4.0, 5.0, 10.0, 100
  color: string;
  targetGrade?: number;
  professor?: string;
  room?: string;
  schedule?: string; // e.g., "Mon/Wed 10:00 AM"
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  dueDate: string; // ISO String with time
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  grade?: number; // The score received
  maxGrade: number; // The score possible (e.g. 100)
  weight: number; // percentage of total grade
  type: string; // Changed from union to string to support custom types
  // Extended properties for futuristic UI
  difficulty?: number; // 1-5
  tags?: string[];
  description?: string;
}

export interface StudyResource {
  id: string;
  courseId: string;
  title: string;
  url?: string;
  type: 'PDF' | 'Link' | 'Video' | 'Note';
}

export interface Expense {
  id: string;
  amount: number;
  category: string; // Changed to string to match Budget category
  date: string;
  note: string;
  merchant?: string; // e.g., "Starbucks"
  paymentMethod?: 'Card' | 'Cash' | 'Transfer';
}

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  period: 'Monthly' | 'Yearly';
  nextBillingDate: string;
  category: 'Software' | 'Entertainment' | 'Utility' | 'Academic';
  icon?: string;
}

export type AssetCategory = 'Tech' | 'Academic' | 'Transport' | 'Savings' | 'Investment' | 'Real Estate';

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  originalValue?: number;
  purchaseDate?: string;
  notes?: string;
  icon?: string; // Lucide icon name or generic type
  institutionId?: string; // If linked to a school (e.g. Tuition Credit)
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
  period: 'Monthly' | 'Semester';
}

export type ActivityType = 'Sport' | 'Spiritual' | 'Intellectual' | 'Social' | 'Creative' | 'Rest' | 'Chore';

export interface WellbeingActivity {
  id: string;
  type: ActivityType;
  name: string; // e.g., "Morning Run", "Bible Reading"
  durationMinutes: number;
  intensity: number; // 1-10
  time: string; // "08:00"
  notes?: string;
  
  // Sector Specific Data
  reference?: string; // For Spiritual (e.g., "Psalm 23", "Meditations Book 1")
  metricValue?: number; // For Sport (e.g., Distance in km, or Weight in kg)
  metricUnit?: string; // "km", "kg", "reps", "pages"
  person?: string; // For Social (e.g., "Mom", "Study Group")
  platform?: string; // For Social (e.g., "In Person", "Zoom", "Phone")
  focusScore?: number; // For Intellectual (1-10)
}

export interface WellbeingLog {
  id: string;
  date: string;
  
  // Scores (calculated or manual)
  overallScore?: number; // 0-100
  
  // Psychological (PERMA)
  mood: number; // 1-10
  stress: number; // 1-10
  gratitude: string[];
  
  // Physical
  sleepHours: number;
  sleepQuality: number; // 1-10
  energyLevel: number; // 1-10
  nutritionScore: number; // 1-10
  
  // Social
  socialSatisfaction: number; // 1-10
  
  // Granular Activities
  activities: WellbeingActivity[];
  
  journalEntry: string;
}

// --- TIME HUB SPECIFIC TYPES ---
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'archived';
  
  // Temporal Configuration
  recurrence: RecurrenceType;
  customDays?: number[]; // 0=Sun, 1=Mon for 'custom' recurrence
  time?: string; // "14:00"
  durationMinutes: number;
  startDate: string; // ISO Date
  endDate?: string; // ISO Date (Optional end for routines)
  
  // Progress Tracking
  completionHistory: string[]; // ISO Date strings of days completed ("2023-10-27")
  subtasks?: SubTask[];
  
  tags: string[];
  color: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'Course' | 'Assignment' | 'Block' | 'Wellbeing' | 'Task';
  color: string;
  isCompleted?: boolean; // For visual checking
  meta?: any; // To store reference ID (courseId, taskId, etc)
}

export interface FocusSession {
  id: string;
  startTime: number;
  durationMinutes: number;
  mode: 'Focus' | 'Short Break' | 'Long Break';
  completed: boolean;
}

export type AppTheme = 
  | 'midnight' | 'ocean' | 'forest' | 'sunset' | 'nebula' | 'graphite' 
  | 'royal' | 'cherry' | 'nordic' | 'solar' | 'synth' | 'slate';

export interface UserPreferences {
  theme: AppTheme;
  accentColor: string;
  glassOpacity: 'low' | 'medium' | 'high';
  blurStrength: 'sm' | 'md' | 'lg' | 'xl';
  borderRadius: 'sm' | 'md' | 'lg' | 'full';
  notifications: boolean;
  publicProfile: boolean;
  language: LanguageCode;
}

export interface UserProfile {
  id: string;
  name: string;
  title: string;
  email?: string;
  phoneNumber: string;
  bio: string;
  avatar: string;
  // Multi-institution support
  institutions: Institution[];
  currency: string;
  preferences: UserPreferences;
  goals: string[];
  socialLinks?: {
    linkedin?: string;
    github?: string;
    website?: string;
  };
}

// Authentication Interface
export interface RegisteredUser {
  id: string;
  phoneNumber: string; // Primary Key
  studentId?: string; // Optional Alternate Key (formerly username)
  passwordHash: string; // Storing simple string for demo, real app needs bcrypt
  profileId: string; // Links to the UserProfile
}

export interface AppState {
  registeredUsers: RegisteredUser[]; // Registry of all users
  courses: Course[];
  assignments: Assignment[];
  resources: StudyResource[];
  expenses: Expense[];
  subscriptions: Subscription[];
  assets: Asset[];
  budgets: Budget[];
  wellbeing: WellbeingLog[];
  tasks: Task[]; // New Task Registry
  user: UserProfile; // Currently active user profile
}

export type ViewState = 'dashboard' | 'academic' | 'finance' | 'wellbeing' | 'profile' | 'timehub';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface SimulationScenario {
  studyHoursChange: number;
  sleepChange: number;
  spendingChange: number;
}

export interface CorrelationMetric {
  x: number;
  y: number;
  z: number; // Bubble size
}
