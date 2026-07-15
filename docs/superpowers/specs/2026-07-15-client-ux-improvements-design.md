# Client UX & Personalization Improvements

This design document specifies the implementation details for the 4 layout, theme, and interaction suggestions, as well as the new skill JSON rendering layout.

## 1. Skill JSON Rendering & Newline Separation

Currently, skill blocks parsed from agent messages are displayed using a standard collapsible block containing raw text rendered via markdown. We will implement a custom layout specifically for skill outputs.

### Custom Rendering
* If a segment is of type `skill`, its inner children (containing the JSON string) will be compiled and displayed inside a custom console-style card (`skillPanel`).
* The panel will consist of:
  * A header bar styled with the current theme’s accent color (with 10% opacity background).
  * A badge showing `🧩 SKILL: <NAME>` in bold.
  * A pressable copy button that places the raw JSON string on the clipboard using `expo-clipboard`.
  * A horizontally scrollable `ScrollView` displaying the formatted JSON text in monospace.

### Newline Separation
* We will insert a vertical separator (`<View style={{ height: sizes.text }} />`) between the skill component and the following text response inside the chat bubble list mapping, ensuring a visual newline spacing.

## 2. Interface Polish & Visual Layout

### Dynamic Persona Header
* In the message row of `index.tsx`, when rendering assistant messages, we will read the persona configured for the active thread from the config store.
* We will display the corresponding persona's emoji avatar and name alongside "Vela Agent" in a horizontal flex layout (e.g., `👩‍🏫 Vela Agent (Teacher)`).

### Fenced Code Blocks Copy Bar
* In `RichText.tsx`, we will implement custom rules for the `fence` and `code_block` nodes in `react-native-markdown-display`.
* A header bar will show the code language name and a `"Copy"` button. Tapping it will call `Clipboard.setStringAsync` to copy the block's text.

### Typing Indicator
* When `isStreaming` is active for the last assistant message, we will render three small dots (`typing-dot`) at the bottom of the bubble.
* The dots will have a pulsing opacity animation to represent the active compiling state.

## 3. Extended Themes & Customization

We will extend `THEME_COLORS` and `ACCENT_COLORS` in `theme.ts` to allow users to select from a wider range of themes:

### Themes
* **OLED Deep Black (`oled`)**: Pure `#000000` background for saving battery on AMOLED devices.
* **Dracula (`dracula`)**: Muted purples and pinks based on the Dracula spec.
* **Nordic Frost (`nordic`)**: Muted arctic blues and greys.

### Accent Colors
* Add `violet`, `pink`, `orange`, and `blue` as options.

## 4. Custom suggestion starters

We will migrate suggestion starter cards from hardcoded arrays to the Zustand configuration store.

### Store Persistence
* Add `suggestionStarters` state array and a `setSuggestionStarters` modifier in `useConfigStore.ts`.
* Provide default suggestions as part of the initial store state.

### Settings UI Editor
* In `settings.tsx`, we will render a list of the existing suggestion starters.
* Users can tap a "Delete" button next to any starter card to remove it.
* A form will allow users to add new starter cards by typing the label, prompt, and choosing a persona badge.
