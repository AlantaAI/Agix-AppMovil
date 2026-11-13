import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/data/AuthProvider';
import { useWorkspace } from '@/data/WorkspaceProvider';
import type { ProfilePatch } from '@/data/types';
import { doneStatusId, projectStatuses } from '@/domain/board';
import { displayName } from '@/domain/people';
import { formatDuration, relativeTime, userSecondsSince } from '@/domain/time';
import { useNow } from '@/hooks/useNow';
import { WEB_URL } from '@/lib/env';
import { AppHeader } from '@/ui/AppHeader';
import { Avatar } from '@/ui/Avatar';
import { Backdrop } from '@/ui/Backdrop';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { Pill } from '@/ui/Pill';
import { Text } from '@/ui/Text';
import { colors } from '@/ui/theme';
import { useToast } from '@/ui/Toast';
import { confirm } from '@/ui/confirm';
import { success } from '@/ui/haptics';

const WEEK_MS = 7 * 24 * 3600 * 1000;

export default function ProfileScreen() {
  const { email, demo, signOut } = useAuth();
  const { snapshot, updateProfile, offline } = useWorkspace();
  const toast = useToast();
  const me = snapshot ? snapshot.people[snapshot.userId] : undefined;
  // Lo que se edita es un borrador; mientras no se toque, el formulario muestra el perfil guardado.
  const [draft, setDraft] = useState<ProfilePatch | null>(null);
  const saved: ProfilePatch = { name: me?.name ?? '', nickname: me?.nickname ?? '', phone: me?.phone ?? '' };
  const { name, nickname, phone } = draft ?? saved;
  const edit = (patch: Partial<ProfilePatch>) => setDraft({ name, nickname, phone, ...patch });
  const [saving, setSaving] = useState(false);

  const dirty = name !== saved.name || nickname !== saved.nickname || phone !== saved.phone;
  const now = useNow(true, 60_000);
  const week = snapshot ? userSecondsSince(snapshot.sessions, snapshot.userId, now - WEEK_MS, now) : 0;
  const finished = snapshot
    ? snapshot.tasks.filter(t => {
        const assigned = snapshot.assignments.some(a => a.taskId === t.id && a.userId === snapshot.userId);
        return assigned && t.statusId === doneStatusId(projectStatuses(snapshot.statuses, t.projectId));
      }).length
    : 0;

  const save = async () => {
    if (!name.trim()) {
      toast('El nombre no puede quedar vacío.', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name, nickname, phone });
      setDraft(null);
      success();
      toast('Perfil actualizado', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    const ok = await confirm(
      demo ? '¿Salir de la demostración?' : '¿Cerrar sesión?',
      demo ? 'Se borrarán los datos de ejemplo de este dispositivo.' : 'Tendrás que volver a entrar con tu correo y contraseña.',
      demo ? 'Salir' : 'Cerrar sesión',
      true,
    );
    if (ok) await signOut();
  };

  return (
    <Backdrop>
      <AppHeader title="Perfil" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card raised style={styles.hero}>
            <Avatar id={snapshot?.userId ?? 'yo'} person={me} size={76} />
            <Text variant="title" align="center">{displayName(me, email ?? 'Tu cuenta')}</Text>
            <Text variant="caption" color={colors.textMuted}>{me?.email || email}</Text>
            {demo && <Pill label="Modo demostración" tone="gold" />}
          </Card>

          <View style={styles.stats}>
            <StatCard icon="clock" value={formatDuration(week)} label="registrado en 7 días" />
            <StatCard icon="check-circle" value={String(finished)} label="tareas tuyas terminadas" />
            <StatCard icon="folder" value={String(snapshot?.projects.length ?? 0)} label="proyectos" />
          </View>

          <Card style={styles.gap}>
            <Text variant="heading">Tus datos</Text>
            <Field label="Nombre" value={name} onChangeText={v => edit({ name: v })} placeholder="Cómo te ve el equipo" autoCapitalize="words" />
            <Field label="Apodo (opcional)" value={nickname} onChangeText={v => edit({ nickname: v })} placeholder="Si prefieres que te llamen así" />
            <Field label="Teléfono (opcional)" value={phone} onChangeText={v => edit({ phone: v })} placeholder="+51 999 999 999" keyboardType="phone-pad" />
            <Button label="Guardar cambios" icon="save" full disabled={!dirty || offline} loading={saving} onPress={() => void save()} />
            {offline && <Text variant="caption" color={colors.gold}>Necesitas conexión para guardar.</Text>}
          </Card>

          <Card style={styles.gap}>
            <Text variant="heading">Agix en la web</Text>
            <Text variant="caption" color={colors.textMuted}>
              Crear proyectos con IA, el cronograma, los informes y la configuración del equipo siguen en la web.
            </Text>
            <Button label="Abrir Agix web" icon="external-link" variant="outline" full onPress={() => void WebBrowser.openBrowserAsync(WEB_URL)} />
          </Card>

          <Button label={demo ? 'Salir de la demostración' : 'Cerrar sesión'} icon="log-out" variant="danger" full onPress={() => void logout()} />

          <View style={styles.footer}>
            <Feather name="refresh-cw" size={13} color={colors.onBgMuted} />
            <Text variant="caption" color={colors.onBgMuted}>
              {snapshot ? `Sincronizado ${relativeTime(snapshot.fetchedAt, now)}` : 'Sin sincronizar'} · Agix móvil v{Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

function StatCard({ icon, value, label }: { icon: 'clock' | 'check-circle' | 'folder'; value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <Feather name={icon} size={18} color={colors.accent} />
      <Text variant="heading" weight="black">{value}</Text>
      <Text variant="caption" color={colors.textMuted} style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 22 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 4, padding: 12 },
  statLabel: { fontSize: 12, lineHeight: 15 },
  gap: { gap: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
