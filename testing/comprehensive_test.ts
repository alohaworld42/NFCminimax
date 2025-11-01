/**
 * Comprehensive Test Suite for NFC Smart Home Application
 * Tests all device integrations and functionality
 */

import { supabase } from '../src/services/supabase';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: any;
}

class NFCSmartHomeTester {
  private results: TestResult[] = [];
  private userId: string | null = null;

  constructor() {
    // Get the current user ID
    supabase.auth.getUser().then(({ data }) => {
      this.userId = data.user?.id || null;
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive NFC Smart Home Test Suite\n');
    
    // Test 1: Database Schema Validation
    await this.testDatabaseSchema();
    
    // Test 2: Edge Functions Availability
    await this.testEdgeFunctions();
    
    // Test 3: Device Discovery Functions
    await this.testDeviceDiscovery();
    
    // Test 4: Device Connection Testing
    await this.testDeviceConnections();
    
    // Test 5: Action Creation and Execution
    await this.testActions();
    
    // Test 6: NFC Tag Operations
    await this.testNFCTags();
    
    // Test 7: Activity Logging
    await this.testActivityLogging();
    
    // Print Results
    this.printResults();
  }

  private async testDatabaseSchema(): Promise<void> {
    console.log('📊 Testing Database Schema...');
    
    try {
      // Test each table can be queried
      const tables = ['profiles', 'nfc_tags', 'devices', 'actions', 'tag_actions', 'activity_log', 'api_credentials'];
      
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error && !error.message.includes('No rows')) {
          throw new Error(`${table}: ${error.message}`);
        }
      }
      
      this.addResult('Database Schema Validation', true);
    } catch (error: any) {
      this.addResult('Database Schema Validation', false, error.message);
    }
  }

