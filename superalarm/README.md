# SuperAlarm

A complete alarm clock app built with Expo SDK 54 and React Native.

## Features

- **Multiple Alarms** — Create, edit, enable/disable, and delete alarms
- **Repeat Scheduling** — Choose which days of the week to repeat
- **Labels** — Name your alarms (Work, Gym, Medicine, etc.)
- **Math Challenge Dismissal** — Solve a math problem to turn off the alarm
- **4 Difficulty Levels** — Easy, Medium, Hard, Nightmare
- **Flashing Lights** — Screen flashes when the alarm fires
- **Vibration** — Toggle vibration on/off
- **5 Alarm Sounds** — (hookup with expo-av)
- **Snooze** — Configurable 5, 10, 15 min, or Off
- **3 Color Themes** — Cyber Blue, Deep Purple, Midnight Green

## Setup

This project was built for Node 20 + Expo SDK 54.

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start the dev server
npx expo start
```

Then scan the QR code with Expo Go on your phone.

> **Important:** Your phone and computer must be on the same Wi-Fi network.

## Project Structure

```
superalarm/
├── App.js          ← All screens and logic in one file
├── package.json
├── babel.config.js
├── app.json
└── assets/
```

## App Flow

```
Home Screen
├── Tap + → Add Alarm Screen
│   ├── Set time (HH:MM AM/PM)
│   ├── Add label
│   └── Choose repeat days
├── Tap alarm card → Edit Alarm Screen
├── Toggle switch → Enable/disable alarm
├── ⚙️ button → Settings Screen
│   ├── Flashing Lights toggle
│   ├── Vibration toggle
│   ├── Alarm Sound picker
│   ├── Math Difficulty picker
│   ├── Snooze Duration picker
│   └── Color Theme picker
└── ⏰ Test Ring button → Ringing Screen
    ├── Snooze button
    └── Dismiss → Math Challenge Screen
        └── Correct answer → Back to Home
```

## Next Steps (wiring up real functionality)

| Feature | Library |
|---------|---------|
| Real alarm scheduling | `expo-notifications` |
| Alarm sounds | `expo-av` |
| Vibration | `expo-haptics` |
| Persist alarms across restarts | `@react-native-async-storage/async-storage` |
| Background wake | `expo-task-manager` + `expo-background-fetch` |
