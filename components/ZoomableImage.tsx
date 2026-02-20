import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_IMAGE_WIDTH = SCREEN_WIDTH - 80;
const DEFAULT_IMAGE_HEIGHT = 400;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

interface ZoomableImageProps {
  uri: string;
  width?: number;
  height?: number;
  containerStyle?: object;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function ZoomableImage({
  uri,
  width = DEFAULT_IMAGE_WIDTH,
  height = DEFAULT_IMAGE_HEIGHT,
  containerStyle,
}: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      // Clamp translation to new scale bounds
      const maxTx = (width * (scale.value - 1)) / 2;
      const maxTy = (height * (scale.value - 1)) / 2;
      translateX.value = clamp(translateX.value, -maxTx, maxTx);
      translateY.value = clamp(translateY.value, -maxTy, maxTy);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      const maxTx = (width * (scale.value - 1)) / 2;
      const maxTy = (height * (scale.value - 1)) / 2;
      translateX.value = clamp(translateX.value, -maxTx, maxTx);
      translateY.value = clamp(translateY.value, -maxTy, maxTy);
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const maxTx = (width * (scale.value - 1)) / 2;
      const maxTy = (height * (scale.value - 1)) / 2;
      translateX.value = clamp(
        savedTranslateX.value + e.translationX,
        -maxTx,
        maxTx
      );
      translateY.value = clamp(
        savedTranslateY.value + e.translationY,
        -maxTy,
        maxTy
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.container, containerStyle, { width, height }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.wrapper, { width, height }]}>
          <AnimatedImage
            source={{ uri }}
            style={[
              styles.image,
              {
                width,
                height,
              },
              animatedStyle,
            ]}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderRadius: 8,
  },
});
