import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants';
import { recognizeText } from '../../services/ocr';

export default function CameraScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState('');
  const [loading, setLoading] = useState(false);

  const processImage = async (base64: string | undefined | null, uri: string) => {
    if (!base64) {
      Alert.alert('错误', '无法读取图片数据');
      return;
    }
    setImage(uri);
    setLoading(true);
    setOcrResult('');
    const result = await recognizeText(base64);
    setOcrResult(result.text);
    setLoading(false);
  };

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('需要相册权限', '请在设置中允许访问相册');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      processImage(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('需要相机权限', '请在设置中允许使用相机');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      processImage(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const handleConfirm = () => {
    if (ocrResult && !loading) {
      router.push({
        pathname: '/new-task/confirm',
        params: { title: ocrResult, source: 'photo' },
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>拍照识别</Text>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btn} onPress={handleTakePhoto}>
          <Text style={styles.btnIcon}>📸</Text>
          <Text style={styles.btnText}>拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handlePickImage}>
          <Text style={styles.btnIcon}>🖼️</Text>
          <Text style={styles.btnText}>相册</Text>
        </TouchableOpacity>
      </View>

      {image && (
        <Image source={{ uri: image }} style={styles.preview} />
      )}

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>正在识别...</Text>
        </View>
      )}

      {ocrResult && !loading ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{ocrResult}</Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>确认并设置时间</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20, paddingTop: 80 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 24 },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  btn: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 24,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  btnIcon: { fontSize: 36, marginBottom: 8 },
  btnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  preview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  loadingBox: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { fontSize: 14, color: COLORS.textLight, marginTop: 8 },
  resultBox: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20 },
  resultText: { fontSize: 16, color: COLORS.text, lineHeight: 24, marginBottom: 16 },
  confirmBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
