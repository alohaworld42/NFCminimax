import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrchntonfshqvorcfvqh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyY2hudG9uZnNocXZvcmNmdnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDIxNjQsImV4cCI6MjA3NzI3ODE2NH0.BHYdLFWuN92du_ahRRTGESoKlZrLvGqVMJet12ao9nQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
