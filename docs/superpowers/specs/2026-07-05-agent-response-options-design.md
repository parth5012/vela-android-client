# Design Spec: Agent Response Options in Chats

## Overview
This design spec outlines the implementation of an inline action row and a dropdown menu on Vela agent chat responses. It allows users to copy, share, download as markdown, regenerate responses, toggle raw markdown, branch conversations, extract code blocks, and view generation metadata.

## Goals & Requirements
1. **Message Action Bar**: Render an action bar below completed agent responses.
2. **Standard Buttons**:
   - **Copy**: Copy the response text to the clipboard.
   - **Share**: Share the response text using the OS-native share dialogue.
   - **More (︙)**: Expand a dropdown menu with secondary actions.
3. **Menu Actions**:
   - **Download as MD**: Export the response as a `.md` markdown file to the local device.
   - **Regenerate**: Delete current and subsequent messages, and re-run the previous user prompt.
   - **Toggle Raw**: Toggle between rich-text markdown rendering and raw text.
   - **Branch**: Create a new thread and copy message history up to this response.
   - **Copy Code Blocks**: Parse, extract, and copy only the code block contents to the clipboard.
   - **Response Info**: Display metadata (model name, word count, character count, and time).

## User Interface Design

### Inline Buttons Layout
```
+------------------------------------------------------+
| Vela Agent:                                          |
| Here is the response you requested...                |
|                                                      |
|  [Copy 📋]  [Share 📤]  [︙]                          |
+------------------------------------------------------+
```
* **Aesthetics**: Subtle, semi-transparent buttons matching the active theme colors (`THEME_COLORS[theme]`).
* **Menu**: Opens a custom themed modal-based dropdown overlay positioned overlaying or near the message bubble, containing clear items with text and emojis.

## Technical Architecture

### Dependencies
We will install the following packages:
* `expo-clipboard`
* `expo-file-system`
* `expo-sharing`

### State Management & Store Changes (`useChatStore.ts`)
* Add a `branchThread(parentThreadId: string, uptoMessageId: string, newThreadId: string, title: string)` action to duplicate messages up to a specific point into a new thread.
* Add a `regenerateResponse(threadId: string, assistantMessageId: string)` action to remove the assistant message and trailing messages, returning the preceding user prompt for regeneration.

### Code Block Extraction Logic
* RegEx: `/```[\s\S]*?```/g` to find code blocks.
* We parse the matches, strip the triple backticks and language headers, and copy the code contents.

### Markdown Download Logic
* Use `expo-file-system` to write the content string to a temporary file.
* Use `expo-sharing` to share the file so the user can save or export it.

## Testing Strategy
1. **Clipboard Copying**: Verify full text and code-blocks-only copying work.
2. **Sharing & Downloading**: Test download trigger and sharing menu options.
3. **Regeneration**: Confirm that regenerating deletes the old response and triggers a fresh streaming call.
4. **Branching**: Verify a new thread is created with correct message history.
