# 琴习 iOS 原生 MIDI 方案

这一步的目标是保留现有网页界面，用 Capacitor 包成 iOS App，再用原生插件把 iOS 的蓝牙 MIDI 数据送回 `script.js`。

## 本机准备

需要在一台 Mac 上安装：

- Xcode
- Node.js 和 pnpm
- Apple ID；如果要长期装到手机，后续需要 Apple Developer/TestFlight

## 初始化 iOS 工程

```bash
pnpm install
pnpm run build
pnpm run cap:sync:ios
pnpm run cap:open:ios
```

当前工程已经使用 Capacitor 的 Swift Package Manager 模板生成了 `ios/`，不需要 CocoaPods。生成 iOS 工程后，在 Xcode 里选择真机运行。模拟器无法连接你的电钢蓝牙 MIDI。

如果 `xcodebuild` 报错说 active developer directory 是 Command Line Tools，需要先安装完整 Xcode，然后执行：

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

## JS 侧约定

网页会优先寻找 Capacitor 插件：

```js
window.Capacitor?.Plugins?.QinxiMidi
```

插件需要提供：

```ts
start(): Promise<{ inputs: Array<{ name: string }> }>
addListener("midiEvent", callback): Promise<{ remove(): void }>
```

按键事件格式：

```js
{
  type: "noteOn",      // 或 noteOff
  midi: 60,
  note: "C4",
  velocity: 82,
  timestamp: 123456.78
}
```

琴习收到事件后会显示最近按键、按住的音和按键日志。后续听音/找音/小汤练习可以复用这条事件流自动判题。

## iOS 插件要做的事

1. 使用 CoreMIDI 扫描 MIDI 输入源。
2. 监听蓝牙 MIDI 或 USB MIDI 的 note on / note off。
3. 把 MIDI note number、velocity、timestamp 转成 `midiEvent` 发给 JS。

Swift 侧插件名建议固定为 `QinxiMidi`，这样当前网页不用再改。

## 注意

- 电钢必须支持 `Bluetooth MIDI`，只支持 `Bluetooth Audio` 不够。
- iPhone 系统设置里通常需要先完成蓝牙 MIDI 配对，或由原生层发起 MIDI 网络会话。
- GitHub Pages 纯网页仍然不能读取 iPhone 蓝牙 MIDI；只有 Capacitor iOS App 能用这条路径。
