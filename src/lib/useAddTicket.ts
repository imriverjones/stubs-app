import { router } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { importFiles, type IncomingFile } from './importer';
import { pickDocument, pickPhotos } from './pickers';

/** "+" button flow: choose a source, scan it, open the confirm screen. */
export function useAddTicket(mode: 'tickets' | 'stays' = 'tickets') {
  const [busy, setBusy] = useState(false);

  async function run(pick: () => Promise<IncomingFile[]>, asStay = false) {
    const files = await pick();
    if (!files.length) return;
    setBusy(true);
    try {
      await importFiles(files, { asStay });
      router.push('/add');
    } catch (e) {
      Alert.alert("Couldn't add that ticket", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function askForLink() {
    Alert.prompt(
      'Ticket link',
      'Paste the link to your ticket page. You can sign in on the next screen if it asks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: (value?: string) => {
            const url = value?.trim();
            if (url) router.push({ pathname: '/web', params: { url: /^https?:\/\//i.test(url) ? url : `https://${url}` } });
          },
        },
      ],
      'plain-text',
      '',
      'url',
    );
  }

  const screens = () => run(pickPhotos, true);
  const photos = () => run(pickPhotos);

  function openStays() {
    const options = ['Paste the host’s message', 'Check-in screenshots', 'Cancel'];
    const handle = (i: number) => {
      if (i === 0) router.push('/paste');
      if (i === 1) screens();
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          title: 'Add a stay',
          message: 'In Airbnb: Messages → press and hold the host’s message → Copy. Or screenshot the check-in screens.',
        },
        handle,
      );
    } else {
      Alert.alert('Add a stay', undefined, [
        { text: options[0], onPress: () => handle(0) },
        { text: options[1], onPress: () => handle(1) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  function open() {
    if (mode === 'stays') return openStays();
    const ios = Platform.OS === 'ios';
    const options = ios
      ? ['Screenshot from Photos', 'PDF from Files', 'Ticket link', 'Cancel']
      : ['Screenshot from Photos', 'PDF from Files', 'Cancel'];
    const handle = (i: number) => {
      if (i === 0) run(pickPhotos);
      if (i === 1) run(pickDocument);
      if (ios && i === 2) askForLink();
    };
    if (ios) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          title: 'Add a ticket',
          message: 'Tip: in Mail or Safari, tap Share → Stash.',
        },
        handle,
      );
    } else {
      Alert.alert('Add a ticket', undefined, [
        { text: options[0], onPress: () => handle(0) },
        { text: options[1], onPress: () => handle(1) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  return { open, screens, photos, link: askForLink, busy };
}
