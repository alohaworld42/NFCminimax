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
  IonTextarea,
  IonToast,
  IonFab,
  IonFabButton,
  IonIcon,
  IonAlert,
  IonRange,
} from '@ionic/react';
import { add, trash, play } from 'ionicons/icons';
import { supabase } from '../services/supabase';
import { Action, Device } from '../types';

const ActionsPage: React.FC = () => {
  const [actions, setActions] = useState<Action[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  
  // Form state
  const [actionName, setActionName] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [actionType, setActionType] = useState('');
  const [brightness, setBrightness] = useState(254);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(254);
  const [colorTemp, setColorTemp] = useState(200);
  const [sceneId, setSceneId] = useState('');
  const [groupId, setGroupId] = useState('0');
  
  const [toast, setToast] = useState<{ show: boolean; message: string; color: string }>({
    show: false,
    message: '',
    color: 'success'
  });

  useEffect(() => {
    loadActions();
    loadDevices();
  }, []);

  const loadActions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setActions(data);
    } catch (error) {
      console.error('Error loading actions:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      if (data) setDevices(data);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const getAvailableActionTypes = (deviceType: string) => {
    if (deviceType === 'hue_bridge') {
      return [
        { value: 'light_on', label: 'Turn Light On' },
        { value: 'light_off', label: 'Turn Light Off' },
        { value: 'set_brightness', label: 'Set Brightness' },
        { value: 'set_color', label: 'Set Color (HSB)' },
        { value: 'set_color_temp', label: 'Set Color Temperature' },
        { value: 'activate_scene', label: 'Activate Scene' },
        { value: 'group_on', label: 'Turn Group On' },
        { value: 'group_off', label: 'Turn Group Off' },
      ];
    } else if (deviceType === 'meross_plug') {
      return [
        { value: 'turn_on', label: 'Turn On' },
        { value: 'turn_off', label: 'Turn Off' },
      ];
    }
    return [];
  };

  const buildActionParams = () => {
    const params: any = {};
    
    if (actionType === 'set_brightness') {
      params.brightness = brightness;
    } else if (actionType === 'set_color') {
      params.hue = hue;
      params.saturation = saturation;
      params.brightness = brightness;
    } else if (actionType === 'set_color_temp') {
      params.colorTemp = colorTemp;
    } else if (actionType === 'activate_scene') {
      params.sceneId = sceneId;
      params.groupId = groupId;
    } else if (actionType === 'light_on' || actionType === 'group_on') {
      params.brightness = brightness;
    }
    
    return params;
  };

  const saveAction = async () => {
    if (!actionName || !selectedDevice || !actionType) {
      setToast({ show: true, message: 'Please fill all required fields', color: 'warning' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const actionParams = buildActionParams();

      if (selectedAction) {
        // Update existing action
        const { error } = await supabase
          .from('actions')
          .update({
            name: actionName,
            description: actionDescription,
            device_id: selectedDevice,
            action_type: actionType,
            action_params: actionParams,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAction.id);

        if (error) throw error;
        setToast({ show: true, message: 'Action updated successfully', color: 'success' });
      } else {
        // Create new action
        const { error } = await supabase.from('actions').insert({
          user_id: user.id,
          device_id: selectedDevice,
          action_type: actionType,
          action_params: actionParams,
          name: actionName,
          description: actionDescription
        });

        if (error) throw error;
        setToast({ show: true, message: 'Action created successfully', color: 'success' });
      }

      resetForm();
      setShowModal(false);
      loadActions();
    } catch (error: any) {
      setToast({ show: true, message: `Error saving action: ${error.message}`, color: 'danger' });
    }
  };

  const deleteAction = async () => {
    if (!selectedAction) return;

    try {
      const { error } = await supabase
        .from('actions')
        .delete()
        .eq('id', selectedAction.id);

      if (error) throw error;

      setToast({ show: true, message: 'Action deleted successfully', color: 'success' });
      setShowDeleteAlert(false);
      setSelectedAction(null);
      loadActions();
    } catch (error: any) {
      setToast({ show: true, message: `Error deleting action: ${error.message}`, color: 'danger' });
    }
  };

  const testAction = async (action: Action) => {
    try {
      const device = devices.find(d => d.id === action.device_id);
      if (!device) {
        setToast({ show: true, message: 'Device not found', color: 'danger' });
        return;
      }

      let functionName = '';
      let payload: any = {};

      if (device.device_type === 'hue_bridge') {
        functionName = 'execute-hue-action';
        payload = {
          bridgeIp: device.connection_details.bridgeIp,
          username: device.connection_details.username,
          actionType: action.action_type,
          actionParams: action.action_params,
          deviceId: action.action_params.lightId || '1'
        };
      } else if (device.device_type === 'meross_plug') {
        functionName = 'execute-meross-action';
        payload = {
          email: device.connection_details.email,
          password: device.connection_details.password,
          deviceUuid: device.connection_details.deviceUuid || 'test-uuid',
          actionType: action.action_type,
          actionParams: action.action_params,
          region: device.connection_details.region || 'us'
        };
      }

      const { error } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action_id: action.id,
        status: 'success',
        executed_at: new Date().toISOString()
      });

      setToast({ show: true, message: 'Action executed successfully', color: 'success' });
    } catch (error: any) {
      // Log failed activity
      await supabase.from('activity_log').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action_id: action.id,
        status: 'failure',
        error_message: error.message,
        executed_at: new Date().toISOString()
      });

      setToast({ show: true, message: `Test failed: ${error.message}`, color: 'danger' });
    }
  };

  const editAction = (action: Action) => {
    setSelectedAction(action);
    setActionName(action.name);
    setActionDescription(action.description || '');
    setSelectedDevice(action.device_id);
    setActionType(action.action_type);
    
    // Load action params
    if (action.action_params.brightness !== undefined) setBrightness(action.action_params.brightness);
    if (action.action_params.hue !== undefined) setHue(action.action_params.hue);
    if (action.action_params.saturation !== undefined) setSaturation(action.action_params.saturation);
    if (action.action_params.colorTemp !== undefined) setColorTemp(action.action_params.colorTemp);
    if (action.action_params.sceneId !== undefined) setSceneId(action.action_params.sceneId);
    if (action.action_params.groupId !== undefined) setGroupId(action.action_params.groupId);
    
    setShowModal(true);
  };

  const resetForm = () => {
    setSelectedAction(null);
    setActionName('');
    setActionDescription('');
    setSelectedDevice('');
    setActionType('');
    setBrightness(254);
    setHue(0);
    setSaturation(254);
    setColorTemp(200);
    setSceneId('');
    setGroupId('0');
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device?.name || 'Unknown Device';
  };

  const selectedDeviceObj = devices.find(d => d.id === selectedDevice);
  const availableActionTypes = selectedDeviceObj ? getAvailableActionTypes(selectedDeviceObj.device_type) : [];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Actions</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText>
          <h2>Manage Actions</h2>
          <p>Create and configure actions for your smart home devices.</p>
        </IonText>

        {devices.length === 0 && (
          <IonCard>
            <IonCardContent>
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>No devices found. Please add devices first.</p>
              </IonText>
              <IonButton expand="block" routerLink="/devices">Add Device</IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {actions.length === 0 && devices.length > 0 ? (
          <IonCard>
            <IonCardContent>
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>No actions yet. Tap the plus button to create your first action.</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          actions.map(action => (
            <IonCard key={action.id}>
              <IonCardHeader>
                <IonCardTitle>{action.name}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonText>
                  <p><strong>Device:</strong> {getDeviceName(action.device_id)}</p>
                  <p><strong>Action Type:</strong> {action.action_type}</p>
                  <p><strong>Description:</strong> {action.description || 'No description'}</p>
                  {Object.keys(action.action_params).length > 0 && (
                    <p><strong>Parameters:</strong> {JSON.stringify(action.action_params)}</p>
                  )}
                </IonText>
                <div style={{ marginTop: '10px' }}>
                  <IonButton size="small" onClick={() => testAction(action)}>
                    <IonIcon icon={play} slot="start" />
                    Test
                  </IonButton>
                  <IonButton size="small" onClick={() => editAction(action)}>
                    Edit
                  </IonButton>
                  <IonButton
                    size="small"
                    color="danger"
                    onClick={() => {
                      setSelectedAction(action);
                      setShowDeleteAlert(true);
                    }}
                  >
                    <IonIcon icon={trash} slot="start" />
                    Delete
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          ))
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => {
            resetForm();
            setShowModal(true);
          }}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => {
          setShowModal(false);
          resetForm();
        }}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{selectedAction ? 'Edit Action' : 'Create Action'}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Action Name *</IonLabel>
              <IonInput
                value={actionName}
                onIonChange={e => setActionName(e.detail.value!)}
                placeholder="Turn on living room lights"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Description</IonLabel>
              <IonTextarea
                value={actionDescription}
                onIonChange={e => setActionDescription(e.detail.value!)}
                placeholder="Optional description..."
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Device *</IonLabel>
              <IonSelect value={selectedDevice} onIonChange={e => {
                setSelectedDevice(e.detail.value);
                setActionType(''); // Reset action type when device changes
              }}>
                {devices.map(device => (
                  <IonSelectOption key={device.id} value={device.id}>
                    {device.name} ({device.device_type})
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {selectedDevice && (
              <IonItem>
                <IonLabel position="stacked">Action Type *</IonLabel>
                <IonSelect value={actionType} onIonChange={e => setActionType(e.detail.value)}>
                  {availableActionTypes.map(type => (
                    <IonSelectOption key={type.value} value={type.value}>
                      {type.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            )}

            {/* Action-specific parameters */}
            {(actionType === 'set_brightness' || actionType === 'light_on' || actionType === 'group_on' || actionType === 'set_color') && (
              <IonItem>
                <IonLabel>Brightness: {brightness}</IonLabel>
                <IonRange
                  min={1}
                  max={254}
                  value={brightness}
                  onIonChange={e => setBrightness(e.detail.value as number)}
                />
              </IonItem>
            )}

            {actionType === 'set_color' && (
              <>
                <IonItem>
                  <IonLabel>Hue: {hue}</IonLabel>
                  <IonRange
                    min={0}
                    max={65535}
                    value={hue}
                    onIonChange={e => setHue(e.detail.value as number)}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel>Saturation: {saturation}</IonLabel>
                  <IonRange
                    min={0}
                    max={254}
                    value={saturation}
                    onIonChange={e => setSaturation(e.detail.value as number)}
                  />
                </IonItem>
              </>
            )}

            {actionType === 'set_color_temp' && (
              <IonItem>
                <IonLabel>Color Temp (mireds): {colorTemp}</IonLabel>
                <IonRange
                  min={153}
                  max={500}
                  value={colorTemp}
                  onIonChange={e => setColorTemp(e.detail.value as number)}
                />
              </IonItem>
            )}

            {actionType === 'activate_scene' && (
              <>
                <IonItem>
                  <IonLabel position="stacked">Scene ID</IonLabel>
                  <IonInput
                    value={sceneId}
                    onIonChange={e => setSceneId(e.detail.value!)}
                    placeholder="scene-id-here"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Group ID (0 for all)</IonLabel>
                  <IonInput
                    value={groupId}
                    onIonChange={e => setGroupId(e.detail.value!)}
                    placeholder="0"
                  />
                </IonItem>
              </>
            )}

            <IonButton expand="block" onClick={saveAction} style={{ marginTop: '20px' }}>
              {selectedAction ? 'Update Action' : 'Create Action'}
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setShowModal(false)}>
              Cancel
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Action"
          message="Are you sure you want to delete this action?"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Delete', role: 'destructive', handler: deleteAction }
          ]}
        />

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

export default ActionsPage;
