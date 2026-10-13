// The small dialogs for fixing trips, shared by the trip and ticket screens.
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { addToTrip, newTrip, removeFromTrip } from './store';
import type { Trip } from './trips';
import type { Stub } from './types';

/** Asks for a trip name (iOS has a text prompt; elsewhere the suggestion is used). */
export function askTripName(title: string, suggestion: string, done: (name: string) => void) {
  if (Platform.OS === 'ios') {
    Alert.prompt(title, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Save', onPress: (v?: string) => v?.trim() && done(v.trim()) }], 'plain-text', suggestion);
  } else done(suggestion);
}

/** A list to pick from; resolves with the index or -1. */
export function pick(title: string, options: string[], done: (i: number) => void) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions({ title, options: [...options, 'Cancel'], cancelButtonIndex: options.length }, (i) =>
      done(i < options.length ? i : -1),
    );
  } else {
    Alert.alert(title, undefined, [...options.map((text, i) => ({ text, onPress: () => done(i) })), { text: 'Cancel', style: 'cancel' as const }]);
  }
}

/** "Add to trip…": one of the trips, or a new one. */
export function chooseTripFor(stub: Stub, trips: Trip[], onDone?: (tripId: string) => void) {
  const others = trips.filter((t) => !t.items.some((s) => s.id === stub.id));
  pick('Add to trip', [...others.map((t) => t.name), 'New trip…'], (i) => {
    if (i < 0) return;
    if (i < others.length) {
      addToTrip(stub.id, others[i]);
      onDone?.(others[i].id);
    } else {
      askTripName('Name the trip', stub.title, (name) => onDone?.(newTrip(stub.id, name)));
    }
  });
}

export function confirmRemove(stub: Stub, trip: Trip, onDone?: () => void) {
  Alert.alert(`Take this out of ${trip.name}?`, 'It stays in your list on its own.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Take out',
      style: 'destructive',
      onPress: () => {
        removeFromTrip(stub.id, trip);
        onDone?.();
      },
    },
  ]);
}
