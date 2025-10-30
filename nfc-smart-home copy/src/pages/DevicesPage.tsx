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
  const [deviceType, setDeviceType] = useState<'hue_bridge' | 'meross_plug'>('hue_bridge');
  const [deviceName, setDeviceName] = useState('');
  const [bridgeIp, setBridgeIp] = useState('');
  const [bridgeUsername, setBridgeUsername] = useState('');
  const [merossEmail, setMerossEmail] = useState('');
  const [merossPassword, setMerossPassword] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; color: string }>({
    show: false,
    message: '',
    color: 'success'
  });

  useEffect(() => {
    loadDevices();
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
          <p>Manage your Philips Hue and Meross smart devices.</p>
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
                  <p><strong>Type:</strong> {device.device_type === 'hue_bridge' ? 'Philips Hue Bridge' : 'Meross Smart Plug'}</p>
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
