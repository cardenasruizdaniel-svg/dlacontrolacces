export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  mfa_enabled: boolean;
  company_id: string | null;
  role_id: string | null;
  role?: { name?: string; display_name?: string } | string | null;
  role_name?: string | null;
  platform_access?: string;
  photo_url?: string | null;
  is_face_registered?: boolean;
  account_status?: string;
  employee_id?: string | null;
  code?: string | null;
  first_login?: boolean;
  force_password_change?: boolean;
}

export interface Employee {
  id: string;
  code: string;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  photo_url: string | null;
  department_id: string | null;
  company_id: string;
}

export interface Contract {
  id: string;
  code: string;
  employee_id: string;
  contract_type_id: string;
  start_date: string;
  end_date: string | null;
  salary: number;
  status: string;
  work_scheme: string;
}

export interface Client {
  id: string;
  name: string;
  client_type: string;
  nit: string | null;
  city: string | null;
  status: string;
}

export interface Patient {
  id: string;
  document_number: string;
  first_name: string;
  last_name: string;
  status: string;
}

export interface Schedule {
  id: string;
  name: string;
  start_date: string;
  status: string;
}

export interface Shift {
  id: string;
  employee_id: string;
  name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  priority: string;
  status: string;
}

export interface AccessRecord {
  id: string;
  employee_id: string;
  record_type: "entry" | "exit";
  timestamp: string;
  latitude: number;
  longitude: number;
  face_verified: boolean;
  inside_geofence: boolean;
  worked_hours: number | null;
}

export interface DashboardData {
  company_id: string;
  employees: {
    total_active: number;
    active_today: number;
    absent_today: number;
    late_today: number;
    on_time_today: number;
  };
  hours: {
    total_worked: number;
    total_overtime: number;
    average_per_employee: number;
  };
  financial: {
    current_month_cost: number;
    cost_per_employee: number;
  };
  productivity: {
    total_shifts: number;
    completed: number;
    in_progress: number;
    absent: number;
    completion_rate: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
