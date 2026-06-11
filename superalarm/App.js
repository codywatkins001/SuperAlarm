/**
 * SuperAlarm — Complete App
 * 
 * Screens (switched via state — no routing libraries needed):
 *   'home'      — alarm list + add button
 *   'addAlarm'  — create / edit a single alarm
 *   'settings'  — global app settings
 *   'math'      — math challenge to dismiss alarm
 *   'ringing'   — alarm is firing
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Switch,
  ScrollView, StyleSheet, SafeAreaView, StatusBar,
  FlatList, Modal, Keyboard, TouchableWithoutFeedback,
  Animated, Easing, Alert, AppRegistry,
} from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SOUNDS = ['Rooster'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Nightmare'];
const SNOOZE_OPTS = ['5 min', '10 min', '15 min', 'Off'];
const THEMES = ['Cyber Blue', 'Deep Purple', 'Midnight Green'];

const THEME_COLORS = {
  'Cyber Blue':      { accent: '#00e5ff', accentDim: 'rgba(0,229,255,0.25)', bg: '#0a0a1a', card: '#12122a', border: 'rgba(0,229,255,0.2)', text: '#e0f7ff', sub: '#4a6072' },
  'Deep Purple':     { accent: '#c084fc', accentDim: 'rgba(192,132,252,0.25)', bg: '#0d0a1a', card: '#1a122a', border: 'rgba(192,132,252,0.2)', text: '#f0e6ff', sub: '#6b5080' },
  'Midnight Green':  { accent: '#34d399', accentDim: 'rgba(52,211,153,0.25)', bg: '#0a1a13', card: '#0f2a1d', border: 'rgba(52,211,153,0.2)', text: '#d1fae5', sub: '#3d6b56' },
};

// ─── Math Challenge Generator ─────────────────────────────────────────────────

function generateMath(difficulty) {
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  switch (difficulty) {
    case 'Easy': {
      const a = rand(1, 10), b = rand(1, 10);
      return { question: `${a} + ${b} = ?`, answer: a + b };
    }
    case 'Medium': {
      const a = rand(10, 50), b = rand(10, 50);
      return { question: `${a} + ${b} = ?`, answer: a + b };
    }
    case 'Hard': {
      const a = rand(10, 30), b = rand(10, 30), c = rand(2, 9);
      return { question: `${a} × ${c} − ${b} = ?`, answer: a * c - b };
    }
    case 'Nightmare': {
      const a = rand(5, 15), b = rand(5, 15), c = rand(5, 15);
      return { question: `${a}² + ${b} × ${c} = ?`, answer: a * a + b * c };
    }
    default:
      return { question: '2 + 2 = ?', answer: 4 };
  }
}

// ─── Unique ID helper ─────────────────────────────────────────────────────────
let _id = 1;
const uid = () => String(_id++);

// ─── Default alarm template ───────────────────────────────────────────────────
const newAlarm = () => ({
  id: uid(),
  hours: '06',
  minutes: '00',
  period: 'AM',
  label: '',
  days: [],          // [] means one-time; ['Mon','Tue'...] means repeat
  enabled: true,
  snoozed: false,
});

// ─── Default settings ─────────────────────────────────────────────────────────
const defaultSettings = {
  flashingLights: true,
  vibration: true,
  sound: 'Rooster',
  mathDifficulty: 'Medium',
  snoozeDuration: 'Off',
  theme: 'Cyber Blue',
};

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN: HOME (alarm list)
// ═════════════════════════════════════════════════════════════════════════════

function HomeScreen({ alarms, settings, onAdd, onEdit, onToggle, onDelete, onSettings, onSimulateRing }) {
  const C = THEME_COLORS[settings.theme];

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyIcon, { color: C.accentDim }]}>⏰</Text>
      <Text style={[styles.emptyTitle, { color: C.text }]}>No Alarms Yet</Text>
      <Text style={[styles.emptySub, { color: C.sub }]}>Tap the + button to add your first alarm</Text>
    </View>
  );

  const AlarmCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.alarmCard, { backgroundColor: C.card, borderColor: item.enabled ? C.accentDim : C.border }]}
      onPress={() => onEdit(item)}
      activeOpacity={0.8}
    >
      <View style={styles.alarmCardLeft}>
        {/* Time display */}
        <Text style={[styles.alarmTime, { color: item.enabled ? C.accent : C.sub }]}>
          {item.hours}:{item.minutes}
          <Text style={[styles.alarmPeriod, { color: C.sub }]}> {item.period}</Text>
        </Text>
        {/* Label */}
        {item.label ? (
          <Text style={[styles.alarmLabel, { color: C.text }]}>{item.label}</Text>
        ) : null}
        {/* Repeat days or one-time */}
        <Text style={[styles.alarmDays, { color: C.sub }]}>
          {item.days.length === 0
            ? 'One-time alarm'
            : item.days.length === 7
            ? 'Every day'
            : item.days.join('  ·  ')}
        </Text>
      </View>
      <View style={styles.alarmCardRight}>
        <Switch
          value={item.enabled}
          onValueChange={() => onToggle(item.id)}
          trackColor={{ false: '#1a1a2e', true: C.accent }}
          thumbColor={item.enabled ? C.bg : '#4a6072'}
        />
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Delete Alarm', `Delete "${item.label || item.hours + ':' + item.minutes}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
            ]);
          }}
          style={[styles.deleteBtn, { borderColor: C.border }]}
        >
          <Text style={{ color: '#ff6b6b', fontSize: 14 }}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.homeHeader}>
        <View>
          <Text style={[styles.homeEyebrow, { color: C.sub }]}>welcome to</Text>
          <Text style={[styles.homeTitle, { color: C.accent }]}>SUPER ALARM</Text>
        </View>
        <TouchableOpacity onPress={onSettings} style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: C.accent, opacity: 0.4 }]} />

      {/* Alarm count badge */}
      {alarms.length > 0 && (
        <Text style={[styles.alarmCount, { color: C.sub }]}>
          {alarms.filter(a => a.enabled).length} of {alarms.length} active
        </Text>
      )}

      {/* Alarm list */}
      <FlatList
        data={alarms}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AlarmCard item={item} />}
        contentContainerStyle={[styles.listContent, alarms.length === 0 && { flex: 1 }]}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom bar: simulate ring (dev helper) + add button */}
      <View style={[styles.fab, { backgroundColor: C.accent }]}>
        <TouchableOpacity onPress={onAdd} style={styles.fabInner}>
          <Text style={[styles.fabText, { color: C.bg }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Dev helper — tap to simulate ring */}
      <TouchableOpacity onPress={onSimulateRing} style={[styles.devBtn, { borderColor: C.border }]}>
        <Text style={[styles.devBtnText, { color: C.sub }]}>⏰ Test Ring</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN: ADD / EDIT ALARM
// ═════════════════════════════════════════════════════════════════════════════

function AddAlarmScreen({ alarm, settings, onSave, onCancel }) {
  const C = THEME_COLORS[settings.theme];
  const [hours, setHours] = useState(alarm.hours);
  const [minutes, setMinutes] = useState(alarm.minutes);
  const [period, setPeriod] = useState(alarm.period);
  const [label, setLabel] = useState(alarm.label);
  const [days, setDays] = useState(alarm.days);

  const toggleDay = (day) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSave = () => {
    const h = Math.min(12, Math.max(1, parseInt(hours) || 12));
    const m = Math.min(59, Math.max(0, parseInt(minutes) || 0));
    onSave({ ...alarm, hours: String(h).padStart(2, '0'), minutes: String(m).padStart(2, '0'), period, label, days });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={onCancel} style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.backArrow, { color: C.accent }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.subTitle, { color: C.text }]}>{alarm.label ? 'Edit Alarm' : 'New Alarm'}</Text>
          <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: C.accent }]}>
            <Text style={[styles.saveBtnText, { color: C.bg }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.px}>

            {/* ── Time Picker ── */}
            <Text style={[styles.sectionLabel, { color: C.sub }]}>Set Time</Text>
            <View style={[styles.timePicker, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.timeRow}>
                <View style={[styles.timeBox, { backgroundColor: C.bg, borderColor: C.accentDim }]}>
                  <TextInput
                    style={[styles.timeInput, { color: C.accent }]}
                    value={hours}
                    onChangeText={v => setHours(v.replace(/[^0-9]/g, '').slice(0, 2))}
                    onBlur={() => setHours(String(Math.min(12, Math.max(1, parseInt(hours) || 12))).padStart(2, '0'))}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={[styles.timeBoxLabel, { color: C.sub }]}>HH</Text>
                </View>
                <Text style={[styles.colon, { color: C.accent }]}>:</Text>
                <View style={[styles.timeBox, { backgroundColor: C.bg, borderColor: C.accentDim }]}>
                  <TextInput
                    style={[styles.timeInput, { color: C.accent }]}
                    value={minutes}
                    onChangeText={v => setMinutes(v.replace(/[^0-9]/g, '').slice(0, 2))}
                    onBlur={() => setMinutes(String(Math.min(59, Math.max(0, parseInt(minutes) || 0))).padStart(2, '0'))}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={[styles.timeBoxLabel, { color: C.sub }]}>MM</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPeriod(p => p === 'AM' ? 'PM' : 'AM')}
                  style={[styles.periodBtn, { backgroundColor: C.accent }]}
                >
                  <Text style={[styles.periodText, { color: C.bg }]}>{period}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Label ── */}
            <Text style={[styles.sectionLabel, { color: C.sub }]}>Label (optional)</Text>
            <View style={[styles.inputWrap, { backgroundColor: C.card, borderColor: C.border }]}>
              <TextInput
                style={[styles.labelInput, { color: C.text }]}
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Work, Gym, Medicine..."
                placeholderTextColor={C.sub}
                maxLength={30}
              />
            </View>

            {/* ── Repeat Days ── */}
            <Text style={[styles.sectionLabel, { color: C.sub }]}>Repeat</Text>
            <View style={[styles.daysRow, { backgroundColor: C.card, borderColor: C.border }]}>
              {DAYS.map(day => {
                const active = days.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleDay(day)}
                    style={[styles.dayChip, { borderColor: active ? C.accent : C.border, backgroundColor: active ? C.accent : 'transparent' }]}
                  >
                    <Text style={[styles.dayChipText, { color: active ? C.bg : C.sub }]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.hintText, { color: C.sub }]}>
              {days.length === 0 ? 'No days selected — alarm fires once then disables' : `Repeats every: ${days.join(', ')}`}
            </Text>

          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN: SETTINGS
// ═════════════════════════════════════════════════════════════════════════════

function SettingsScreen({ settings, onSave, onBack }) {
  const [s, setS] = useState(settings);
  const C = THEME_COLORS[s.theme];

  const update = (key, val) => setS(prev => ({ ...prev, [key]: val }));

  const Chips = ({ options, selected, onSelect }) => (
    <View style={styles.chipRow}>
      {options.map(opt => {
        const active = opt === selected;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            style={[styles.chip, { borderColor: active ? C.accent : C.border, backgroundColor: active ? C.accent : 'transparent' }]}
          >
            <Text style={[styles.chipText, { color: active ? C.bg : C.sub }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const Row = ({ icon, label, sub, children }) => (
    <View style={[styles.settingCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.settingCardLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingLabel, { color: C.text }]}>{label}</Text>
          {sub ? <Text style={[styles.settingSub, { color: C.sub }]}>{sub}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.px}>
          {/* Header */}
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={onBack} style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.backArrow, { color: C.accent }]}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.subTitle, { color: C.text }]}>Settings</Text>
            <TouchableOpacity onPress={() => onSave(s)} style={[styles.saveBtn, { backgroundColor: C.accent }]}>
              <Text style={[styles.saveBtnText, { color: C.bg }]}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* ── Alarm Behaviour ── */}
          <Text style={[styles.sectionLabel, { color: C.sub }]}>Alarm Behaviour</Text>

          <Row icon="💡" label="Flashing Lights" sub="Screen flashes when alarm fires">
            <Switch value={s.flashingLights} onValueChange={v => update('flashingLights', v)}
              trackColor={{ false: '#1a1a2e', true: C.accent }} thumbColor={s.flashingLights ? C.bg : '#4a6072'} />
          </Row>

          <Row icon="📳" label="Vibration" sub="Vibrate when alarm triggers">
            <Switch value={s.vibration} onValueChange={v => update('vibration', v)}
              trackColor={{ false: '#1a1a2e', true: C.accent }} thumbColor={s.vibration ? C.bg : '#4a6072'} />
          </Row>

          {/* ── Sound ── */}
          <Text style={[styles.sectionLabel, { color: C.sub }]}>Sound</Text>
          <View style={[styles.settingCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={styles.settingIcon}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text }]}>Alarm Sound</Text>
              <Chips options={SOUNDS} selected={s.sound} onSelect={v => update('sound', v)} />
            </View>
          </View>

          {/* ── Wake-Up Challenge ── */}
          <Text style={[styles.sectionLabel, { color: C.sub }]}>Wake-Up Challenge</Text>
          <View style={[styles.settingCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={styles.settingIcon}>🧮</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text }]}>Math Difficulty</Text>
              <Text style={[styles.settingSub, { color: C.sub }]}>Solve a math problem to dismiss the alarm</Text>
              <Chips options={DIFFICULTIES} selected={s.mathDifficulty} onSelect={v => update('mathDifficulty', v)} />
            </View>
          </View>

          {/* ── Snooze ── */}
          <Text style={[styles.sectionLabel, { color: C.sub }]}>Snooze</Text>
          <View style={[styles.settingCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={styles.settingIcon}>💤</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text }]}>Snooze Duration</Text>
              <Chips options={SNOOZE_OPTS} selected={s.snoozeDuration} onSelect={v => update('snoozeDuration', v)} />
            </View>
          </View>

          {/* ── Theme ── */}
          <Text style={[styles.sectionLabel, { color: C.sub }]}>Theme</Text>
          <View style={[styles.settingCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={styles.settingIcon}>🎨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text }]}>Color Theme</Text>
              <Chips options={THEMES} selected={s.theme} onSelect={v => update('theme', v)} />
            </View>
          </View>

          {/* ── About ── */}
          <Text style={[styles.sectionLabel, { color: C.sub }]}>About</Text>
          <View style={[styles.settingCard, { backgroundColor: C.card, borderColor: C.border, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[styles.settingLabel, { color: C.text }]}>SuperAlarm</Text>
            <Text style={[styles.settingSub, { color: C.sub }]}>Version 1.0.0  •  Built with Expo SDK 54</Text>
            <Text style={[styles.settingSub, { color: C.sub, marginTop: 6 }]}>
              Wake up smarter — solve a math problem to dismiss your alarm!
            </Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN: ALARM RINGING
// ═════════════════════════════════════════════════════════════════════════════

function RingingScreen({ alarm, settings, onSnooze, onChallenge }) {
  const C = THEME_COLORS[settings.theme];
  const pulse = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation on the time
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Flashing lights
    if (settings.flashingLights) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  const flashOpacity = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] });

  return (
    <SafeAreaView style={[styles.container, styles.ringingContainer, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Flash overlay */}
      {settings.flashingLights && (
        <Animated.View style={[styles.flashOverlay, { backgroundColor: C.accent, opacity: flashOpacity }]} />
      )}

      <Text style={[styles.ringingEyebrow, { color: C.sub }]}>⏰  ALARM</Text>

      <Animated.Text style={[styles.ringingTime, { color: C.accent, transform: [{ scale: pulse }] }]}>
        {alarm.hours}:{alarm.minutes} {alarm.period}
      </Animated.Text>

      {alarm.label ? (
        <Text style={[styles.ringingLabel, { color: C.text }]}>{alarm.label}</Text>
      ) : null}

      <Text style={[styles.ringingHint, { color: C.sub }]}>Solve a math problem to dismiss</Text>

      <TouchableOpacity
        onPress={onChallenge}
        style={[styles.dismissBtn, { backgroundColor: C.accent }]}
        activeOpacity={0.85}
      >
        <Text style={[styles.dismissBtnText, { color: C.bg }]}>🧮  Dismiss</Text>
      </TouchableOpacity>

      {settings.snoozeDuration !== 'Off' && (
        <TouchableOpacity
          onPress={onSnooze}
          style={[styles.snoozeBtn, { borderColor: C.accentDim }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.snoozeBtnText, { color: C.accent }]}>💤  Snooze {settings.snoozeDuration}</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SCREEN: MATH CHALLENGE
// ═════════════════════════════════════════════════════════════════════════════

function MathScreen({ settings, onDismiss }) {
  const C = THEME_COLORS[settings.theme];
  const [math] = useState(() => generateMath(settings.mathDifficulty));
  const [answer, setAnswer] = useState('');
  const [tries, setTries] = useState(0);
  const [wrong, setWrong] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = () => {
    if (parseInt(answer) === math.answer) {
      onDismiss();
    } else {
      setWrong(true);
      setTries(t => t + 1);
      setAnswer('');
      doShake();
      setTimeout(() => setWrong(false), 600);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.px, styles.mathContent]}>
          <Text style={[styles.mathEyebrow, { color: C.sub }]}>Wake Up Challenge  •  {settings.mathDifficulty}</Text>
          <Text style={[styles.mathSubtitle, { color: C.text }]}>Solve to dismiss alarm</Text>

          <Animated.View style={[styles.mathCard, { backgroundColor: C.card, borderColor: C.border, transform: [{ translateX: shake }] }]}>
            <Text style={[styles.mathQuestion, { color: C.accent }]}>{math.question}</Text>
          </Animated.View>

          {tries > 0 && (
            <Text style={[styles.triesText, { color: '#ff6b6b' }]}>
              {wrong ? '✗ Wrong answer!' : `${tries} wrong attempt${tries > 1 ? 's' : ''}`}
            </Text>
          )}

          <View style={[styles.mathInputWrap, { backgroundColor: C.card, borderColor: wrong ? '#ff6b6b' : C.accentDim }]}>
            <TextInput
              style={[styles.mathInput, { color: C.text }]}
              value={answer}
              onChangeText={v => setAnswer(v.replace(/[^0-9\-]/g, ''))}
              keyboardType="number-pad"
              placeholder="Your answer..."
              placeholderTextColor={C.sub}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              autoFocus
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitBtn, { backgroundColor: answer ? C.accent : C.card, borderColor: C.border }]}
            disabled={!answer}
          >
            <Text style={[styles.submitBtnText, { color: answer ? C.bg : C.sub }]}>Check Answer ✓</Text>
          </TouchableOpacity>

          <Text style={[styles.hintText, { color: C.sub, textAlign: 'center', marginTop: 12 }]}>
            You must answer correctly to silence the alarm
          </Text>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [screen, setScreen] = useState('home');
  const [alarms, setAlarms] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [editingAlarm, setEditingAlarm] = useState(null);
  const [ringingAlarm, setRingingAlarm] = useState(null);
  const playerRef = useRef(null);

useEffect(() => {
  async function handleAlarmSound() {
    try {
      if (ringingAlarm && !playerRef.current) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });

        const player = createAudioPlayer(
          require('./assets/rooster_alarm.mp3')
        );

        player.loop = true;
        player.volume = 1;
        player.play();

        playerRef.current = player;
      }

      if (!ringingAlarm && playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
        playerRef.current = null;
      }
    } catch (error) {
      console.log('Sound error:', error);
    }
  }

  handleAlarmSound();
}, [ringingAlarm]);
  // ── Real-time alarm checker ──────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      // Only check if we're on the home screen (not already ringing)
      if (screen !== 'home') return;

      const now = new Date();
      const currentHours24 = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentSeconds = now.getSeconds();
      const currentDay = DAYS[now.getDay()]; // e.g. 'Mon'
      

      // Only trigger right at the start of the minute
      if (currentSeconds > 5) return;

      alarms.forEach(alarm => {
        if (!alarm.enabled) return;

        // Convert alarm time to 24hr for comparison
        let alarmHour = parseInt(alarm.hours);
        if (alarm.period === 'AM' && alarmHour === 12) alarmHour = 0;
        if (alarm.period === 'PM' && alarmHour !== 12) alarmHour += 12;
        const alarmMinute = parseInt(alarm.minutes);

        if (alarmHour === currentHours24 && alarmMinute === currentMinutes) {
          // Check repeat days — if no days set, always fire
          if (alarm.days.length === 0 || alarm.days.includes(currentDay)) {
            setRingingAlarm(alarm);
            setScreen('ringing');
          }
        }
      });
    }, 1000); // check every second

    return () => clearInterval(interval);
  }, [screen, alarms]);

  // ── Alarm management ──────────────────────────────────────────────────────

  const handleAdd = () => {
    setEditingAlarm(newAlarm());
    setScreen('addAlarm');
  };

  const handleEdit = (alarm) => {
    setEditingAlarm({ ...alarm });
    setScreen('addAlarm');
  };

  const handleSaveAlarm = (alarm) => {
    setAlarms(prev => {
      const idx = prev.findIndex(a => a.id === alarm.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = alarm;
        return next;
      }
      return [...prev, alarm];
    });
    setScreen('home');
  };

  const handleToggle = (id) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const handleDelete = (id) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  // ── Settings ──────────────────────────────────────────────────────────────

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    setScreen('home');
  };

  // ── Ringing / Math flow ───────────────────────────────────────────────────

  const handleSimulateRing = () => {
    // Use first enabled alarm if exists, else a demo one
    const demo = alarms.find(a => a.enabled) || { ...newAlarm(), hours: '07', minutes: '30', label: 'Demo Alarm' };
    setRingingAlarm(demo);
    setScreen('ringing');
  };

  const handleSnooze = () => {
    // In a real app this would set a timer for snoozeDuration
    Alert.alert('Snoozed', `Alarm snoozed for ${settings.snoozeDuration}!`);
    setScreen('home');
    setRingingAlarm(null);
  };

  const handleGoToMath = () => setScreen('math');

  const handleDismiss = () => {
    // If one-time alarm, disable it after dismissal
    if (ringingAlarm && ringingAlarm.days.length === 0) {
      setAlarms(prev => prev.map(a => a.id === ringingAlarm.id ? { ...a, enabled: false } : a));
    }
    setScreen('home');
    setRingingAlarm(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (screen === 'settings') {
    return <SettingsScreen settings={settings} onSave={handleSaveSettings} onBack={() => setScreen('home')} />;
  }

  if (screen === 'addAlarm' && editingAlarm) {
    return <AddAlarmScreen alarm={editingAlarm} settings={settings} onSave={handleSaveAlarm} onCancel={() => setScreen('home')} />;
  }

  if (screen === 'ringing' && ringingAlarm) {
    return <RingingScreen alarm={ringingAlarm} settings={settings} onSnooze={handleSnooze} onChallenge={handleGoToMath} />;
  }

  if (screen === 'math') {
    return <MathScreen settings={settings} onDismiss={handleDismiss} />;
  }

  return (
    <HomeScreen
      alarms={alarms}
      settings={settings}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onToggle={handleToggle}
      onDelete={handleDelete}
      onSettings={() => setScreen('settings')}
      onSimulateRing={handleSimulateRing}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container:      { flex: 1 },
  px:             { paddingHorizontal: 20 },

  // ── Home ──
  homeHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  homeEyebrow:    { fontSize: 10, letterSpacing: 5, textTransform: 'uppercase' },
  homeTitle:      { fontSize: 30, fontWeight: '800', letterSpacing: 2 },
  divider:        { height: 2, marginHorizontal: 20, borderRadius: 2, marginBottom: 8 },
  alarmCount:     { fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginLeft: 20, marginBottom: 12 },
  listContent:    { paddingHorizontal: 20, paddingBottom: 120 },

  alarmCard:      { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  alarmCardLeft:  { flex: 1 },
  alarmTime:      { fontSize: 42, fontWeight: '800', lineHeight: 46 },
  alarmPeriod:    { fontSize: 18, fontWeight: '400' },
  alarmLabel:     { fontSize: 15, fontWeight: '600', marginTop: 2 },
  alarmDays:      { fontSize: 11, letterSpacing: 1, marginTop: 4 },
  alarmCardRight: { alignItems: 'center', gap: 12 },
  deleteBtn:      { borderWidth: 1, borderRadius: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  emptyState:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon:      { fontSize: 64, marginBottom: 16 },
  emptyTitle:     { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySub:       { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  fab:            { position: 'absolute', bottom: 40, right: 24, width: 60, height: 60, borderRadius: 30, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  fabInner:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabText:        { fontSize: 30, fontWeight: '300', lineHeight: 34, marginTop: -2 },
  devBtn:         { position: 'absolute', bottom: 40, left: 24, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  devBtnText:     { fontSize: 12, letterSpacing: 1 },

  // ── Shared header ──
  subHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginBottom: 24, paddingHorizontal: 20 },
  subTitle:       { fontSize: 22, fontWeight: '700' },
  iconBtn:        { borderWidth: 1, borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow:      { fontSize: 20, lineHeight: 22 },
  saveBtn:        { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  saveBtnText:    { fontSize: 14, fontWeight: '700', letterSpacing: 1 },

  // ── Shared labels ──
  sectionLabel:   { fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 10, marginTop: 20, marginLeft: 4 },
  hintText:       { fontSize: 11, letterSpacing: 1, marginTop: 8, marginLeft: 4 },

  // ── Add Alarm ──
  timePicker:     { borderRadius: 18, borderWidth: 1, padding: 20, marginBottom: 4 },
  timeRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  timeBox:        { borderWidth: 1, borderRadius: 14, width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  timeInput:      { fontSize: 42, fontWeight: '800', textAlign: 'center', width: '100%', paddingHorizontal: 8 },
  timeBoxLabel:   { fontSize: 10, letterSpacing: 3, marginTop: -4 },
  colon:          { fontSize: 44, fontWeight: '800', marginBottom: 10 },
  periodBtn:      { borderRadius: 14, width: 64, height: 88, alignItems: 'center', justifyContent: 'center' },
  periodText:     { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  inputWrap:      { borderRadius: 14, borderWidth: 1, padding: 16 },
  labelInput:     { fontSize: 16 },
  daysRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderRadius: 18, borderWidth: 1, padding: 16 },
  dayChip:        { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 50, alignItems: 'center' },
  dayChipText:    { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },

  // ── Settings ──
  settingCard:    { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  settingCardLeft:{ flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon:    { fontSize: 22, marginRight: 14 },
  settingLabel:   { fontSize: 15, fontWeight: '600' },
  settingSub:     { fontSize: 11, marginTop: 2, lineHeight: 16 },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip:           { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  chipText:       { fontSize: 12, fontWeight: '500' },

  // ── Ringing ──
  ringingContainer:{ alignItems: 'center', justifyContent: 'center' },
  flashOverlay:    { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  ringingEyebrow:  { fontSize: 12, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 20 },
  ringingTime:     { fontSize: 72, fontWeight: '900', letterSpacing: -2 },
  ringingLabel:    { fontSize: 20, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  ringingHint:     { fontSize: 12, letterSpacing: 2, marginTop: 12, marginBottom: 40 },
  dismissBtn:      { borderRadius: 18, paddingHorizontal: 40, paddingVertical: 18, marginBottom: 16 },
  dismissBtnText:  { fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  snoozeBtn:       { borderWidth: 1, borderRadius: 18, paddingHorizontal: 32, paddingVertical: 14 },
  snoozeBtnText:   { fontSize: 16, fontWeight: '600', letterSpacing: 1 },

  // ── Math ──
  mathContent:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mathEyebrow:    { fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 },
  mathSubtitle:   { fontSize: 16, marginBottom: 32 },
  mathCard:       { borderRadius: 20, borderWidth: 1, paddingHorizontal: 40, paddingVertical: 30, marginBottom: 16, width: '100%', alignItems: 'center' },
  mathQuestion:   { fontSize: 38, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
  triesText:      { fontSize: 14, marginBottom: 8 },
  mathInputWrap:  { borderRadius: 14, borderWidth: 2, width: '100%', marginBottom: 16 },
  mathInput:      { fontSize: 28, fontWeight: '700', textAlign: 'center', padding: 16 },
  submitBtn:      { borderRadius: 14, borderWidth: 1, paddingHorizontal: 32, paddingVertical: 14, width: '100%', alignItems: 'center' },
  submitBtnText:  { fontSize: 16, fontWeight: '700', letterSpacing: 1 },
});

AppRegistry.registerComponent('main', () => App);