import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonText,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonToast,
} from '@ionic/react';
import { supabase } from '../services/supabase';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; color: string }>({
    show: false,
    message: '',
    color: 'success'
  });

  const handleAuth = async () => {
    if (!email || !password) {
      setToast({ show: true, message: 'Please enter email and password', color: 'danger' });
      return;
    }

    setLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setToast({ show: true, message: 'Check your email for verification link', color: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setToast({ show: true, message: 'Login successful', color: 'success' });
      }
    } catch (error: any) {
      setToast({ show: true, message: error.message, color: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', maxWidth: '400px', margin: '0 auto' }}>
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonText color="primary">
                  <h1 style={{ textAlign: 'center' }}>NFC Smart Home</h1>
                </IonText>
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel position="stacked">Email</IonLabel>
                <IonInput
                  type="email"
                  value={email}
                  onIonChange={e => setEmail(e.detail.value!)}
                  placeholder="your@email.com"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Password</IonLabel>
                <IonInput
                  type="password"
                  value={password}
                  onIonChange={e => setPassword(e.detail.value!)}
                  placeholder="••••••••"
                />
              </IonItem>
              <IonButton
                expand="block"
                onClick={handleAuth}
                disabled={loading}
                style={{ marginTop: '20px' }}
              >
                {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </IonButton>
              <IonButton
                expand="block"
                fill="clear"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
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

export default LoginPage;
