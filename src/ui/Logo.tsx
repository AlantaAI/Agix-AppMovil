import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { fonts } from './theme';

/** Solo el ícono: la placa con la «A», idéntica a la de la web. */
export function AgixMark({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Agix">
      <Rect x={5} y={9} width={54} height={52} rx={15} fill="#10205e" />
      <Rect x={5} y={5} width={54} height={52} rx={15} fill="#ffffff" stroke="#1b3bd6" strokeWidth={3} />
      <Path d="M19 46 L32 16 L45 46" fill="none" stroke="#1b3bd6" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M25 36 L39 36" fill="none" stroke="#ff2e8b" strokeWidth={8} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Letras del nombre, como en la landing: cada una con su color, tamaño, giro y
 * borde blanco, y la sombra dura azul marino del conjunto. `w` es el ancho de
 * avance aproximado de la letra en Nunito Black (en em de su propio tamaño).
 */
const LETTERS = [
  { ch: 'A', size: 1.28, color: '#1B3BD6', stroke: 0.2, rotate: -6, dy: 0, mr: -0.03, w: 0.72 },
  { ch: 'g', size: 0.92, color: '#FF2E8B', stroke: 0.22, rotate: 6, dy: 0.14, mr: -0.02, w: 0.62 },
  { ch: 'i', size: 1.06, color: '#10205E', stroke: 0.2, rotate: -4, dy: -0.04, mr: -0.02, w: 0.3 },
  { ch: 'x', size: 0.98, color: '#1B3BD6', stroke: 0.21, rotate: 9, dy: 0.03, mr: 0, w: 0.6 },
] as const;

/** Nombre estampado. Con `animated`, las letras caen una tras otra (como la intro de la web). */
export function AgixWordmark({ fontSize = 28, animated = false }: { fontSize?: number; animated?: boolean }) {
  const F = fontSize;
  const pad = 0.32 * F;
  const height = 1.75 * F;
  const baseline = 1.3 * F;
  // Posición de cada letra: la anterior más su avance (y su margen, a veces negativo).
  const lefts = LETTERS.reduce<number[]>((acc, l, i) => [...acc, acc[i] + l.w * l.size * F + l.mr * F], [pad]);
  const placed = LETTERS.map((l, i) => ({ ...l, x: lefts[i] }));
  const width = lefts[LETTERS.length] + pad;

  const anims = useState(() => LETTERS.map(() => new Animated.Value(animated ? 0 : 1)))[0];
  useEffect(() => {
    if (!animated) return;
    Animated.stagger(
      110,
      anims.map(a => Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 13 })),
    ).start();
    // La caída se ve una sola vez, al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ width, height }} accessibilityRole="image" accessibilityLabel="Agix">
      {placed.map((l, i) => {
        const s = l.size * F;
        const glyphW = l.w * s;
        const cx = pad + glyphW / 2;
        const cy = baseline - s * 0.35;
        const box = glyphW + pad * 2;
        const strokeW = l.stroke * s;
        const shadowDx = 0.04 * F;
        const shadowDy = 0.06 * F;
        const letterProps = { fontFamily: fonts.black, fontWeight: '900' as const, fontSize: s, x: pad, y: baseline + l.dy * s };
        const rotate = `rotate(${l.rotate} ${cx} ${cy})`;
        return (
          <Animated.View
            key={l.ch}
            style={{
              position: 'absolute',
              left: l.x - pad,
              top: 0,
              opacity: anims[i].interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
              transform: [
                { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [-F * 1.4, 0] }) },
                { scale: anims[i].interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] }) },
              ],
            }}
          >
            <Svg width={box} height={height}>
              <G transform={`translate(${shadowDx} ${shadowDy}) ${rotate}`}>
                <SvgText {...letterProps} fill="#10205E" stroke="#10205E" strokeWidth={strokeW} strokeLinejoin="round">{l.ch}</SvgText>
              </G>
              <G transform={rotate}>
                <SvgText {...letterProps} fill="#ffffff" stroke="#ffffff" strokeWidth={strokeW} strokeLinejoin="round">{l.ch}</SvgText>
                <SvgText {...letterProps} fill={l.color}>{l.ch}</SvgText>
              </G>
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Cargador con el logo: la «A» y su barra se dibujan en bucle (como `.agix-loader-*` en la web). */
export function LogoLoader({ size = 64 }: { size?: number }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  const aOffset = t.interpolate({ inputRange: [0, 0.45, 0.75, 1], outputRange: [100, 0, 0, -100] });
  const barOffset = t.interpolate({ inputRange: [0, 0.35, 0.55, 0.75, 1], outputRange: [100, 100, 0, 0, -100] });
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Cargando">
      <Rect x={5} y={9} width={54} height={52} rx={15} fill="#10205e" />
      <Rect x={5} y={5} width={54} height={52} rx={15} fill="#ffffff" stroke="#1b3bd6" strokeWidth={3} />
      <AnimatedPath
        d="M19 46 L32 16 L45 46" fill="none" stroke="#1b3bd6" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={[100, 100]} strokeDashoffset={aOffset}
      />
      <AnimatedPath
        d="M25 36 L39 36" fill="none" stroke="#ff2e8b" strokeWidth={8} strokeLinecap="round"
        strokeDasharray={[100, 100]} strokeDashoffset={barOffset}
      />
    </Svg>
  );
}
