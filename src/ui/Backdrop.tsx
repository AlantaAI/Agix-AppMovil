import { StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { colors } from './theme';

/** Fondo de la app: el degradado azul de la web con su trama de puntos. */
export function Backdrop({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.fill, style]} {...rest}>
      <LinearGradient
        colors={[colors.bgTop, colors.bgMid, colors.bgMid2, colors.bgBottom]}
        locations={[0, 0.38, 0.68, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="dots" width={14} height={14} patternUnits="userSpaceOnUse">
              <Circle cx={7} cy={7} r={1.4} fill="rgba(255,255,255,0.15)" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dots)" />
        </Svg>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: colors.bgMid } });
