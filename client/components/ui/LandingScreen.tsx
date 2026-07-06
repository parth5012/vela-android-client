import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME_COLORS, ACCENT_COLORS } from '../../utils/theme';

const QUOTES = [
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Science is organized knowledge. Wisdom is organized life.", author: "Immanuel Kant" },
  { text: "The important thing is not to stop questioning.", author: "Albert Einstein" },
  { text: "Research is creating new knowledge.", author: "Neil Armstrong" },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
  { text: "Data! Data! Data! I can't make bricks without clay.", author: "Arthur Conan Doyle" },
  { text: "Knowledge has to be improved, challenged, and increased constantly.", author: "Peter Drucker" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent Van Gogh" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" }
];

interface LandingScreenProps {
  userName: string;
  theme: 'deep' | 'slate' | 'cyberpunk';
  accentColor: 'indigo' | 'emerald' | 'rose' | 'amber';
  onFinished: () => void;
}

export default function LandingScreen({ userName, theme, accentColor, onFinished }: LandingScreenProps) {
  const colors = THEME_COLORS[theme] || THEME_COLORS.deep;
  const accentHex = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;

  const [quote, setQuote] = useState(QUOTES[0]);
  const [greeting, setGreeting] = useState("Hello");

  // Animations
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const greetingFade = useRef(new Animated.Value(0)).current;
  const quoteFade = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Select random quote
    const randomIdx = Math.floor(Math.random() * QUOTES.length);
    setQuote(QUOTES[randomIdx]);

    // Choose greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 17) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }

    // Sequence the animations
    Animated.sequence([
      // Fade in Logo
      Animated.timing(logoFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Fade in Personalized greeting
      Animated.timing(greetingFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Fade in Quote
      Animated.timing(quoteFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate progress bar loader (2.2 seconds)
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: false,
    }).start();

    // Trigger exit animation after progress loader finishes
    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinished();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [logoFade, greetingFade, quoteFade, progressWidth, containerOpacity, onFinished]);

  return (
    <Animated.View style={[styles.mainContainer, { opacity: containerOpacity, backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Abstract Glowing Accent Orbs in Background */}
        <View style={styles.glowContainer} pointerEvents="none">
          <LinearGradient
            colors={[accentHex + '18', 'transparent']}
            style={styles.glowOrbTop}
          />
          <LinearGradient
            colors={[accentHex + '12', 'transparent']}
            style={styles.glowOrbBottom}
          />
        </View>

        <View style={styles.contentContainer}>
          {/* VELA Logo with slide up animation */}
          <Animated.View style={[styles.logoSection, { opacity: logoFade, transform: [{ translateY: logoFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <Text style={[styles.logoText, { color: accentHex }]}>VELA</Text>
            <View style={[styles.nodeIndicator, { borderColor: colors.border }]}>
              <View style={[styles.onlineDot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.nodeLabel, { color: colors.textDark }]}>SECURE LOCAL NODE</Text>
            </View>
          </Animated.View>

          {/* Greeting */}
          <Animated.View style={[styles.greetingSection, { opacity: greetingFade }]}>
            <Text style={[styles.greetingText, { color: colors.text }]}>
              {greeting}, <Text style={{ color: accentHex, fontWeight: '800' }}>{userName}</Text>
            </Text>
            <Text style={[styles.subGreetingText, { color: colors.textMuted }]}>
              Syncing experience logs and pipelines...
            </Text>
          </Animated.View>

          {/* Quote Card (Glassmorphism design) */}
          <Animated.View style={[
            styles.quoteCard, 
            { 
              opacity: quoteFade, 
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale: quoteFade.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }]
            }
          ]}>
            <Text style={[styles.quoteSymbol, { color: colors.border }]}>“</Text>
            <Text style={[styles.quoteText, { color: colors.text }]}>{quote.text}</Text>
            <Text style={[styles.quoteAuthor, { color: colors.textMuted }]}>— {quote.author}</Text>

            {/* Custom glowing progress indicator at the bottom of the card */}
            <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: accentHex, 
                    width: progressWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]} 
              />
            </View>
          </Animated.View>

        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -200,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 450,
    height: 450,
    borderRadius: 225,
  },
  contentContainer: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: 10,
  },
  nodeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  nodeLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  greetingSection: {
    alignItems: 'center',
    marginBottom: 35,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  subGreetingText: {
    fontSize: 12,
    textAlign: 'center',
  },
  quoteCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteSymbol: {
    fontSize: 60,
    fontWeight: 'bold',
    position: 'absolute',
    top: -10,
    left: 16,
    fontFamily: 'serif',
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '400',
  },
  quoteAuthor: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
