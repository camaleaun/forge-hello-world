import { state, __, back, quit } from 'forge';
import './Hello.css';

const message = state(__('Press the button'));

export function greet() {
  message.set(__('Hello, world!'));
}

// Screen 2: the greeting. Greet (the default button) sits in the body right under the message; the footer has only Back and Close (Escape) at its two ends.
export default function Hello() {
  return (
    <step id="greeting" width={600} height={440}>
      <view class="hello-content">
        <text class="hello-message">{message}</text>
        <button primary class="hello-greet" onClick={greet}>{__('Greet')}</button>
        <only macos><text class="hello-hint">{__('Quit with Cmd+Q')}</text></only>
        <only linux><text class="hello-hint">{__('Quit with Ctrl+Q')}</text></only>
      </view>
      <view class="hello-divider" />
      <view class="hello-footer">
        <button onClick={back}>{__('Back')}</button>
        <button cancel onClick={quit}>{__('Close')}</button>
      </view>
    </step>
  );
}
