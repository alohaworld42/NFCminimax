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
  IonSelect,
  IonSelectOption,
  IonInput,
  IonCheckbox,
  IonToast,
  IonReorder,
  IonReorderGroup,
  IonIcon,
  IonAlert,
} from '@ionic/react';
import { add, reorderThree, trash } from 'ionicons/icons';
import { supabase } from '../services/supabase';
import { NFCTag, Action, TagAction } from '../types';

interface TagActionWithDetails extends TagAction {
  action_name?: string;
  action_type?: string;
}

const TagActionsPage: React.FC = () => {
  const [tags, setTags] = useState<NFCTag[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [tagActions, setTagActions] = useState<TagActionWithDetails[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedTagAction, setSelectedTagAction] = useState<TagActionWithDetails | null>(null);
  
  // Form state
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [hasTimeRestrictions, setHasTimeRestrictions] = useState(false);
  const [startHour, setStartHour] = useState('0');
  const [endHour, setEndHour] = useState('23');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  
  const [toast, setToast] = useState<{ show: boolean; message: string; color: string }>({
    show: false,
    message: '',
    color: 'success'
  });

  useEffect(() => {
    loadTags();
    loadActions();
  }, []);

  useEffect(() => {
    if (selectedTag) {
      loadTagActions(selectedTag);
    }
  }, [selectedTag]);

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

  const loadActions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      if (data) setActions(data);
    } catch (error) {
      console.error('Error loading actions:', error);
    }
  };

  const loadTagActions = async (tagId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tag_actions')
        .select('*')
        .eq('user_id', user.id)
        .eq('tag_id', tagId)
        .order('execution_order', { ascending: true });

      if (error) throw error;
      
      if (data) {
        // Enrich with action details
        const enriched = data.map(ta => {
          const action = actions.find(a => a.id === ta.action_id);
          return {
            ...ta,
            action_name: action?.name,
            action_type: action?.action_type
          };
        });
        setTagActions(enriched);
      }
    } catch (error) {
      console.error('Error loading tag actions:', error);
    }
  };

  const saveTagAction = async () => {
    if (!selectedTag || !selectedAction) {
      setToast({ show: true, message: 'Please select a tag and action', color: 'warning' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const timeRestrictions = hasTimeRestrictions ? {
        startHour: parseInt(startHour),
        endHour: parseInt(endHour),
        daysOfWeek
      } : null;

      const nextOrder = tagActions.length > 0 
        ? Math.max(...tagActions.map(ta => ta.execution_order)) + 1 
        : 0;

      const { error } = await supabase.from('tag_actions').insert({
        user_id: user.id,
        tag_id: selectedTag,
        action_id: selectedAction,
        execution_order: nextOrder,
        time_restrictions: timeRestrictions,
        is_enabled: isEnabled
      });

      if (error) throw error;

      setToast({ show: true, message: 'Action linked to tag successfully', color: 'success' });
      resetForm();
      setShowModal(false);
      loadTagActions(selectedTag);
    } catch (error: any) {
      setToast({ show: true, message: `Error linking action: ${error.message}`, color: 'danger' });
    }
  };

  const deleteTagAction = async () => {
    if (!selectedTagAction) return;

    try {
      const { error } = await supabase
        .from('tag_actions')
        .delete()
        .eq('id', selectedTagAction.id);

      if (error) throw error;

      setToast({ show: true, message: 'Action removed from tag', color: 'success' });
      setShowDeleteAlert(false);
      setSelectedTagAction(null);
      loadTagActions(selectedTag);
    } catch (error: any) {
      setToast({ show: true, message: `Error removing action: ${error.message}`, color: 'danger' });
    }
  };

  const toggleEnabled = async (tagActionId: string, currentEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('tag_actions')
        .update({ is_enabled: !currentEnabled })
        .eq('id', tagActionId);

      if (error) throw error;

      setToast({ show: true, message: 'Action status updated', color: 'success' });
      loadTagActions(selectedTag);
    } catch (error: any) {
      setToast({ show: true, message: `Error updating status: ${error.message}`, color: 'danger' });
    }
  };

  const handleReorder = async (event: CustomEvent) => {
    const from = event.detail.from;
    const to = event.detail.to;
    
    const reordered = [...tagActions];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    // Update execution order
    const updates = reordered.map((ta, index) => ({
      id: ta.id,
      execution_order: index
    }));

    try {
      for (const update of updates) {
        await supabase
          .from('tag_actions')
          .update({ execution_order: update.execution_order })
          .eq('id', update.id);
      }

      setTagActions(reordered);
      setToast({ show: true, message: 'Execution order updated', color: 'success' });
    } catch (error: any) {
      setToast({ show: true, message: `Error reordering: ${error.message}`, color: 'danger' });
    }

    event.detail.complete();
  };

  const resetForm = () => {
    setSelectedAction('');
    setIsEnabled(true);
    setHasTimeRestrictions(false);
    setStartHour('0');
    setEndHour('23');
    setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
  };

  const getTagName = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    return tag?.name || 'Unknown Tag';
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Link Tags to Actions</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText>
          <h2>Configure Tag Actions</h2>
          <p>Link actions to NFC tags and set execution order.</p>
        </IonText>

        {tags.length === 0 && (
          <IonCard>
            <IonCardContent>
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>No NFC tags found. Please add tags first.</p>
              </IonText>
              <IonButton expand="block" routerLink="/tags">Add Tag</IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {actions.length === 0 && tags.length > 0 && (
          <IonCard>
            <IonCardContent>
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>No actions found. Please create actions first.</p>
              </IonText>
              <IonButton expand="block" routerLink="/actions">Create Action</IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {tags.length > 0 && actions.length > 0 && (
          <>
            <IonItem>
              <IonLabel>Select NFC Tag:</IonLabel>
              <IonSelect value={selectedTag} onIonChange={e => setSelectedTag(e.detail.value)}>
                {tags.map(tag => (
                  <IonSelectOption key={tag.id} value={tag.id}>
                    {tag.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {selectedTag && (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Actions for: {getTagName(selectedTag)}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {tagActions.length === 0 ? (
                    <IonText color="medium">
                      <p>No actions linked to this tag yet.</p>
                    </IonText>
                  ) : (
                    <>
                      <IonText>
                        <p><strong>Drag to reorder execution:</strong></p>
                      </IonText>
                      <IonReorderGroup disabled={false} onIonItemReorder={handleReorder}>
                        {tagActions.map((ta, index) => (
                          <IonItem key={ta.id}>
                            <IonReorder slot="start">
                              <IonIcon icon={reorderThree} />
                            </IonReorder>
                            <IonLabel>
                              <h3>{index + 1}. {ta.action_name}</h3>
                              <p>Type: {ta.action_type}</p>
                              {ta.time_restrictions && (
                                <p style={{ fontSize: '0.9em', color: 'var(--ion-color-medium)' }}>
                                  Time: {ta.time_restrictions.startHour}:00 - {ta.time_restrictions.endHour}:00
                                </p>
                              )}
                            </IonLabel>
                            <IonCheckbox
                              slot="end"
                              checked={ta.is_enabled}
                              onIonChange={() => toggleEnabled(ta.id, ta.is_enabled)}
                            />
                            <IonButton
                              slot="end"
                              size="small"
                              color="danger"
                              onClick={() => {
                                setSelectedTagAction(ta);
                                setShowDeleteAlert(true);
                              }}
                            >
                              <IonIcon icon={trash} />
                            </IonButton>
                          </IonItem>
                        ))}
                      </IonReorderGroup>
                    </>
                  )}
                  <IonButton
                    expand="block"
                    onClick={() => setShowModal(true)}
                    style={{ marginTop: '15px' }}
                  >
                    <IonIcon icon={add} slot="start" />
                    Add Action to Tag
                  </IonButton>
                </IonCardContent>
              </IonCard>
            )}
          </>
        )}

        <IonModal isOpen={showModal} onDidDismiss={() => {
          setShowModal(false);
          resetForm();
        }}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Link Action to Tag</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Select Action *</IonLabel>
              <IonSelect value={selectedAction} onIonChange={e => setSelectedAction(e.detail.value)}>
                {actions.map(action => (
                  <IonSelectOption key={action.id} value={action.id}>
                    {action.name} ({action.action_type})
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <IonItem>
              <IonLabel>Enabled</IonLabel>
              <IonCheckbox checked={isEnabled} onIonChange={e => setIsEnabled(e.detail.checked)} />
            </IonItem>

            <IonItem>
              <IonLabel>Time Restrictions</IonLabel>
              <IonCheckbox
                checked={hasTimeRestrictions}
                onIonChange={e => setHasTimeRestrictions(e.detail.checked)}
              />
            </IonItem>

            {hasTimeRestrictions && (
              <>
                <IonItem>
                  <IonLabel position="stacked">Start Hour (0-23)</IonLabel>
                  <IonInput
                    type="number"
                    min="0"
                    max="23"
                    value={startHour}
                    onIonChange={e => setStartHour(e.detail.value!)}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">End Hour (0-23)</IonLabel>
                  <IonInput
                    type="number"
                    min="0"
                    max="23"
                    value={endHour}
                    onIonChange={e => setEndHour(e.detail.value!)}
                  />
                </IonItem>
                <IonText style={{ padding: '10px' }}>
                  <p><strong>Days of Week:</strong></p>
                </IonText>
                {dayNames.map((day, index) => (
                  <IonItem key={index}>
                    <IonLabel>{day}</IonLabel>
                    <IonCheckbox
                      checked={daysOfWeek.includes(index)}
                      onIonChange={e => {
                        if (e.detail.checked) {
                          setDaysOfWeek([...daysOfWeek, index]);
                        } else {
                          setDaysOfWeek(daysOfWeek.filter(d => d !== index));
                        }
                      }}
                    />
                  </IonItem>
                ))}
              </>
            )}

            <IonButton expand="block" onClick={saveTagAction} style={{ marginTop: '20px' }}>
              Link Action to Tag
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setShowModal(false)}>
              Cancel
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Remove Action"
          message="Are you sure you want to remove this action from the tag?"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Remove', role: 'destructive', handler: deleteTagAction }
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

export default TagActionsPage;
