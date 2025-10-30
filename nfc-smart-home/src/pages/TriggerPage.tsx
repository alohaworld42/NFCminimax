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
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonIcon,
  IonList,
  IonListHeader,
} from '@ionic/react';
import { play, scan } from 'ionicons/icons';
import { supabase } from '../services/supabase';
import { nfcService } from '../services/nfc.service';
import { NFCTag, Action, TagAction, Device } from '../types';

interface TagActionWithDetails extends TagAction {
  action?: Action;
  device?: Device;
}

const TriggerPage: React.FC = () => {
  const [tags, setTags] = useState<NFCTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [tagActions, setTagActions] = useState<TagActionWithDetails[]>([]);
  const [executing, setExecuting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; color: string }>({
    show: false,
    message: '',
    color: 'success'
  });

  useEffect(() => {
    loadTags();
    setupNFCListener();

    return () => {
      nfcService.stopScan();
      nfcService.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    if (selectedTag) {
      loadTagActions(selectedTag);
    }
  }, [selectedTag]);

  const setupNFCListener = () => {
    nfcService.onTagScanned(async (event) => {
      const scannedTagId = nfcService.extractTagId(event);
      setScanning(false);
      nfcService.stopScan();
      
      // Find tag in database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tag } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('user_id', user.id)
        .eq('tag_id', scannedTagId)
        .eq('is_active', true)
        .maybeSingle();

      if (tag) {
        setSelectedTag(tag.id);
        setToast({ show: true, message: `Tag detected: ${tag.name}`, color: 'primary' });
        await executeTagActions(tag.id);
      } else {
        setToast({ show: true, message: 'Unknown tag scanned', color: 'warning' });
      }
    });
  };

  const loadTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      if (data && data.length > 0) {
        setTags(data);
        if (!selectedTag) setSelectedTag(data[0].id);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadTagActions = async (tagId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tagActionsData, error: taError } = await supabase
        .from('tag_actions')
        .select('*')
        .eq('user_id', user.id)
        .eq('tag_id', tagId)
        .eq('is_enabled', true)
        .order('execution_order', { ascending: true });

      if (taError) throw taError;

      if (tagActionsData) {
        // Load related actions and devices
        const actionIds = tagActionsData.map(ta => ta.action_id);
        
        const { data: actionsData } = await supabase
          .from('actions')
          .select('*')
          .in('id', actionIds);

        const deviceIds = actionsData?.map(a => a.device_id) || [];
        
        const { data: devicesData } = await supabase
          .from('devices')
          .select('*')
          .in('id', deviceIds);

        // Combine data
        const enriched = tagActionsData.map(ta => {
          const action = actionsData?.find(a => a.id === ta.action_id);
          const device = devicesData?.find(d => d.id === action?.device_id);
          return { ...ta, action, device };
        });

        setTagActions(enriched);
      }
    } catch (error) {
      console.error('Error loading tag actions:', error);
    }
  };

  const checkTimeRestrictions = (restrictions: any): boolean => {
    if (!restrictions) return true;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Check day of week
    if (restrictions.daysOfWeek && !restrictions.daysOfWeek.includes(currentDay)) {
      return false;
    }

    // Check time range
    if (restrictions.startHour !== undefined && restrictions.endHour !== undefined) {
      if (currentHour < restrictions.startHour || currentHour > restrictions.endHour) {
        return false;
      }
    }

    return true;
  };

  const executeTagActions = async (tagId?: string) => {
    const targetTag = tagId || selectedTag;
    if (!targetTag) return;

    setExecuting(true);

    try {
      const actionsToExecute = tagActions.length > 0 
        ? tagActions 
        : await loadAndGetTagActions(targetTag);

      let successCount = 0;
      let failureCount = 0;

      for (const ta of actionsToExecute) {
        // Check time restrictions
        if (!checkTimeRestrictions(ta.time_restrictions)) {
          console.log(`Skipping action ${ta.action?.name} due to time restrictions`);
          continue;
        }

        try {
          await executeSingleAction(ta);
          successCount++;
        } catch (error: any) {
          console.error(`Failed to execute action:`, error);
          failureCount++;
        }
      }

      if (successCount > 0) {
        setToast({ 
          show: true, 
          message: `Executed ${successCount} action(s) successfully`, 
          color: 'success' 
        });
      }

      if (failureCount > 0) {
        setToast({ 
          show: true, 
          message: `${failureCount} action(s) failed`, 
          color: 'warning' 
        });
      }
    } catch (error: any) {
      setToast({ show: true, message: `Error: ${error.message}`, color: 'danger' });
    } finally {
      setExecuting(false);
    }
  };

  const loadAndGetTagActions = async (tagId: string) => {
    await loadTagActions(tagId);
    return tagActions;
  };

  const executeSingleAction = async (tagAction: TagActionWithDetails) => {
    if (!tagAction.action || !tagAction.device) {
      throw new Error('Action or device not found');
    }

    const { action, device } = tagAction;
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

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });

    // Log activity
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        tag_id: tagAction.tag_id,
        action_id: action.id,
        status: error ? 'failure' : 'success',
        error_message: error?.message,
        executed_at: new Date().toISOString()
      });
    }

    if (error) throw error;
  };

  const startNFCScan = async () => {
    try {
      const supported = await nfcService.isSupported();
      if (!supported) {
        setToast({ show: true, message: 'NFC not supported on this device', color: 'danger' });
        return;
      }

      const enabled = await nfcService.isEnabled();
      if (!enabled) {
        setToast({ show: true, message: 'Please enable NFC in device settings', color: 'warning' });
        return;
      }

      setScanning(true);
      await nfcService.startScan();
      setToast({ show: true, message: 'Scanning for NFC tags...', color: 'primary' });
    } catch (error: any) {
      setScanning(false);
      setToast({ show: true, message: `Scan error: ${error.message}`, color: 'danger' });
    }
  };

  const getTagName = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    return tag?.name || 'Unknown Tag';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Trigger Automations</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText>
          <h2>Test Automations</h2>
          <p>Manually trigger actions or scan an NFC tag.</p>
        </IonText>

        {tags.length === 0 ? (
          <IonCard>
            <IonCardContent>
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>No NFC tags configured. Please add tags first.</p>
              </IonText>
              <IonButton expand="block" routerLink="/tags">Add Tag</IonButton>
            </IonCardContent>
          </IonCard>
        ) : (
          <>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Scan NFC Tag</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonButton
                  expand="block"
                  onClick={startNFCScan}
                  disabled={scanning}
                >
                  <IonIcon icon={scan} slot="start" />
                  {scanning ? 'Scanning...' : 'Scan NFC Tag'}
                </IonButton>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Manual Trigger</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonItem>
                  <IonLabel>Select Tag:</IonLabel>
                  <IonSelect value={selectedTag} onIonChange={e => setSelectedTag(e.detail.value)}>
                    {tags.map(tag => (
                      <IonSelectOption key={tag.id} value={tag.id}>
                        {tag.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                {selectedTag && tagActions.length > 0 && (
                  <IonList>
                    <IonListHeader>
                      <IonLabel>Actions to Execute:</IonLabel>
                    </IonListHeader>
                    {tagActions.map((ta, index) => (
                      <IonItem key={ta.id}>
                        <IonLabel>
                          <h3>{index + 1}. {ta.action?.name}</h3>
                          <p>{ta.device?.name} - {ta.action?.action_type}</p>
                          {ta.time_restrictions && (
                            <p style={{ fontSize: '0.85em', color: 'var(--ion-color-medium)' }}>
                              Restricted: {ta.time_restrictions.startHour}:00-{ta.time_restrictions.endHour}:00
                            </p>
                          )}
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}

                {selectedTag && tagActions.length === 0 && (
                  <IonText color="medium">
                    <p style={{ textAlign: 'center', marginTop: '10px' }}>
                      No actions configured for this tag.
                    </p>
                  </IonText>
                )}

                <IonButton
                  expand="block"
                  onClick={() => executeTagActions()}
                  disabled={executing || !selectedTag || tagActions.length === 0}
                  style={{ marginTop: '15px' }}
                >
                  <IonIcon icon={play} slot="start" />
                  {executing ? 'Executing...' : 'Execute Actions'}
                </IonButton>
              </IonCardContent>
            </IonCard>
          </>
        )}

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

export default TriggerPage;
