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
  IonItem,
  IonLabel,
  IonToggle,
  IonToast,
} from '@ionic/react';
import { supabase } from '../services/supabase';

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [visualConfirmation, setVisualConfirmation] = useState(true);
  const [audioConfirmation, setAudioConfirmation] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; color: string }>({
    show: false,
    message: '',
    color: 'success'
  });

  useEffect(() => {
    loadUserProfile();
    loadSettings();
  }, []);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadSettings = () => {
    const settings = localStorage.getItem('app_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      setHapticFeedback(parsed.hapticFeedback ?? true);
      setVisualConfirmation(parsed.visualConfirmation ?? true);
      setAudioConfirmation(parsed.audioConfirmation ?? false);
    }
  };

  const saveSettings = () => {
    const settings = {
      hapticFeedback,
      visualConfirmation,
      audioConfirmation
    };
    localStorage.setItem('app_settings', JSON.stringify(settings));
    setToast({ show: true, message: 'Settings saved', color: 'success' });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setToast({ show: true, message: 'Signed out successfully', color: 'success' });
    } catch (error: any) {
      setToast({ show: true, message: `Error signing out: ${error.message}`, color: 'danger' });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Account</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonText>
              <p><strong>Email:</strong> {user?.email || 'Not logged in'}</p>
              <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
            </IonText>
            <IonButton expand="block" color="danger" onClick={handleSignOut}>
              Sign Out
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>App Preferences</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel>Haptic Feedback</IonLabel>
              <IonToggle
                checked={hapticFeedback}
                onIonChange={e => setHapticFeedback(e.detail.checked)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>Visual Confirmation</IonLabel>
              <IonToggle
                checked={visualConfirmation}
                onIonChange={e => setVisualConfirmation(e.detail.checked)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>Audio Confirmation</IonLabel>
              <IonToggle
                checked={audioConfirmation}
                onIonChange={e => setAudioConfirmation(e.detail.checked)}
              />
            </IonItem>
            <IonButton expand="block" onClick={saveSettings} style={{ marginTop: '20px' }}>
              Save Preferences
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>About</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonText>
              <p><strong>App Version:</strong> 1.0.0</p>
              <p><strong>Platform:</strong> Ionic/Capacitor</p>
              <p><strong>Backend:</strong> Supabase</p>
              <p><strong>NFC Plugin:</strong> Capawesome NFC</p>
            </IonText>
          </IonCardContent>
        </IonCard>

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

export default SettingsPage;
