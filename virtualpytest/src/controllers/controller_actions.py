"""
Controller Actions - Simplified action definitions for remote controllers

This file contains all remote action definitions in simplified format,
keeping only essential parameters needed for execution.
"""

# Android Mobile Remote Actions (most advanced)
ANDROID_MOBILE_ACTIONS = {
    'click_element': {'element_id': ''},
    'dump_ui': {},
    'tap_coordinates': {'x': 0, 'y': 0},
    'input_text': {'text': ''},
    'launch_app': {'package': ''},
    'close_app': {'package': ''},
    'press_key': {'key': ''},
    'take_screenshot': {},
    'navigate_up': {},
    'navigate_down': {},
    'navigate_left': {},
    'navigate_right': {},
    'select': {},
    'back': {},
    'home': {},
    'menu': {}
}

# Android TV Remote Actions (ADB-based, no UI elements)
ANDROID_TV_ACTIONS = {
    'tap_coordinates': {'x': 0, 'y': 0},
    'input_text': {'text': ''},
    'launch_app': {'package': ''},
    'close_app': {'package': ''},
    'press_key': {'key': ''},
    'navigate_up': {},
    'navigate_down': {},
    'navigate_left': {},
    'navigate_right': {},
    'select': {},
    'back': {},
    'home': {},
    'menu': {},
    'play_pause': {},
    'fast_forward': {},
    'rewind': {},
    'volume_up': {},
    'volume_down': {},
    'mute': {},
    'power': {}
}

# IR Remote Actions (key name and IR code)
IR_REMOTE_ACTIONS = {
    'UP': 0x52,
    'DOWN': 0x51,
    'LEFT': 0x50,
    'RIGHT': 0x4F,
    'OK': 0x28,
    'BACK': 0x29,
    'HOME': 0x4A,
    'MENU': 0x76,
    'POWER': 0x74,
    'VOLUME_UP': 0x80,
    'VOLUME_DOWN': 0x81,
    'MUTE': 0x7F,
    'CHANNEL_UP': 0x9C,
    'CHANNEL_DOWN': 0x9D,
    'PLAY_PAUSE': 0xCD,
    'STOP': 0xB7,
    'FAST_FORWARD': 0xB3,
    'REWIND': 0xB4,
    'RECORD': 0xB2,
    'RED': 0x8E,
    'GREEN': 0x8F,
    'YELLOW': 0x90,
    'BLUE': 0x91,
    'GUIDE': 0x8D,
    'INFO': 0x8C,
    '0': 0x27,
    '1': 0x1E,
    '2': 0x1F,
    '3': 0x20,
    '4': 0x21,
    '5': 0x22,
    '6': 0x23,
    '7': 0x24,
    '8': 0x25,
    '9': 0x26,
    'change_channel': {'channel': 1},
    'set_volume': {'level': 50},
    'input_text': {'text': ''}
}

# Bluetooth Remote Actions (HID keycodes)
BLUETOOTH_REMOTE_ACTIONS = {
    'UP': 0x52,
    'DOWN': 0x51,
    'LEFT': 0x50,
    'RIGHT': 0x4F,
    'OK': 0x28,
    'BACK': 0x29,
    'HOME': 0x4A,
    'MENU': 0x76,
    'POWER': 0x74,
    'VOLUME_UP': 0x80,
    'VOLUME_DOWN': 0x81,
    'MUTE': 0x7F,
    'PLAY_PAUSE': 0xCD,
    'STOP': 0xB7,
    'FAST_FORWARD': 0xB3,
    'REWIND': 0xB4,
    'A': 0x04,
    'B': 0x05,
    'C': 0x06,
    'SPACE': 0x2C,
    'ENTER': 0x28,
    'BACKSPACE': 0x2A,
    '0': 0x27,
    '1': 0x1E,
    '2': 0x1F,
    '3': 0x20,
    'input_text': {'text': ''},
    'pair_device': {'pin': ''},
    'press_key': {'key': ''}
} 