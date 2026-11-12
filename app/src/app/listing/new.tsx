import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Shell } from '@/components/Shell';
import { SignInPrompt } from '@/components/SignInPrompt';
import { Button, Card, Field, Loading, Notice, styles as ui } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORIES, CONDITIONS } from '@/lib/catalog';
import { CURRENCY, digitsOnly } from '@/lib/format';
import { c, radius } from '@/lib/theme';
import type { Listing } from '@/lib/types';

const MAX_PHOTOS = 6;

function Choices({ label, options, value, onChange }: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.label}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const active = o.key === value;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(o.key)}
              style={[styles.choice, active && { backgroundColor: c.primary, borderColor: c.primary }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#FFFFFF' : c.text }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function NewListing() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', value: '', wants: '', category: '', condition: '' });
  const [city, setCity] = useState<string | null>(null);
  // Photos as data URLs, ready to upload.
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (field: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  if (loading) return <Shell title="Post an item"><Loading /></Shell>;
  if (!user) {
    return (
      <Shell title="Post an item">
        <SignInPrompt text="Create a free account to list items and trade them." />
      </Shell>
    );
  }

  const addPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.6,
      base64: true,
    });
    if (result.canceled) return;
    const picked = result.assets
      .filter((asset) => asset.base64)
      .map((asset) => `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    setPhotos((current) => [...current, ...picked].slice(0, MAX_PHOTOS));
  };

  const submit = async () => {
    if (!form.category || !form.condition) return setError('Choose a category and a condition for your item.');
    setBusy(true);
    setError(null);
    try {
      const { listing } = await api<{ listing: Listing }>('/listings', {
        body: { ...form, value: Number(form.value), city: city ?? user.city, images: photos },
      });
      router.replace(`/listing/${listing.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Post an item" narrow>
      <Text style={ui.h1}>Post an item to trade</Text>
      <Card style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Text style={ui.label}>Photos</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {photos.map((photo, i) => (
              <View key={i} style={styles.photo}>
                <Image source={{ uri: photo }} resizeMode="cover" style={StyleSheet.absoluteFill} />
                <Pressable
                  accessibilityLabel={`Remove photo ${i + 1}`}
                  onPress={() => setPhotos((current) => current.filter((_, index) => index !== i))}
                  style={styles.removePhoto}>
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable accessibilityRole="button" onPress={addPhotos} style={[styles.photo, styles.addPhoto]}>
                <Ionicons name="camera-outline" size={24} color={c.primary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.primary }}>Add</Text>
              </Pressable>
            )}
          </View>
          <Text style={ui.hint}>Up to {MAX_PHOTOS} photos. Items with clear photos get more offers.</Text>
        </View>

        <Field label="Title" value={form.title} onChangeText={set('title')} placeholder="e.g. iPhone 14 Pro Max 256GB" maxLength={90} />
        <Choices label="Category" options={CATEGORIES} value={form.category} onChange={set('category')} />
        <Choices label="Condition" options={CONDITIONS} value={form.condition} onChange={set('condition')} />
        <Field
          label={`Estimated value (${CURRENCY})`}
          value={form.value}
          onChangeText={(text) => set('value')(digitsOnly(text).slice(0, 10))}
          keyboardType="number-pad"
          placeholder="What it is worth today"
          hint="Used to work out how much cash should be added to make a trade fair."
        />
        <Field
          label="What would you like in return?"
          value={form.wants}
          onChangeText={set('wants')}
          placeholder="e.g. iPhone 16 Pro Max, I can add cash"
          maxLength={300}
        />
        <Field
          label="Description"
          value={form.description}
          onChangeText={set('description')}
          placeholder="Age, accessories, anything a trader should know"
          multiline
          maxLength={3000}
        />
        <Field label="City" value={city ?? user.city} onChangeText={setCity} maxLength={60} />
        <Notice text={error} />
        <Button title="Post item" icon="checkmark" onPress={submit} loading={busy} />
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  photo: { width: 84, height: 84, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.border },
  addPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: c.primarySoft,
    borderWidth: 1,
    borderColor: c.primary,
    borderStyle: 'dashed',
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
