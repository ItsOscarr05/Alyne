import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../../theme';

interface PasswordRequirementsProps {
  password: string;
  isFocused?: boolean;
}

type PasswordStrength = 'weak' | 'medium' | 'strong';

const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) return 'weak';
  
  let score = 0;
  
  // Length scoring
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  
  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1; // lowercase
  if (/[A-Z]/.test(password)) score += 1; // uppercase
  if (/[0-9]/.test(password)) score += 1; // number
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1; // special
  
  // Determine strength
  if (score >= 5) return 'strong';
  if (score >= 3) return 'medium';
  return 'weak';
};

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password, isFocused = false }) => {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);
  
  // Animated width values for each section (0 to 1, representing percentage)
  const section1Width = useRef(new Animated.Value(0)).current;
  const section2Width = useRef(new Animated.Value(0)).current;
  const section3Width = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const [sectionWidth, setSectionWidth] = useState(100); // Default width

  useEffect(() => {
    // Animate container visibility
    Animated.timing(containerOpacity, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused, containerOpacity]);

  useEffect(() => {
    if (!isFocused) return;

    // Calculate target widths based on strength (0 to 1)
    // Only fill sections if password has content
    let target1 = 0;
    let target2 = 0;
    let target3 = 0;

    if (password.length > 0) {
      if (strength === 'weak') {
        target1 = 1; // Fill first section only
        target2 = 0;
        target3 = 0;
      } else if (strength === 'medium') {
        target1 = 1; // Fill first section
        target2 = 1; // Fill second section
        target3 = 0;
      } else if (strength === 'strong') {
        target1 = 1; // Fill all sections
        target2 = 1;
        target3 = 1;
      }
    }

    // Animate sections from left to right (fill) or right to left (empty)
    const animations = [
      Animated.timing(section1Width, {
        toValue: target1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(section2Width, {
        toValue: target2,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(section3Width, {
        toValue: target3,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: password.length > 0 ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ];

    Animated.parallel(animations).start();
  }, [strength, password, isFocused, section1Width, section2Width, section3Width, labelOpacity]);

  if (!isFocused) {
    return null;
  }

  // Get colors based on strength
  const getSection1Color = () => {
    if (strength === 'weak') return '#ef4444';
    if (strength === 'medium') return '#f59e0b';
    return '#10b981';
  };

  const getSection2Color = () => {
    if (strength === 'strong') return '#10b981';
    return '#f59e0b';
  };

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <View 
        style={styles.meterContainer}
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width;
          if (width > 0) {
            const calculatedWidth = (width - 8) / 3; // Account for 4px gap between sections
            setSectionWidth(calculatedWidth);
          }
        }}
      >
        <View style={[styles.section, styles.sectionBase]}>
          <Animated.View 
            style={[
              styles.sectionFill,
              { 
                width: section1Width.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, sectionWidth],
                }),
                backgroundColor: getSection1Color(),
              }
            ]} 
          />
        </View>
        <View style={[styles.section, styles.sectionBase]}>
          <Animated.View 
            style={[
              styles.sectionFill,
              { 
                width: section2Width.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, sectionWidth],
                }),
                backgroundColor: getSection2Color(),
              }
            ]} 
          />
        </View>
        <View style={[styles.section, styles.sectionBase]}>
          <Animated.View 
            style={[
              styles.sectionFill,
              { 
                width: section3Width.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, sectionWidth],
                }),
                backgroundColor: '#10b981',
              }
            ]} 
          />
        </View>
      </View>
      {password.length > 0 && (
        <Animated.Text style={[styles.strengthLabel, { opacity: labelOpacity }]}>
          {strength === 'weak' && 'Weak'}
          {strength === 'medium' && 'Medium'}
          {strength === 'strong' && 'Strong'}
        </Animated.Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.sm,
  },
  meterContainer: {
    flexDirection: 'row',
    gap: 4,
    height: 6,
    marginBottom: theme.spacing.xs,
  },
  section: {
    flex: 1,
    borderRadius: theme.radii.full,
    overflow: 'hidden',
  },
  sectionBase: {
    backgroundColor: theme.colors.neutral[200],
  },
  sectionFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: theme.radii.full,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.neutral[600],
    textTransform: 'capitalize',
  },
});
