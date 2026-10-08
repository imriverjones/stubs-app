import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, lineLimit, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type NextTicketProps = {
  /** "THE BOOK OF MORMON" ('' when nothing is coming up) */
  title: string;
  /** "EVENT" / "FLIGHT" / "STAY" */
  label: string;
  /** Days to go: 0 = today. */
  days: number;
  /** "Thu 31 Dec · 19:30" */
  when: string;
  /** stubs://ticket/<id> */
  url: string;
  /** Ticket colours, worked out in the app. */
  accent: string;
  deep: string;
};

// Runs inside the widget's own runtime: only Expo UI components, nothing from outside this function.
const NextTicket = (props: NextTicketProps, env: WidgetEnvironment) => {
  'widget';
  const paper = '#F4F4F0';
  const soft = '#B9B9B2';
  const empty = props.title.length === 0;
  const big = props.days <= 0 ? 'TODAY' : `${props.days}`;
  const unit = props.days <= 0 ? '' : props.days === 1 ? 'DAY TO GO' : 'DAYS TO GO';
  const medium = env.widgetFamily === 'systemMedium';

  if (empty) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[containerBackground('#111111', 'widget'), widgetURL('stubs://')]}>
        <Text modifiers={[font({ size: 11, weight: 'bold', design: 'monospaced' }), foregroundStyle(props.accent)]}>STASH</Text>
        <Spacer />
        <Text modifiers={[font({ size: 17, weight: 'heavy' }), foregroundStyle(paper), lineLimit(3)]}>Nothing coming up</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(soft), lineLimit(2)]}>Share a ticket to Stash</Text>
      </VStack>
    );
  }

  const countdown = (
    <VStack alignment="leading" spacing={0}>
      <Text modifiers={[font({ size: props.days <= 0 ? 30 : 46, weight: 'black' }), foregroundStyle(props.accent)]}>{big}</Text>
      {unit.length > 0 ? (
        <Text modifiers={[font({ size: 9, weight: 'bold', design: 'monospaced' }), foregroundStyle(soft)]}>{unit}</Text>
      ) : null}
    </VStack>
  );

  const details = (
    <VStack alignment="leading" spacing={3}>
      <Text modifiers={[font({ size: 10, weight: 'bold', design: 'monospaced' }), foregroundStyle(props.accent)]}>{props.label}</Text>
      <Text modifiers={[font({ size: medium ? 20 : 15, weight: 'heavy' }), foregroundStyle(paper), lineLimit(2)]}>{props.title}</Text>
      <Text modifiers={[font({ size: 11, design: 'monospaced' }), foregroundStyle(soft), lineLimit(1)]}>{props.when}</Text>
    </VStack>
  );

  return medium ? (
    <HStack spacing={16} modifiers={[containerBackground(props.deep, 'widget'), widgetURL(props.url), padding({ all: 2 })]}>
      {countdown}
      {details}
      <Spacer />
    </HStack>
  ) : (
    <VStack alignment="leading" spacing={6} modifiers={[containerBackground(props.deep, 'widget'), widgetURL(props.url)]}>
      {countdown}
      <Spacer />
      {details}
    </VStack>
  );
};

export default createWidget<NextTicketProps>('NextTicket', NextTicket);
