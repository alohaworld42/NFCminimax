import React, { useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { home, grid, cog, flash, link } from 'ionicons/icons';

import Dashboard from './pages/Dashboard';
import TagsPage from './pages/TagsPage';
import DevicesPage from './pages/DevicesPage';
import ActionsPage from './pages/ActionsPage';
import TagActionsPage from './pages/TagActionsPage';
import ActivityPage from './pages/ActivityPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

import { supabase } from './services/supabase';

setupIonicReact();

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <IonApp>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          Loading...
        </div>
      </IonApp>
    );
  }

  if (!session) {
    return (
      <IonApp>
        <LoginPage />
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/dashboard">
              <Dashboard />
            </Route>
            <Route exact path="/tags">
              <TagsPage />
            </Route>
            <Route exact path="/devices">
              <DevicesPage />
            </Route>
            <Route exact path="/actions">
              <ActionsPage />
            </Route>
            <Route exact path="/tag-actions">
              <TagActionsPage />
            </Route>
            <Route exact path="/activity">
              <ActivityPage />
            </Route>
            <Route exact path="/settings">
              <SettingsPage />
            </Route>
            <Route exact path="/">
              <Redirect to="/dashboard" />
            </Route>
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonIcon icon={home} />
              <IonLabel>Dashboard</IonLabel>
            </IonTabButton>
            <IonTabButton tab="tags" href="/tags">
              <IonIcon icon={grid} />
              <IonLabel>NFC Tags</IonLabel>
            </IonTabButton>
            <IonTabButton tab="devices" href="/devices">
              <IonIcon icon={cog} />
              <IonLabel>Devices</IonLabel>
            </IonTabButton>
            <IonTabButton tab="actions" href="/actions">
              <IonIcon icon={flash} />
              <IonLabel>Actions</IonLabel>
            </IonTabButton>
            <IonTabButton tab="tag-actions" href="/tag-actions">
              <IonIcon icon={link} />
              <IonLabel>Link</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
