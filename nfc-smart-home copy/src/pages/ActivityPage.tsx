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
  IonRefresher,
  IonRefresherContent,
  IonBadge,
  IonIcon,
} from '@ionic/react';
import { checkmarkCircle, closeCircle, time } from 'ionicons/icons';
import { supabase } from '../services/supabase';
import { ActivityLog } from '../types';

const ActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const loadActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleRefresh = async (event: CustomEvent) => {
    await loadActivities();
    event.detail.complete();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failure':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'medium';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return checkmarkCircle;
      case 'failure':
        return closeCircle;
      case 'pending':
        return time;
      default:
        return time;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Activity Log</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonText>
          <h2>Recent Automation Activity</h2>
          <p>View all triggered NFC tag actions and their results.</p>
        </IonText>

        {activities.length === 0 ? (
          <IonCard>
            <IonCardContent>
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>
                  No activity yet. Scan an NFC tag to trigger your first automation.
                </p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          activities.map(activity => (
            <IonCard key={activity.id}>
              <IonCardHeader>
                <IonCardTitle>
                  <IonBadge color={getStatusColor(activity.status)}>
                    <IonIcon icon={getStatusIcon(activity.status)} /> {activity.status.toUpperCase()}
                  </IonBadge>
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonText>
                  <p><strong>Time:</strong> {formatDate(activity.executed_at)}</p>
                  <p><strong>Tag ID:</strong> {activity.tag_id || 'N/A'}</p>
                  <p><strong>Action ID:</strong> {activity.action_id || 'N/A'}</p>
                  {activity.error_message && (
                    <p style={{ color: 'var(--ion-color-danger)' }}>
                      <strong>Error:</strong> {activity.error_message}
                    </p>
                  )}
                </IonText>
              </IonCardContent>
            </IonCard>
          ))
        )}
      </IonContent>
    </IonPage>
  );
};

export default ActivityPage;
