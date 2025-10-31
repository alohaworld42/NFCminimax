import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonText,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonFab,
  IonFabButton,
  IonIcon,
  IonBadge,
} from '@ionic/react';
import { add, wifi, wifiOutline } from 'ionicons/icons';
import { supabase } from '../services/supabase';
import { Device } from '../types';

const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [deviceType, setDeviceType] = useState<'hue_bridge' | 'meross_plug' | 'smartthings_device' | 'lsc_device' | 'samsung_app_control'>('hue_bridge');
  const [deviceName, setDeviceName] = useState('');
  const [bridgeIp, setBridgeIp] = useState('');
  const [bridgeUsername, setBridgeUsername] = useState('');
  const [merossEmail, setMerossEmail] = useState('');
  const [merossPassword, setMerossPassword] = useState('');
  const [smartthingsPAT, setSmartthingsPAT] = useState('');
  const [smartthingsDevices, setSmartthingsDevices] = useState<any[]>([]);
  const [selectedSmartthingsDevice, setSelectedSmartthingsDevice] = useState('');
  const [lscClientId, setLscClientId] = useState('');
  const [lscClientSecret, setLscClientSecret] = useState('');
  const [lscDataCenter, setLscDataCenter] = useState('eu');
  const [lscAccessToken, setLscAccessToken] = useState('');
  const [lscDevices, setLscDevices] = useState<any[]>([]);
  const [selectedLscDevice, setSelectedLscDevice] = useState('');
  const [samsungApps, setSamsungApps] = useState<any[]>([]);
  const [selectedSamsungApp, setSelectedSamsungApp] = useState('');
  const [selectedAppCategory, setSelectedAppCategory] = useState('Samsung');
  const [customPackageName, setCustomPackageName] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; color: string }>({
    show: false,
    message: '',
    color: 'success'
  });

  useEffect(() => {
    loadDevices();
    loadSamsungApps();
  }, []);

  const loadDevices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setDevices(data);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadSamsungApps = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-samsung-apps-list');

      if (error) throw error;

      if (data?.data?.apps) {
        setSamsungApps(data.data.apps);
      }
    } catch (error: any) {
      console.error('Error loading Samsung apps:', error);
    }
  };

  const discoverHueBridge = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('discover-hue-bridge');

      if (error) throw error;

      if (data?.data?.bridges && data.data.bridges.length > 0) {
        const bridge = data.data.bridges[0];
        setBridgeIp(bridge.internalipaddress);
        setToast({ show: true, message: `Found bridge at ${bridge.internalipaddress}`, color: 'success' });
      } else {
        setToast({ show: true, message: 'No bridges found', color: 'warning' });
      }
    } catch (error: any) {
      setToast({ show: true, message: `Discovery error: ${error.message}`, color: 'danger' });
    }
  };

  const authenticateHueBridge = async () => {
    if (!bridgeIp) {
      setToast({ show: true, message: 'Please discover bridge first', color: 'warning' });
      return;
    }

    try {
      setToast({ show: true, message: 'Press the link button on your Hue Bridge now...', color: 'primary' });

      await new Promise(resolve => setTimeout(resolve, 5000));

      const { data, error } = await supabase.functions.invoke('create-hue-user', {
        body: { bridgeIp, devicetype: 'nfc-smart-home-app' }
      });

      if (error) throw error;

      if (data?.data?.username) {
        setBridgeUsername(data.data.username);
        setToast({ show: true, message: 'Authentication successful', color: 'success' });
      } else if (data?.error?.code === 'LINK_BUTTON_NOT_PRESSED') {
        setToast({ show: true, message: data.error.message, color: 'warning' });
      }
    } catch (error: any) {
      setToast({ show: true, message: `Authentication error: ${error.message}`, color: 'danger' });
    }
  };

  const authenticateSmartThings = async () => {
    if (!smartthingsPAT) {
      setToast({ show: true, message: 'Please enter your SmartThings Personal Access Token', color: 'warning' });
      return;
    }

    try {
      setToast({ show: true, message: 'Validating SmartThings token...', color: 'primary' });

      const { data, error } = await supabase.functions.invoke('authenticate-smartthings', {
        body: { personalAccessToken: smartthingsPAT }
      });

      if (error) throw error;

      if (data?.data?.isValid) {
        setToast({ show: true, message: `Token validated! Found ${data.data.deviceCount} devices`, color: 'success' });
        await discoverSmartThingsDevices();
      }
    } catch (error: any) {
      setToast({ show: true, message: `Authentication error: ${error.message}`, color: 'danger' });
    }
  };

  const discoverSmartThingsDevices = async () => {
    if (!smartthingsPAT) {
      setToast({ show: true, message: 'Please authenticate first', color: 'warning' });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('discover-smartthings-devices', {
        body: { personalAccessToken: smartthingsPAT }
      });

      if (error) throw error;

      if (data?.data?.devices && data.data.devices.length > 0) {
        setSmartthingsDevices(data.data.devices);
        setToast({ show: true, message: `Found ${data.data.count} SmartThings devices`, color: 'success' });
      } else {
        setToast({ show: true, message: 'No SmartThings devices found', color: 'warning' });
      }
    } catch (error: any) {
      setToast({ show: true, message: `Discovery error: ${error.message}`, color: 'danger' });
    }
  };

  const authenticateLsc = async () => {
    if (!lscClientId || !lscClientSecret) {
      setToast({ show: true, message: 'Please enter your Tuya Client ID and Secret', color: 'warning' });
      return;
    }

    try {
      setToast({ show: true, message: 'Authenticating with Tuya Cloud...', color: 'primary' });

      const { data, error } = await supabase.functions.invoke('authenticate-lsc', {
        body: {
          clientId: lscClientId,
          clientSecret: lscClientSecret,
          dataCenter: lscDataCenter
        }
      });

      if (error) throw error;

      if (data?.data?.isValid) {
        setLscAccessToken(data.data.accessToken);
        setToast({ show: true, message: 'Tuya credentials validated successfully', color: 'success' });
        await discoverLscDevices(data.data.accessToken);
      }
    } catch (error: any) {
      setToast({ show: true, message: `Authentication error: ${error.message}`, color: 'danger' });
    }
  };

  const discoverLscDevices = async (accessToken?: string) => {
    const token = accessToken || lscAccessToken;
    if (!lscClientId || !lscClientSecret || !token) {
      setToast({ show: true, message: 'Please authenticate first', color: 'warning' });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('discover-lsc-devices', {
        body: {
          clientId: lscClientId,
          clientSecret: lscClientSecret,
          accessToken: token,
          dataCenter: lscDataCenter
        }
      });

      if (error) throw error;

      if (data?.data?.devices && data.data.devices.length > 0) {
        setLscDevices(data.data.devices);
        setToast({ show: true, message: `Found ${data.data.count} LSC/Tuya devices`, color: 'success' });
      } else {
        setToast({ show: true, message: 'No LSC/Tuya devices found', color: 'warning' });
      }
    } catch (error: any) {
      setToast({ show: true, message: `Discovery error: ${error.message}`, color: 'danger' });
    }
  };

  const saveDevice = async () => {
    if (!deviceName) {
      setToast({ show: true, message: 'Please provide a device name', color: 'warning' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let connectionDetails: any = {};

      if (deviceType === 'hue_bridge') {
        if (!bridgeIp || !bridgeUsername) {
          setToast({ show: true, message: 'Please complete bridge setup', color: 'warning' });
          return;
        }
        connectionDetails = { bridgeIp, username: bridgeUsername };
      } else if (deviceType === 'meross_plug') {
        if (!merossEmail || !merossPassword) {
          setToast({ show: true, message: 'Please provide Meross credentials', color: 'warning' });
          return;
        }
        connectionDetails = { email: merossEmail, password: merossPassword };
      } else if (deviceType === 'smartthings_device') {
        if (!smartthingsPAT || !selectedSmartthingsDevice) {
          setToast({ show: true, message: 'Please authenticate and select a device', color: 'warning' });
          return;
        }
        const device = smartthingsDevices.find(d => d.deviceId === selectedSmartthingsDevice);
        if (!device) {
          setToast({ show: true, message: 'Selected device not found', color: 'warning' });
          return;
        }
        connectionDetails = { 
          personalAccessToken: smartthingsPAT, 
          deviceId: device.deviceId,
          capabilities: device.capabilities,
          label: device.label
        };
      } else if (deviceType === 'lsc_device') {
        if (!lscClientId || !lscClientSecret || !lscAccessToken || !selectedLscDevice) {
          setToast({ show: true, message: 'Please authenticate and select a device', color: 'warning' });
          return;
        }
        const device = lscDevices.find(d => d.deviceId === selectedLscDevice);
        if (!device) {
          setToast({ show: true, message: 'Selected device not found', color: 'warning' });
          return;
        }
        connectionDetails = { 
          clientId: lscClientId,
          clientSecret: lscClientSecret,
          accessToken: lscAccessToken,
          dataCenter: lscDataCenter,
          deviceId: device.deviceId,
          category: device.category,
          categoryName: device.categoryName
        };
      } else if (deviceType === 'samsung_app_control') {
        let packageName = customPackageName || selectedSamsungApp;
        if (!packageName) {
          setToast({ show: true, message: 'Please select an app or enter a package name', color: 'warning' });
          return;
        }
        const app = samsungApps.find(a => a.packageName === packageName);
        connectionDetails = { 
          packageName: packageName,
          appName: app?.name || deviceName || 'Custom App'
        };
      }

      const { error } = await supabase.from('devices').insert({
        user_id: user.id,
        device_type: deviceType,
        name: deviceName,
        connection_details: connectionDetails,
        is_online: false
      });

      if (error) throw error;

      setToast({ show: true, message: 'Device added successfully', color: 'success' });
      resetForm();
      setShowModal(false);
      loadDevices();
    } catch (error: any) {
      setToast({ show: true, message: `Error saving device: ${error.message}`, color: 'danger' });
    }
  };

  const testConnection = async (device: Device) => {
    try {
      const { data, error } = await supabase.functions.invoke('test-device-connection', {
        body: {
          deviceType: device.device_type,
          connectionDetails: device.connection_details
        }
      });

      if (error) throw error;

      if (data?.data?.online) {
        setToast({ show: true, message: 'Device is online', color: 'success' });
        
        await supabase
          .from('devices')
          .update({ is_online: true, last_seen_at: new Date().toISOString() })
          .eq('id', device.id);
        
        loadDevices();
      } else {
        setToast({ show: true, message: 'Device is offline', color: 'warning' });
      }
    } catch (error: any) {
      setToast({ show: true, message: `Connection test failed: ${error.message}`, color: 'danger' });
    }
  };

  const resetForm = () => {
    setDeviceName('');
    setBridgeIp('');
    setBridgeUsername('');
    setMerossEmail('');
    setMerossPassword('');
    setSmartthingsPAT('');
    setSmartthingsDevices([]);
    setSelectedSmartthingsDevice('');
    setLscClientId('');
    setLscClientSecret('');
    setLscDataCenter('eu');
    setLscAccessToken('');
    setLscDevices([]);
    setSelectedLscDevice('');
    setDeviceType('hue_bridge');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Devices</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText>
          <h2>Smart Home Devices</h2>
          <p>Manage your Philips Hue, Meross, SmartThings, and LSC devices.</p>
        </IonText>

        {devices.length === 0 ? (
          <IonCard>
            <IonCardContent>
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>No devices added yet. Tap the plus button to add a device.</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          devices.map(device => (
            <IonCard key={device.id}>
              <IonCardHeader>
                <IonCardTitle>
                  {device.name}
                  <IonBadge color={device.is_online ? 'success' : 'danger'} style={{ marginLeft: '10px' }}>
                    <IonIcon icon={device.is_online ? wifi : wifiOutline} /> {device.is_online ? 'Online' : 'Offline'}
                  </IonBadge>
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonText>
                  <p><strong>Type:</strong> {
                    device.device_type === 'hue_bridge' ? 'Philips Hue Bridge' : 
                    device.device_type === 'meross_plug' ? 'Meross Smart Plug' : 
                    device.device_type === 'smartthings_device' ? 'SmartThings Device' :
                    device.device_type === 'lsc_device' ? 'LSC Smart Device' :
                    'Samsung App Control'
                  }</p>
                  {device.last_seen_at && (
                    <p><strong>Last Seen:</strong> {new Date(device.last_seen_at).toLocaleString()}</p>
                  )}
                </IonText>
                <IonButton size="small" onClick={() => testConnection(device)}>
                  Test Connection
                </IonButton>
              </IonCardContent>
            </IonCard>
          ))
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowModal(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => {
          setShowModal(false);
          resetForm();
        }}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Add Device</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Device Type</IonLabel>
              <IonSelect value={deviceType} onIonChange={e => setDeviceType(e.detail.value)}>
                <IonSelectOption value="hue_bridge">Philips Hue Bridge</IonSelectOption>
                <IonSelectOption value="meross_plug">Meross Smart Plug</IonSelectOption>
                <IonSelectOption value="smartthings_device">SmartThings Device</IonSelectOption>
                <IonSelectOption value="lsc_device">LSC Smart Device</IonSelectOption>
                <IonSelectOption value="samsung_app_control">Samsung App Control</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Device Name</IonLabel>
              <IonInput
                value={deviceName}
                onIonChange={e => setDeviceName(e.detail.value!)}
                placeholder="Living Room Bridge"
              />
            </IonItem>

            {deviceType === 'hue_bridge' && (
              <>
                <IonItem>
                  <IonLabel position="stacked">Bridge IP Address</IonLabel>
                  <IonInput value={bridgeIp} onIonChange={e => setBridgeIp(e.detail.value!)} />
                </IonItem>
                <IonButton expand="block" onClick={discoverHueBridge}>
                  Discover Bridge
                </IonButton>

                <IonItem>
                  <IonLabel position="stacked">Bridge Username (Token)</IonLabel>
                  <IonInput value={bridgeUsername} readonly />
                </IonItem>
                <IonButton expand="block" onClick={authenticateHueBridge}>
                  Authenticate (Press Link Button)
                </IonButton>
              </>
            )}

            {deviceType === 'meross_plug' && (
              <>
                <IonItem>
                  <IonLabel position="stacked">Meross Email</IonLabel>
                  <IonInput
                    type="email"
                    value={merossEmail}
                    onIonChange={e => setMerossEmail(e.detail.value!)}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Meross Password</IonLabel>
                  <IonInput
                    type="password"
                    value={merossPassword}
                    onIonChange={e => setMerossPassword(e.detail.value!)}
                  />
                </IonItem>
              </>
            )}

            {deviceType === 'smartthings_device' && (
              <>
                <IonItem>
                  <IonLabel position="stacked">Personal Access Token</IonLabel>
                  <IonInput
                    type="password"
                    value={smartthingsPAT}
                    onIonChange={e => setSmartthingsPAT(e.detail.value!)}
                    placeholder="Enter your SmartThings PAT"
                  />
                </IonItem>
                <IonText color="medium" style={{ fontSize: '0.85em', padding: '0 16px', display: 'block' }}>
                  <p>Get your Personal Access Token from: <a href="https://account.smartthings.com/tokens" target="_blank" rel="noopener">account.smartthings.com/tokens</a></p>
                  <p>Required scopes: l:devices, r:devices:*, x:devices:*</p>
                </IonText>
                <IonButton expand="block" onClick={authenticateSmartThings}>
                  Validate Token and Discover Devices
                </IonButton>

                {smartthingsDevices.length > 0 && (
                  <IonItem>
                    <IonLabel position="stacked">Select Device</IonLabel>
                    <IonSelect 
                      value={selectedSmartthingsDevice} 
                      onIonChange={e => setSelectedSmartthingsDevice(e.detail.value)}
                      placeholder="Choose a device"
                    >
                      {smartthingsDevices.map(device => (
                        <IonSelectOption key={device.deviceId} value={device.deviceId}>
                          {device.label} ({device.capabilities.join(', ')})
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                )}
              </>
            )}

            {deviceType === 'lsc_device' && (
              <>
                <IonItem>
                  <IonLabel position="stacked">Data Center</IonLabel>
                  <IonSelect value={lscDataCenter} onIonChange={e => setLscDataCenter(e.detail.value)}>
                    <IonSelectOption value="eu">Europe (EU)</IonSelectOption>
                    <IonSelectOption value="eu-west">Western Europe</IonSelectOption>
                    <IonSelectOption value="us">Western America (US)</IonSelectOption>
                    <IonSelectOption value="us-east">Eastern America</IonSelectOption>
                    <IonSelectOption value="cn">China</IonSelectOption>
                    <IonSelectOption value="in">India</IonSelectOption>
                    <IonSelectOption value="sg">Singapore</IonSelectOption>
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Tuya Client ID</IonLabel>
                  <IonInput
                    value={lscClientId}
                    onIonChange={e => setLscClientId(e.detail.value!)}
                    placeholder="Enter your Tuya Client ID"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Tuya Client Secret</IonLabel>
                  <IonInput
                    type="password"
                    value={lscClientSecret}
                    onIonChange={e => setLscClientSecret(e.detail.value!)}
                    placeholder="Enter your Tuya Client Secret"
                  />
                </IonItem>
                <IonText color="medium" style={{ fontSize: '0.85em', padding: '0 16px', display: 'block' }}>
                  <p>Create a project at: <a href="https://iot.tuya.com" target="_blank" rel="noopener">iot.tuya.com</a></p>
                  <p>Link your LSC Smart Life app and get Client ID and Secret</p>
                </IonText>
                <IonButton expand="block" onClick={authenticateLsc}>
                  Authenticate and Discover Devices
                </IonButton>

                {lscDevices.length > 0 && (
                  <IonItem>
                    <IonLabel position="stacked">Select Device</IonLabel>
                    <IonSelect 
                      value={selectedLscDevice} 
                      onIonChange={e => setSelectedLscDevice(e.detail.value)}
                      placeholder="Choose a device"
                    >
                      {lscDevices.map(device => (
                        <IonSelectOption key={device.deviceId} value={device.deviceId}>
                          {device.name} ({device.categoryName})
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                )}
              </>
            )}

            {deviceType === 'samsung_app_control' && (
              <>
                <IonItem>
                  <IonLabel position="stacked">App Category</IonLabel>
                  <IonSelect 
                    value={selectedAppCategory} 
                    onIonChange={e => setSelectedAppCategory(e.detail.value)}
                  >
                    <IonSelectOption value="Samsung">Samsung Apps</IonSelectOption>
                    <IonSelectOption value="Google">Google Apps</IonSelectOption>
                    <IonSelectOption value="Social">Social Media</IonSelectOption>
                    <IonSelectOption value="Entertainment">Entertainment</IonSelectOption>
                    <IonSelectOption value="Productivity">Productivity</IonSelectOption>
                  </IonSelect>
                </IonItem>
                
                <IonItem>
                  <IonLabel position="stacked">Select App</IonLabel>
                  <IonSelect 
                    value={selectedSamsungApp} 
                    onIonChange={e => {
                      setSelectedSamsungApp(e.detail.value);
                      setCustomPackageName('');
                    }}
                    placeholder="Choose an app"
                  >
                    {samsungApps
                      .filter(app => app.category === selectedAppCategory)
                      .map(app => (
                        <IonSelectOption key={app.packageName} value={app.packageName}>
                          {app.name}
                        </IonSelectOption>
                      ))
                    }
                  </IonSelect>
                </IonItem>
                
                <IonText color="medium" style={{ fontSize: '0.85em', padding: '10px 16px', display: 'block', textAlign: 'center' }}>
                  <p>-- OR --</p>
                </IonText>
                
                <IonItem>
                  <IonLabel position="stacked">Custom Package Name</IonLabel>
                  <IonInput
                    value={customPackageName}
                    onIonChange={e => {
                      setCustomPackageName(e.detail.value!);
                      setSelectedSamsungApp('');
                    }}
                    placeholder="com.example.app"
                  />
                </IonItem>
                
                <IonText color="medium" style={{ fontSize: '0.85em', padding: '0 16px', display: 'block' }}>
                  <p>Select a popular app from the list above, or enter a custom package name for any Android app.</p>
                  <p>The app will be launched when the NFC tag is scanned.</p>
                </IonText>
              </>
            )}

            <IonButton expand="block" onClick={saveDevice} style={{ marginTop: '20px' }}>
              Save Device
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setShowModal(false)}>
              Cancel
            </IonButton>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={toast.show}
          message={toast.message}
          duration={3000}
          color={toast.color}
          onDidDismiss={() => setToast({ ...toast, show: false })}
        />
      </IonContent>
    </IonPage>
  );
};

export default DevicesPage;
