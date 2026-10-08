import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StubForm } from '../components/StubForm';
import { showToast } from '../components/Toast';
import { discardDraft, isArchived, saveDraft, useStore } from '../lib/store';

function leave() {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}

/** Confirm screen after a ticket has been scanned in. */
export default function Add() {
  const draft = useStore((s) => s.draft);
  const leaving = useRef(false);

  useEffect(() => {
    if (!draft && !leaving.current) {
      leaving.current = true;
      leave();
    }
  }, [draft]);

  if (!draft) return null;

  return (
    <StubForm
      heading="New ticket"
      stub={draft}
      saveLabel={draft.tickets.length > 1 ? `Save ${draft.tickets.length} tickets` : 'Save ticket'}
      onCancel={() => {
        leaving.current = true;
        discardDraft();
        leave();
      }}
      onSave={async (fields) => {
        leaving.current = true;
        const saved = await saveDraft(fields);
        leave();
        if (saved) {
          showToast(
            isArchived(saved)
              ? 'Saved to Archive: that date has passed.'
              : saved.reminderId
                ? 'Saved. Reminder set.'
                : 'Saved.',
          );
        }
      }}
    />
  );
}
