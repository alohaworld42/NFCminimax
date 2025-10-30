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
  IonAlert,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonToast,
  IonFab,
  IonFabButton,
  IonIcon,
} from '@ionic/react';
import { scan, trash } from 'ionicons/icons';
import { supabase } from '../services/supabase';
import { nfcService } from '../services/nfc.service';
import { NFCTag } from '../types';

const TagsPage: React.FC = () => {
  const [tags, setTags] = useState<NFCTag[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedTag, setSelectedTag] = useState<NFCTag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagDescription, setTagDescription] = useState('');
  const [scannedTagId, setScannedTagId] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; color: string }>({
    show: false,
    message: '',
    color: 'success'
  });

  useEffect(() => {
    loadTags();
    checkNFCSupport();

    return () => {
      nfcService.stopScan();
      nfcService.removeAllListeners();
    };
  }, []);

  const checkNFCSupport = async () => {
    const supported = await nfcService.isSupported();
    if (!supported) {
      setToast({ show: true, message: 'NFC is not supported on this device', color: 'warning' });
    }
  };

  const loadTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('nfc_tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setTags(data);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const startScanForNewTag = async () => {
    setShowScanModal(true);

    try {
      const enabled = await nfcService.isEnabled();
      if (!enabled) {
        setToast({ show: true, message: 'Please enable NFC in settings', color: 'warning' });
        return;
      }

      await nfcService.startScan();

      nfcService.onTagScanned((event) => {
        const tagId = nfcService.extractTagId(event);
        setScannedTagId(tagId);
        nfcService.stopScan();
        setShowModal(true);
        setShowScanModal(false);
      });

    } catch (error: any) {
      setToast({ show: true, message: `Scan error: ${error.message}`, color: 'danger' });
    }
  };

  const saveTag = async () => {
    if (!tagName || !scannedTagId) {
      setToast({ show: true, message: 'Please provide a tag name', color: 'warning' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('nfc_tags').insert({
        user_id: user.id,
        tag_id: scannedTagId,
        name: tagName,
        description: tagDescription,
        is_active: true
      });

      if (error) throw error;

      setToast({ show: true, message: 'NFC tag saved successfully', color: 'success' });
      setShowModal(false);
      setTagName('');
      setTagDescription('');
      setScannedTagId('');
      loadTags();
    } catch (error: any) {
      setToast({ show: true, message: `Error saving tag: ${error.message}`, color: 'danger' });
    }
  };

  const deleteTag = async () => {
    if (!selectedTag) return;

    try {
      const { error } = await supabase
        .from('nfc_tags')
        .delete()
        .eq('id', selectedTag.id);

      if (error) throw error;

      setToast({ show: true, message: 'Tag deleted successfully', color: 'success' });
      setShowDeleteAlert(false);
      setSelectedTag(null);
      loadTags();
    } catch (error: any) {
      setToast({ show: true, message: `Error deleting tag: ${error.message}`, color: 'danger' });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>NFC Tags</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText>
          <h2>Manage NFC Tags</h2>
          <p>Scan NFC tags and assign actions to automate your smart home devices.</p>
        </IonText>

        {tags.length === 0 ? (
          <IonCard>
            <IonCardContent>
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>No NFC tags yet. Tap the scan button to add your first tag.</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          tags.map(tag => (
            <IonCard key={tag.id}>
              <IonCardHeader>
                <IonCardTitle>{tag.name}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonText>
                  <p><strong>Tag ID:</strong> {tag.tag_id}</p>
                  <p><strong>Description:</strong> {tag.description || 'No description'}</p>
                  <p><strong>Status:</strong> {tag.is_active ? 'Active' : 'Inactive'}</p>
                </IonText>
                <IonButton
                  color="danger"
                  size="small"
                  onClick={() => {
                    setSelectedTag(tag);
                    setShowDeleteAlert(true);
                  }}
                >
                  <IonIcon icon={trash} slot="start" />
                  Delete
                </IonButton>
              </IonCardContent>
            </IonCard>
          ))
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={startScanForNewTag}>
            <IonIcon icon={scan} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showScanModal} onDidDismiss={() => {
          setShowScanModal(false);
          nfcService.stopScan();
        }}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Scan NFC Tag</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <IonText>
                <h2>Hold your device near an NFC tag</h2>
                <p>Scanning...</p>
              </IonText>
              <IonButton onClick={() => {
                setShowScanModal(false);
                nfcService.stopScan();
              }}>
                Cancel
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>New NFC Tag</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Tag ID</IonLabel>
              <IonInput value={scannedTagId} readonly />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Name</IonLabel>
              <IonInput
                value={tagName}
                onIonChange={e => setTagName(e.detail.value!)}
                placeholder="Living Room Tag"
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Description</IonLabel>
              <IonTextarea
                value={tagDescription}
                onIonChange={e => setTagDescription(e.detail.value!)}
                placeholder="Tag description..."
              />
            </IonItem>
            <IonButton expand="block" onClick={saveTag} style={{ marginTop: '20px' }}>
              Save Tag
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setShowModal(false)}>
              Cancel
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Tag"
          message="Are you sure you want to delete this NFC tag?"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Delete', role: 'destructive', handler: deleteTag }
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

export default TagsPage;
