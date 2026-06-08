import { View } from 'react-native';

// 16x16 pixel art face (0 = white background, 1 = black pixel)
const FACE_GRID: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0],
  [0,1,1,0,0,1,1,1,1,0,0,1,1,0,0,0],
  [0,1,0,0,1,1,1,1,1,1,0,0,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,1,0,0,1,1,1,1,1,1,0,0,1,0,0,0],
  [0,1,1,0,0,1,1,1,1,0,0,1,1,0,0,0],
  [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

export default function PixelAvatar({ size = 28 }: { size?: number }) {
  const pixelSize = size / 16;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap' }}>
      {FACE_GRID.flatMap((row, ri) =>
        row.map((pixel, ci) => (
          <View key={`${ri}-${ci}`} style={{ width: pixelSize, height: pixelSize, backgroundColor: pixel ? '#000' : '#FFF' }} />
        ))
      )}
    </View>
  );
}
