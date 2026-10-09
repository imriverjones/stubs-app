import { router } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { Directory, Paths } from 'expo-file-system';
import { isPaperScanAvailable, scanPaperAsync } from '../../modules/stubs-scanner';
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
      'Paste the link to your ticket page (GetYourGuide, Viator, a venue…). You can sign in on the next screen, then tap Capture when the QR code shows.',
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

  /** Paper ticket: Apple's document camera, then the usual reading. */
  const paper = () =>
    run(async () => {
      const dir = new Directory(Paths.cache, 'paper');
      dir.create({ intermediates: true, idempotent: true });
      const uris = await scanPaperAsync(dir.uri);
      return uris.map((uri, i) => ({ uri, name: `Paper ticket ${i + 1}.jpg`, mimeType: 'image/jpeg' }));
    });

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
        ...options.slice(0, -1).map((text, i) => ({ text, onPress: () => handle(i) })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  }

  function open() {
    if (mode === 'stays') return openStays();
    const ios = Platform.OS === 'ios';
    const options = [
      ...(isPaperScanAvailable ? ['Scan a paper ticket'] : []),
      'Photos',
      'PDF from Files',
      ...(ios ? ['Ticket link'] : []),
      'Cancel',
    ];
    const handle = (i: number) => {
      const choice = options[i];
      if (choice === 'Scan a paper ticket') paper();
      if (choice === 'Photos') run(pickPhotos);
      if (choice === 'PDF from Files') run(pickDocument);
      if (choice === 'Ticket link') askForLink();
    };
    if (ios) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          title: 'Add a ticket',
          message: 'Tip: in Mail, Safari or a booking app, tap Share → Stash.',
        },
        handle,
      );
    } else {
      Alert.alert('Add a ticket', undefined, [
        ...options.slice(0, -1).map((text, i) => ({ text, onPress: () => handle(i) })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  }

  const pdf = () => run(pickDocument);

  return { open, screens, photos, pdf, paper, canScanPaper: isPaperScanAvailable, link: askForLink, busy };
}
