import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { RoundButton } from '../../components/RoundButton';
import { useStore } from '../../lib/store';
import { colors, fonts } from '../../theme';

/** Every page as it arrived. Pinch to zoom on iOS. */
export default function Original() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stub = useStore((s) => s.stubs.find((x) => x.id === id));
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!stub) return null;
  const pages = stub.pageUris.length ? stub.pageUris : stub.tickets.map((t) => t.pageUri);

  return (
    <View style={styles.screen}>
      <View style={styles.bar}>
        <Text style={styles.name} numberOfLines={1}>
          {stub.sourceName}
        </Text>
        <RoundButton label="Close" onPress={() => router.back()} size={40} color={colors.paper}>
          <Icon name="close" size={18} color={colors.ink} />
        </RoundButton>
      </View>
      <ScrollView
        maximumZoomScale={4}
        minimumZoomScale={1}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: insets.bottom + 24 }}
      >
        {pages.map((uri, i) => (
          <Page key={`${uri}-${i}`} uri={uri} width={width - 24} index={i} />
        ))}
      </ScrollView>
    </View>
  );
}

function Page({ uri, width, index }: { uri: string; width: number; index: number }) {
  const [ratio, setRatio] = useState(1 / Math.SQRT2);
  return (
    <Image
      source={{ uri }}
      onLoad={(e) => e.source.width && e.source.height && setRatio(e.source.width / e.source.height)}
      style={{ width, aspectRatio: ratio, borderRadius: 6, backgroundColor: colors.paper }}
      contentFit="contain"
      accessibilityLabel={`Page ${index + 1}`}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  name: { flex: 1, fontFamily: fonts.mono, fontSize: 13, color: colors.nightText },
});
