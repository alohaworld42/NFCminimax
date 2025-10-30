import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonText,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { wifi, power, time } from 'ionicons/icons';
import { supabase } from '../services/supabase';
import { NFCTag, Device, ActivityLog } from '../types';

const Dashboard: React.FC = () => {
  const [tags, setTags] = useState<NFCTag[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [tagsRes, devicesRes, activityRes] = await Promise.all([
        supabase.from('nfc_tags').select('*').eq('user_id', user.id).limit(5),
        supabase.from('devices').select('*').eq('user_id', user.id),
        supabase.from('activity_log').select('*').eq('user_id', user.id).order('executed_at', { ascending: false }).limit(5)
      ]);

      if (tagsRes.data) setTags(tagsRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
      if (activityRes.data) setRecentActivity(activityRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = async (event: CustomEvent) => {
    await loadDashboardData();
    event.detail.complete();
  };

  const onlineDevices = devices.filter(d => d.is_online).length;
  const activeTags = tags.filter(t => t.is_active).length;
  const successfulActions = recentActivity.filter(a => a.status === 'success').length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonText>
          <h2>Quick Stats</h2>
        </IonText>

        <IonGrid>
          <IonRow>
            <IonCol size="6">
              <IonCard>
                <IonCardContent style={{ textAlign: 'center' }}>
                  <IonIcon icon={wifi} size="large" color="primary" />
                  <h2>{onlineDevices}</h2>
                  <p>Online Devices</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard>
                <IonCardContent style={{ textAlign: 'center' }}>
                  <IonIcon icon={power} size="large" color="success" />
                  <h2>{activeTags}</h2>
                  <p>Active Tags</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardContent style={{ textAlign: 'center' }}>
                  <IonIcon icon={time} size="large" color="tertiary" />
                  <h2>{successfulActions}/{recentActivity.length}</h2>
                  <p>Recent Successful Actions</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonText>
          <h2>Recent NFC Tags</h2>
        </IonText>

        {tags.length === 0 ? (
          <IonCard>
            <IonCardContent>
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>No NFC tags configured yet. Go to NFC Tags tab to add your first tag.</p>
              </IonText>
              <IonButton expand="block" routerLink="/tags">Add NFC Tag</IonButton>
            </IonCardContent>
          </IonCard>
        ) : (
          tags.map(tag => (
            <IonCard key={tag.id}>
              <IonCardHeader>
                <IonCardTitle>{tag.name}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonText color="medium">
                  <p>{tag.description || 'No description'}</p>
                  <p>Status: {tag.is_active ? 'Active' : 'Inactive'}</p>
                </IonText>
              </IonCardContent>
            </IonCard>
          ))
        )}
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
