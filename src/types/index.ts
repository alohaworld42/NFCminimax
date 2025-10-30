export interface NFCTag {
  id: string;
  user_id: string;
  tag_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  device_type: 'hue_bridge' | 'meross_plug';
  name: string;
  connection_details: any;
  is_online: boolean;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: string;
  user_id: string;
  device_id: string;
  action_type: string;
  action_params: any;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TagAction {
  id: string;
  user_id: string;
  tag_id: string;
  action_id: string;
  execution_order: number;
  time_restrictions?: any;
  is_enabled: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  tag_id?: string;
  action_id?: string;
  status: 'success' | 'failure' | 'pending';
  error_message?: string;
  executed_at: string;
}

export interface APICredentials {
  id: string;
  user_id: string;
  service_type: 'hue' | 'meross';
  credentials: any;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}
