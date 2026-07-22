import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ShieldCheck, PlusCircle, RefreshCw, Settings as SettingsIcon } from 'lucide-react-native';

// Associe chaque route de la Tab.Navigator à son icône
const ICONS = {
    Home: ShieldCheck,
    Add: PlusCircle,
    Sync: RefreshCw,
    Settings: SettingsIcon,
};

export default function GlassTabBar({ state, descriptors, navigation }) {
    const [barWidth, setBarWidth] = useState(0);
    const indicatorX = useRef(new Animated.Value(0)).current;

    const routeCount = state.routes.length;
    const itemWidth = barWidth / routeCount;

    useEffect(() => {
        if (barWidth === 0) return;
        Animated.spring(indicatorX, {
            toValue: state.index * itemWidth,
            useNativeDriver: true,
            damping: 16,
            mass: 0.9,
            stiffness: 180,
        }).start();
    }, [state.index, barWidth]);

    const handlePress = (route, isFocused) => {
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            Haptics.selectionAsync();
        }

        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
        }
    };

    return (
        <View style={styles.wrapper} pointerEvents="box-none">
            <BlurView
                intensity={65}
                tint="dark"
                BlurMethod="dimezisBlurView"
                style={styles.blur}
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            >
                {/* Léger voile pour garantir un contraste correct même là où le blur natif
            n'est pas supporté (ex: vieux Android) */}
                <View style={styles.glassOverlay} />

                {barWidth > 0 && (
                    <Animated.View
                        style={[
                            styles.indicator,
                            {
                                width: itemWidth - 16,
                                transform: [{ translateX: Animated.add(indicatorX, 8) }],
                            },
                        ]}
                    />
                )}

                <View style={styles.row}>
                    {state.routes.map((route, index) => {
                        const isFocused = state.index === index;
                        const IconComponent = ICONS[route.name] ?? ShieldCheck;

                        return (
                            <TouchableOpacity
                                key={route.key}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                onPress={() => handlePress(route, isFocused)}
                                style={styles.tabItem}
                                activeOpacity={0.7}
                            >
                                <IconComponent
                                    color={isFocused ? '#FFFFFF' : '#94A3B8'}
                                    size={isFocused ? 24 : 22}
                                    strokeWidth={isFocused ? 2.5 : 2}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    blur: {
        height: 65,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 15,
        elevation: 10,
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Platform.OS === 'android' ? 'rgba(15, 23, 42, 0.55)' : 'rgba(30, 41, 59, 0.25)',
    },
    indicator: {
        position: 'absolute',
        top: 8,
        left: 0,
        height: 49,
        borderRadius: 20,
        backgroundColor: 'rgba(99, 102, 241, 0.35)',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.5)',
    },
    row: {
        flex: 1,
        flexDirection: 'row',
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});