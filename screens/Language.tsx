import { __, next, quit } from 'forge';
import './Language.css';

function confirm() {
  next();
}

// Screen 1: choose the language, like the first dialog of a classic installer. OK waits for a language pack download.
export default function Language() {
  return (
    <step id="language" width={420} height={180}>
      <view class="language-content">
        <text class="language-prompt">{__('Please choose your language')}</text>
        <select language />
        <progress source="language-download" />
      </view>
      <view class="language-footer">
        <button primary waitsForDownload onClick={confirm}>{__('OK')}</button>
        <button cancel onClick={quit}>{__('Cancel')}</button>
      </view>
    </step>
  );
}
