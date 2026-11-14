import { state } from 'forge';
import './App.css';

const message = state('Press the button');

function greet() {
  message.set('Hello, world!');
}

export const commands = {
  '--greet': { description: 'Print the greeting', run: greet },
};

export default function App() {
  return (
    <window title="Hello, forge">
      <text class="message">{message}</text>
      <button onClick={greet}>Greet</button>
    </window>
  );
}
