import { __ } from 'forge';
import './App.css';
import Language from './screens/Language.tsx';
import Hello, { greet } from './screens/Hello.tsx';

export const commands = {
  '--greet': { description: __('Print the greeting'), run: greet },
};

export default function App() {
  return (
    <window title="Hello, forge">
      <steps>
        <Language />
        <Hello />
      </steps>
    </window>
  );
}
