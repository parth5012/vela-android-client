const IS_PROD = process.env.APP_VARIANT === 'production';

export default {
  "expo": {
    "name": IS_PROD ? "Vela - Your Personal Assistant" : "Vela (Dev)",
    "slug": "client",
    "scheme": "vela-client",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": IS_PROD ? "com.parth5012.client" : "com.parth5012.client.dev",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false,
      "package": IS_PROD ? "com.parth5012.client" : "com.parth5012.client.dev",
      "softwareKeyboardLayoutMode": "adjustResize"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-sharing"
    ],
    "extra": {
      "router": {},
      "eas": {
        "projectId": "5a7e1fb7-9a26-423b-9467-7dc6c0498693"
      }
    }
  }
};
