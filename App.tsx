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
      <text class="message">{message}</text>
      <button onClick={greet}>Greet</button>
    </window>
  );
}