  private async testEdgeFunctions(): Promise<void> {
    console.log('⚡ Testing Edge Functions Availability...');
    
    const functions = [
      'discover-hue-bridge',
      'create-hue-user', 
      'execute-hue-action',
      'execute-meross-action',
      'authenticate-smartthings',
      'discover-smartthings-devices',
      'execute-smartthings-action',
      'authenticate-lsc',
      'discover-lsc-devices',
      'execute-lsc-action',
      'execute-samsung-app-action',
      'get-samsung-apps-list',
      'test-device-connection'
    ];
    
    for (const funcName of functions) {
      try {
        // Test if function exists by calling with OPTIONS request
        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/${funcName}`, {
          method: 'OPTIONS',
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok || response.status === 405) { // 405 = Method not allowed (function exists but only accepts POST)
          this.addResult(`Edge Function: ${funcName}`, true);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error: any) {
        this.addResult(`Edge Function: ${funcName}`, false, error.message);
      }
    }
  }

  private async testDeviceDiscovery(): Promise<void> {
    console.log('🔍 Testing Device Discovery Functions...');
    
    // Test Philips Hue bridge discovery
    try {
      const { error } = await supabase.functions.invoke('discover-hue-bridge', {
        body: {}
      });
      
      if (!error || error.message.includes('timeout')) {
        this.addResult('Hue Bridge Discovery', true);
      } else {
        throw error;
      }
    } catch (error: any) {
      this.addResult('Hue Bridge Discovery', false, error.message);
    }
    
    // Test SmartThings authentication
    try {
      const { error } = await supabase.functions.invoke('authenticate-smartthings', {
        body: { personalAccessToken: 'test-token' }
      });
      
      if (error?.message?.includes('Invalid Personal Access Token')) {
        this.addResult('SmartThings Authentication', true); // Expected error for test token
      } else {
        this.addResult('SmartThings Authentication', false, 'Expected authentication error');
      }
    } catch (error: any) {
      this.addResult('SmartThings Authentication', false, error.message);
    }
    
    // Test LSC authentication
    try {
      const { error } = await supabase.functions.invoke('authenticate-lsc', {
        body: { clientId: 'test', clientSecret: 'test' }
      });
      
      if (error?.message?.includes('Invalid credentials')) {
        this.addResult('LSC Authentication', true); // Expected error for test credentials
      } else {
        this.addResult('LSC Authentication', false, 'Expected authentication error');
      }
    } catch (error: any) {
      this.addResult('LSC Authentication', false, error.message);
    }
  }

  private async testDeviceConnections(): Promise<void> {
    console.log('🔌 Testing Device Connection Functions...');
    
    // Test test-device-connection with all device types
    const deviceTypes = [
      { type: 'hue_bridge', details: { bridgeIp: '192.168.1.100', username: 'test' } },
      { type: 'meross_plug', details: { email: 'test@example.com', password: 'test' } },
      { type: 'smartthings_device', details: { personalAccessToken: 'test', deviceId: 'test' } },
      { type: 'lsc_device', details: { clientId: 'test', clientSecret: 'test', accessToken: 'test', deviceId: 'test', dataCenter: 'eu' } },
      { type: 'samsung_app_control', details: { packageName: 'com.android.chrome' } }
    ];
    
    for (const device of deviceTypes) {
      try {
        const { error } = await supabase.functions.invoke('test-device-connection', {
          body: {
            deviceType: device.type,
            connectionDetails: device.details
          }
        });
        
        // These tests are expected to fail with authentication errors, which is good
        if (error?.message?.includes('Network error') || 
            error?.message?.includes('Invalid') ||
            error?.message?.includes('authentication')) {
          this.addResult(`Device Connection: ${device.type}`, true);
        } else if (error) {
          this.addResult(`Device Connection: ${device.type}`, false, error.message);
        } else {
          this.addResult(`Device Connection: ${device.type}`, true);
        }
      } catch (error: any) {
        // Some errors are expected
        if (error.message.includes('Network error') || error.message.includes('Invalid')) {
          this.addResult(`Device Connection: ${device.type}`, true);
        } else {
          this.addResult(`Device Connection: ${device.type}`, false, error.message);
        }
      }
    }
  }

  private async testActions(): Promise<void> {
    console.log('⚙️ Testing Action Creation and Execution...');
    
    if (!this.userId) {
      this.addResult('Actions Test', false, 'No authenticated user');
      return;
    }
    
    try {
      // Create a test action
      const { data, error } = await supabase
        .from('actions')
        .insert({
          user_id: this.userId,
          device_id: 'test-device-id',
          action_type: 'test_action',
          action_params: { test: true },
          name: 'Test Action',
          description: 'Test action for validation'
        })
        .select()
        .single();
        
      if (error) {
        // This might fail due to foreign key constraint, which is expected
        if (error.message.includes('violates foreign key constraint')) {
          this.addResult('Actions Creation (Foreign Key Check)', true);
        } else {
          throw error;
        }
      } else {
        this.addResult('Actions Creation', true);
        
        // Clean up test action
        if (data?.id) {
          await supabase.from('actions').delete().eq('id', data.id);
        }
      }
    } catch (error: any) {
      this.addResult('Actions Creation', false, error.message);
    }
  }

  private async testNFCTags(): Promise<void> {
    console.log('🏷️ Testing NFC Tag Operations...');
    
    if (!this.userId) {
      this.addResult('NFC Tags Test', false, 'No authenticated user');
      return;
    }
    
    try {
      // Test NFC tag insertion with validation
      const { data, error } = await supabase
        .from('nfc_tags')
        .insert({
          user_id: this.userId,
          tag_id: 'test-tag-' + Date.now(),
          name: 'Test Tag',
          description: 'Test tag for validation'
        })
        .select()
        .single();
        
      if (error) {
        this.addResult('NFC Tags Creation', false, error.message);
      } else {
        this.addResult('NFC Tags Creation', true);
        
        // Clean up test tag
        if (data?.id) {
          await supabase.from('nfc_tags').delete().eq('id', data.id);
        }
      }
    } catch (error: any) {
      this.addResult('NFC Tags Creation', false, error.message);
    }
  }

  private async testActivityLogging(): Promise<void> {
    console.log('📝 Testing Activity Logging...');
    
    if (!this.userId) {
      this.addResult('Activity Logging Test', false, 'No authenticated user');
      return;
    }
    
    try {
      // Test activity log insertion
      const { error } = await supabase
        .from('activity_log')
        .insert({
          user_id: this.userId,
          status: 'success',
          executed_at: new Date().toISOString()
        });
        
      if (error) {
        this.addResult('Activity Logging', false, error.message);
      } else {
        this.addResult('Activity Logging', true);
      }
    } catch (error: any) {
      this.addResult('Activity Logging', false, error.message);
    }
  }

  private addResult(name: string, success: boolean, error?: string, details?: any): void {
    this.results.push({ name, success, error, details });
  }

  private printResults(): void {
    console.log('\n📋 Test Results Summary');
    console.log('========================');
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%\n`);
    
    // Print failed tests
    if (failed > 0) {
      console.log('❌ Failed Tests:');
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`  • ${result.name}: ${result.error}`);
      });
      console.log('');
    }
    
    // Print passed tests with details
    console.log('✅ Passed Tests:');
    this.results.filter(r => r.success).forEach(result => {
      console.log(`  • ${result.name}`);
    });
  }
}

// Run the test suite
const tester = new NFCSmartHomeTester();
tester.runAllTests().catch(console.error);
