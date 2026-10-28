import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ArrowUpRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { authApi } from '@/api/authApi';
import { FocusedScreenTransition } from '@/components/screen-transition';
import { saveAuthSession } from '@/stores/persistedAuthSession';
import { getAuthAccessToken, getAuthUser } from '@/stores/authSession';
import { isAdminUser } from '@/utils/authRole';

function getErrorMessage(error: unknown) {
  const maybe = error as { response?: { data?: { message?: unknown; title?: unknown } }; message?: string };
  const message = maybe.response?.data?.message ?? maybe.response?.data?.title;
  return typeof message === 'string' ? message : maybe.message ?? 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
}

export default function AdminLoginScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (getAuthAccessToken() && isAdminUser(getAuthUser())) router.replace('/admin');
  }, []);

  async function handleSubmit() {
    if (!username.trim() || !password) {
      setError('Nhập tên đăng nhập và mật khẩu để tiếp tục.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const response = await authApi.login({ username: username.trim(), password });
      if (!isAdminUser(response.data.user)) {
        setError('Tài khoản này không có quyền quản trị.');
        return;
      }
      await saveAuthSession(response.data);
      router.replace('/admin');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <FocusedScreenTransition style={[styles.layout, desktop && styles.layoutDesktop]}>
        {desktop ? (
          <View style={styles.brandPanel}>
            <View style={styles.brandTop}>
              <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
              <Text style={styles.brandName}>SFM <Text style={styles.brandNameSoft}>/ CONTROL</Text></Text>
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.eyebrow}>ADMINISTRATION CONSOLE</Text>
              <Text style={styles.heroTitle}>Quản trị hệ thống{ '\n' }tài chính của bạn.</Text>
              <Text style={styles.heroDescription}>Một không gian tập trung để quản lý người dùng, dữ liệu và vận hành SFM.</Text>
            </View>
            <View style={styles.brandFooter}>
              <ShieldCheck size={17} color="#8bc9a9" />
              <Text style={styles.secureLabel}>Kết nối quản trị an toàn</Text>
              <Text style={styles.version}>WEB CONSOLE · 01</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.formPanel, !desktop && styles.formPanelMobile]}>
          {!desktop ? (
            <View style={styles.mobileBrand}>
              <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
              <Text style={styles.brandName}>SFM <Text style={styles.brandNameSoft}>/ ADMIN</Text></Text>
            </View>
          ) : null}
          <View style={styles.formHeader}>
            <View style={styles.formIcon}><LockKeyhole size={20} color="#8bc9a9" /></View>
            <Text style={styles.formKicker}>ADMIN ACCESS</Text>
            <Text style={styles.formTitle}>Chào mừng trở lại</Text>
            <Text style={styles.formDescription}>Đăng nhập bằng tài khoản quản trị SFM của bạn.</Text>
          </View>

          <View style={styles.fields}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tên đăng nhập</Text>
              <TextInput
                accessibilityLabel="Tên đăng nhập"
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
                onChangeText={setUsername}
                onSubmitEditing={handleSubmit}
                placeholder="Nhập tên đăng nhập"
                placeholderTextColor="#7f8987"
                returnKeyType="next"
                style={styles.input}
                value={username}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  accessibilityLabel="Mật khẩu"
                  autoComplete="current-password"
                  onChangeText={setPassword}
                  onSubmitEditing={handleSubmit}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#7f8987"
                  returnKeyType="go"
                  secureTextEntry={!showPassword}
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                />
                <Pressable accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
                  {showPassword ? <EyeOff size={18} color="#8d9995" /> : <Eye size={18} color="#8d9995" />}
                </Pressable>
              </View>
            </View>
          </View>

          {error ? <View accessibilityLiveRegion="polite" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
          <Pressable accessibilityRole="button" disabled={submitting} onPress={handleSubmit} style={({ pressed }) => [styles.submitButton, pressed && styles.submitPressed, submitting && styles.submitDisabled]}>
            {submitting ? <ActivityIndicator color="#10231a" /> : <><Text style={styles.submitText}>Đăng nhập quản trị</Text><ArrowUpRight size={18} color="#10231a" /></>}
          </Pressable>
          <Text style={styles.note}>Chỉ tài khoản có quyền Admin mới có thể truy cập console.</Text>
          <View style={styles.bottomRule} />
          <Text style={styles.copyright}>© SFM · ADMIN CONSOLE</Text>
        </View>
      </FocusedScreenTransition>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', backgroundColor: '#101713', flex: 1, justifyContent: 'center', overflow: 'hidden', padding: 24 },
  glowOne: { backgroundColor: '#18392c', borderRadius: 260, height: 520, opacity: 0.4, position: 'absolute', right: -150, top: -250, width: 520 },
  glowTwo: { backgroundColor: '#17221c', borderRadius: 220, bottom: -260, height: 440, left: -180, opacity: 0.8, position: 'absolute', width: 440 },
  layout: { backgroundColor: '#171e1a', borderColor: '#29332d', borderRadius: 22, borderWidth: 1, maxWidth: 510, overflow: 'hidden', width: '100%' },
  layoutDesktop: { flexDirection: 'row', maxWidth: 1000, minHeight: 590 },
  brandPanel: { backgroundColor: '#1d3026', justifyContent: 'space-between', padding: 42, width: '47%' },
  brandTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  brandMark: { alignItems: 'center', backgroundColor: '#8bc9a9', borderRadius: 11, height: 38, justifyContent: 'center', width: 38 },
  brandMarkText: { color: '#112219', fontSize: 22, fontWeight: '800' },
  brandName: { color: '#edf5ef', fontSize: 14, fontWeight: '700', letterSpacing: 2.4 },
  brandNameSoft: { color: '#90a69a', fontSize: 11, fontWeight: '500', letterSpacing: 1.6 },
  brandCopy: { marginVertical: 36 },
  eyebrow: { color: '#8bc9a9', fontSize: 10, fontWeight: '700', letterSpacing: 2.5, marginBottom: 20 },
  heroTitle: { color: '#f2f6f3', fontSize: 35, fontWeight: '600', lineHeight: 46 },
  heroDescription: { color: '#a8b7ad', fontSize: 14, lineHeight: 23, marginTop: 18, maxWidth: 310 },
  brandFooter: { alignItems: 'center', borderTopColor: '#35463b', borderTopWidth: 1, flexDirection: 'row', paddingTop: 20 },
  secureLabel: { color: '#bfd0c5', fontSize: 12, marginLeft: 8 },
  version: { color: '#798b7f', fontSize: 9, letterSpacing: 1.2, marginLeft: 'auto' },
  formPanel: { flex: 1, justifyContent: 'center', paddingHorizontal: 50, paddingVertical: 46 },
  formPanelMobile: { paddingHorizontal: 30, paddingVertical: 34 },
  mobileBrand: { alignItems: 'center', flexDirection: 'row', gap: 11, marginBottom: 48 },
  formHeader: { marginBottom: 32 },
  formIcon: { alignItems: 'center', backgroundColor: '#27372e', borderRadius: 11, height: 42, justifyContent: 'center', marginBottom: 20, width: 42 },
  formKicker: { color: '#8bc9a9', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  formTitle: { color: '#edf3ef', fontSize: 27, fontWeight: '600', marginTop: 9 },
  formDescription: { color: '#98a69d', fontSize: 13, lineHeight: 20, marginTop: 8 },
  fields: { gap: 20 },
  fieldGroup: { gap: 9 },
  label: { color: '#d3ddd6', fontSize: 12, fontWeight: '600' },
  input: { backgroundColor: '#111713', borderColor: '#303a33', borderRadius: 9, borderWidth: 1, color: '#edf3ef', fontSize: 13, minHeight: 48, outlineStyle: 'none', paddingHorizontal: 14 } as never,
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeButton: { alignItems: 'center', bottom: 0, justifyContent: 'center', position: 'absolute', right: 4, top: 0, width: 42 },
  errorBox: { backgroundColor: '#3a2221', borderColor: '#69413d', borderRadius: 8, borderWidth: 1, marginTop: 18, padding: 11 },
  errorText: { color: '#f1b8ae', fontSize: 12, lineHeight: 18 },
  submitButton: { alignItems: 'center', backgroundColor: '#8bc9a9', borderRadius: 9, flexDirection: 'row', gap: 9, justifyContent: 'center', marginTop: 24, minHeight: 49 },
  submitPressed: { backgroundColor: '#a1d8bb' },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#10231a', fontSize: 13, fontWeight: '700' },
  note: { color: '#85938a', fontSize: 11, lineHeight: 17, marginTop: 16, textAlign: 'center' },
  bottomRule: { backgroundColor: '#2c352f', height: 1, marginTop: 30 },
  copyright: { color: '#69776e', fontSize: 9, letterSpacing: 1.4, marginTop: 17, textAlign: 'center' },
});
