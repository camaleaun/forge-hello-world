import { state, __ } from 'forge';
import './App.css';

const message = state(__('Press the button'));

function greet() {
  message.set(__('Hello, world!'));
}

export const commands = {
  '--greet': { description: __('Print the greeting'), run: greet },
};

export default function App() {
  return (
    <window title="Hello, forge">
      <select language />
      <progress source="language-download" />
      <text class="message">{message}</text>
      <button onClick={greet}>Greet</button>
      <only macos><text class="hint">{__('Quit with Cmd+Q')}</text></only>
      <only linux><text class="hint">{__('Quit with Ctrl+Q')}</text></only>
    </window>
  );
}
