// Every exported function is an action. `ui` is forge's closed v1 API.
export function greet(ui: { setText(labelId: string, text: string): void }) {
  ui.setText('message', 'Hello, world!');
}
