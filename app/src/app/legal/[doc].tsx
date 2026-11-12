import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Shell } from '@/components/Shell';
import { Card, Empty, styles as ui } from '@/components/ui';
import { LEGAL_DOCS, LEGAL_UPDATED } from '@/lib/legal';

export default function LegalPage() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const page = LEGAL_DOCS[doc];

  if (!page) {
    return (
      <Shell title="TradeHub">
        <Empty icon="document-outline" title="Page not found" />
      </Shell>
    );
  }

  return (
    <Shell title={page.title} narrow>
      <Text style={ui.h1}>{page.title}</Text>
      <Text style={ui.hint}>Last updated {LEGAL_UPDATED}</Text>
      <Card style={{ gap: 18 }}>
        <Text style={ui.body}>{page.intro}</Text>
        {page.sections.map((section) => (
          <View key={section.heading} style={{ gap: 8 }}>
            <Text style={ui.h2}>{section.heading}</Text>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={ui.body}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </Card>
    </Shell>
  );
}
