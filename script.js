const storageKey = "qinx_practice_records_v1";
const importStorageKey = "qinx_imported_sources_v1";
const theoryProgressKey = "qinx_theory_progress_v1";
const appDataKey = "qinxi_app_data_v2";
const appDataVersion = 2;
const supabaseUrl = "https://rwrqumnbgxcqonpvfxqj.supabase.co";
const supabasePublishableKey = "sb_publishable_sStbbTzJvM_7ehaSUJBN9A_GJcG90Ee";
const cloudDataTable = "qinxi_user_data";
const pendingSyncEmailKey = "qinxi_pending_sync_email";
const importAnalyzerEndpoint = `${supabaseUrl}/functions/v1/analyze-import`;

let supabaseClient = null;
let currentUser = null;
let isApplyingCloudData = false;
let cloudSyncTimer = null;
let cloudPullTimer = null;
let pianoAudioContext = null;
let currentPianoSource = null;
let currentPianoGain = null;

const pianoSampleBuffers = new Map();
const pianoSampleLoads = new Map();
const pianoSampleData = new Map();
const pianoSampleDataLoads = new Map();
const pianoSamples = [
  { midi: 21, url: "./assets/piano/A0.mp3" },
  { midi: 24, url: "./assets/piano/C1.mp3" },
  { midi: 27, url: "./assets/piano/Ds1.mp3" },
  { midi: 30, url: "./assets/piano/Fs1.mp3" },
  { midi: 33, url: "./assets/piano/A1.mp3" },
  { midi: 36, url: "./assets/piano/C2.mp3" },
  { midi: 39, url: "./assets/piano/Ds2.mp3" },
  { midi: 42, url: "./assets/piano/Fs2.mp3" },
  { midi: 45, url: "./assets/piano/A2.mp3" },
  { midi: 48, url: "./assets/piano/C3.mp3" },
  { midi: 51, url: "./assets/piano/Ds3.mp3" },
  { midi: 54, url: "./assets/piano/Fs3.mp3" },
  { midi: 57, url: "./assets/piano/A3.mp3" },
  { midi: 60, url: "./assets/piano/C4.mp3" },
  { midi: 63, url: "./assets/piano/Ds4.mp3" },
  { midi: 66, url: "./assets/piano/Fs4.mp3" },
  { midi: 69, url: "./assets/piano/A4.mp3" },
  { midi: 72, url: "./assets/piano/C5.mp3" },
  { midi: 75, url: "./assets/piano/Ds5.mp3" },
  { midi: 78, url: "./assets/piano/Fs5.mp3" },
  { midi: 81, url: "./assets/piano/A5.mp3" },
  { midi: 84, url: "./assets/piano/C6.mp3" },
  { midi: 87, url: "./assets/piano/Ds6.mp3" },
  { midi: 90, url: "./assets/piano/Fs6.mp3" },
  { midi: 93, url: "./assets/piano/A6.mp3" },
  { midi: 96, url: "./assets/piano/C7.mp3" },
  { midi: 99, url: "./assets/piano/Ds7.mp3" },
  { midi: 102, url: "./assets/piano/Fs7.mp3" },
  { midi: 105, url: "./assets/piano/A7.mp3" },
  { midi: 108, url: "./assets/piano/C8.mp3" }
];

const theoryLevels = [
  {
    id: "notes",
    group: "音符",
    title: "识别音符在钢琴上的位置",
    summary: "看钢琴键上的红点，判断它是 C 到 B 里的哪个音。答对会变绿并发出对应音高。",
    contents: ["白键 C 到 B", "音名和简谱", "键盘位置"],
    visual: keyboardVisual(["C", "D", "E", "F", "G", "A", "B"], "白键按 C 到 B 循环，再回到 C"),
    points: ["钢琴白键是 7 个自然音反复循环", "C 大调里 C D E F G A B 对应 1 2 3 4 5 6 7", "先记白键顺序，再理解升降号"],
    drill: "keyboard"
  },
  {
    id: "black-keys",
    group: "音符",
    title: "识别黑键升降音",
    summary: "黑键有两种常见叫法：可以按左边白键升高命名，也可以按右边白键降低命名。",
    contents: ["升号 #", "降号 b", "同一个黑键的两种名字"],
    visual: keyboardVisual(["C", "C#", "D", "D#", "E", "F", "F#"], "黑键可以用升号或降号命名"),
    points: ["C# 和 Db 是同一个黑键", "D# 和 Eb 是同一个黑键", "F# 和 Gb、G# 和 Ab、A# 和 Bb 也是同音异名"],
    drill: "black"
  },
  {
    id: "staff-note",
    group: "读谱",
    title: "识别五线谱上的音",
    summary: "按指定的音名和八度，在高音谱号或低音谱号上标注正确位置，并辨认简谱的高低音点。",
    contents: ["高音谱号", "低音谱号", "简谱高低音点"],
    visual: staffVisual("高音谱号 C 到 G", ["C4", "D4", "E4", "F4", "G4"]),
    points: ["谱上越高，实际音越高", "高音谱号第 2 线是 G", "低音谱号第 4 线是 F"],
    drill: "staff"
  },
  {
    id: "staff-ledger",
    group: "读谱",
    title: "上加线和下加线",
    summary: "专门练五线谱范围外的音：高音谱号下加一线中央 C、上加线高音，以及低音谱号上下加线。",
    contents: ["下加线", "上加线", "谱表外音"],
    visual: staffVisual("加线练习：中央 C 和高音", ["C4", "D4", "A5"]),
    points: ["高音谱号下加一线是中央 C", "谱表外每加一线或一间，仍按音名顺序往上或往下走", "加线不要背孤立点，先找最近的一条谱线定位"],
    drill: "staff-ledger"
  },
  {
    id: "steps",
    group: "音程",
    title: "半音和全音",
    summary: "理解相邻琴键的距离，是以后看升降号、音阶和和弦的基础。",
    contents: ["半音", "全音", "升号和降号"],
    visual: keyboardVisual(["C", "C#", "D", "D#", "E", "F", "F#"], "相邻琴键是半音，两个半音是全音"),
    points: ["相邻两个琴键的距离是半音", "两个半音组成一个全音", "E-F、B-C 中间没有黑键，所以它们本身就是半音"],
    drill: "choice",
    questions: [
      { prompt: "哪一组是半音？", options: ["E 到 F", "C 到 D", "F 到 G"], answer: "E 到 F", explain: "E 和 F 中间没有黑键，是相邻琴键。" },
      { prompt: "C 到 D 是什么距离？", options: ["全音", "半音", "三度"], answer: "全音", explain: "C 到 C# 是半音，C# 到 D 又是半音，所以 C 到 D 是全音。" },
      { prompt: "B 到 C 是什么距离？", options: ["半音", "全音", "八度"], answer: "半音", explain: "B 和 C 中间没有黑键，所以它们是半音。" }
    ]
  },
  {
    id: "clefs",
    group: "调号",
    title: "高音谱号和低音谱号",
    summary: "钢琴常用大谱表：右手多看高音谱号，左手多看低音谱号。",
    contents: ["高音谱号", "低音谱号", "左右手音区"],
    visual: noteMapVisual(),
    points: ["高音谱号常对应右手和较高音区", "低音谱号常对应左手和较低音区", "同一个音符位置在不同谱号里可能代表不同音"],
    drill: "choice",
    questions: [
      { prompt: "低音谱号通常更常给哪只手看？", options: ["左手", "右手", "两只脚"], answer: "左手", explain: "钢琴大谱表中，低音谱号通常负责左手的低音区。" },
      { prompt: "高音谱号第 2 线是什么音？", options: ["G", "F", "C"], answer: "G", explain: "高音谱号也叫 G 谱号，它圈住的第 2 线是 G。" },
      { prompt: "同一个位置换了谱号，音名会怎样？", options: ["可能变", "永远不变", "只变节奏"], answer: "可能变", explain: "谱号决定五线谱位置对应的音名。" }
    ]
  },
  {
    id: "rhythm",
    group: "节奏",
    title: "节拍和拍号",
    summary: "节拍决定音乐怎么走路。先数稳，再弹准。",
    contents: ["小节", "4/4 拍", "强弱规律"],
    visual: rhythmVisual(["1", "2", "3", "4"], "4/4 拍：一小节数四下"),
    points: ["4/4 拍表示每小节有 4 拍", "四分音符通常算一拍", "练琴时先能稳定数拍，再追求速度"],
    drill: "choice",
    questions: [
      { prompt: "4/4 拍通常表示一小节有几拍？", options: ["4 拍", "3 拍", "8 拍"], answer: "4 拍", explain: "4/4 拍的上方数字 4 表示每小节有 4 拍。" },
      { prompt: "练节拍时应该先追求什么？", options: ["稳定", "很快", "很响"], answer: "稳定", explain: "先能稳定数拍，再慢慢加速度。" },
      { prompt: "休止符出现时应该怎样？", options: ["不弹但继续数拍", "跳过", "加速"], answer: "不弹但继续数拍", explain: "休止符是音乐的一部分，心里仍然要数拍。" }
    ]
  },
  {
    id: "duration",
    group: "节奏",
    title: "音符时值",
    summary: "音符不只告诉你弹哪个音，也告诉你弹多久。",
    contents: ["全音符", "二分音符", "四分音符", "八分音符"],
    visual: rhythmVisual(["全音符 4 拍", "二分 2 拍", "四分 1 拍", "八分 1/2 拍"], "先理解长度，再看谱弹"),
    points: ["四分音符常作为一拍", "二分音符通常持续两拍", "休止符表示不弹，但仍然要在心里数拍"],
    drill: "choice",
    questions: [
      { prompt: "二分音符通常持续几拍？", options: ["2 拍", "1 拍", "4 拍"], answer: "2 拍", explain: "二分音符通常持续 2 拍。" },
      { prompt: "四分音符通常算几拍？", options: ["1 拍", "2 拍", "半拍"], answer: "1 拍", explain: "常见入门里四分音符先按 1 拍理解。" },
      { prompt: "全音符在 4/4 拍里通常持续多久？", options: ["4 拍", "2 拍", "1 拍"], answer: "4 拍", explain: "全音符通常占满一整个 4/4 小节。" }
    ]
  },
  {
    id: "intervals",
    group: "音程",
    title: "识别常见音程",
    summary: "音程就是两个音之间的距离。会听、会看、会数音程，后面学和弦会轻松很多。",
    contents: ["二度", "三度", "五度", "八度"],
    visual: staffVisual("常见音程：二度、三度、五度", ["C4", "D4", "E4", "G4"]),
    points: ["相邻音级是二度，例如 C 到 D", "隔一个音级常见为三度，例如 C 到 E", "C 到 G 是五度，很多和弦和伴奏都会用到"],
    drill: "choice",
    questions: [
      { prompt: "C 到 E 在入门里先按几度理解？", options: ["三度", "二度", "八度"], answer: "三度", explain: "从 C 数到 E：C 是 1，D 是 2，E 是 3，所以是三度。" },
      { prompt: "C 到 G 是几度？", options: ["五度", "三度", "二度"], answer: "五度", explain: "C-D-E-F-G 数到 G 是第五个音级。" },
      { prompt: "同名音从 C 到高一个 C 叫什么？", options: ["八度", "五度", "半音"], answer: "八度", explain: "同名音高一组，常称为八度。" }
    ]
  },
  {
    id: "scales",
    group: "音阶",
    title: "认识大调音阶",
    summary: "音阶是一串有规律的音。先从 C 大调开始，再理解为什么别的调需要升降号。",
    contents: ["C 大调", "全全半全全全半", "上行和下行"],
    visual: staffVisual("C 大调音阶", ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]),
    points: ["C 大调从 C 到下一个 C，全用白键", "大调音阶的距离规律是全全半全全全半", "练音阶要慢、均匀、手指提前准备"],
    drill: "choice",
    questions: [
      { prompt: "C 大调音阶主要使用哪些琴键？", options: ["白键", "黑键", "只用 C 和 G"], answer: "白键", explain: "C 大调没有升降号，入门时先用白键建立音阶感觉。" },
      { prompt: "大调音阶的核心规律是什么？", options: ["全全半全全全半", "半半全半半全半", "全半全半全半全"], answer: "全全半全全全半", explain: "这是大调音阶最重要的距离规律。" },
      { prompt: "练音阶最先追求什么？", options: ["均匀稳定", "越快越好", "只弹右手"], answer: "均匀稳定", explain: "速度以后再加，先让每个音的时值和力度稳定。" }
    ]
  },
  {
    id: "key-signatures",
    group: "调号",
    title: "认识调号和升降号",
    summary: "调号写在谱号后面，告诉你这首曲子默认哪些音要升高或降低。",
    contents: ["C 大调", "G 大调 F#", "F 大调 Bb"],
    visual: keySignatureVisual(),
    points: ["C 大调没有升降号", "G 大调常见一个升号：F#", "F 大调常见一个降号：Bb"],
    drill: "choice",
    questions: [
      { prompt: "C 大调调号有什么升降号？", options: ["没有", "一个升号", "一个降号"], answer: "没有", explain: "C 大调是入门最常见的无升降号调。" },
      { prompt: "G 大调常见的一个升号是什么？", options: ["F#", "Bb", "C#"], answer: "F#", explain: "G 大调调号里通常有 F#。" },
      { prompt: "调号通常写在哪里？", options: ["谱号后面", "每个音符下面", "小节线中间"], answer: "谱号后面", explain: "调号写在谱号后面，影响整段音乐里对应的音。" }
    ]
  },
  {
    id: "chords",
    group: "和弦",
    title: "认识三和弦",
    summary: "很多歌曲不是只靠单音旋律，也靠和弦支撑情绪。",
    contents: ["1-3-5", "大三和弦", "分解和弦"],
    visual: chordVisual(),
    points: ["三和弦通常取音阶里的 1、3、5", "C 大三和弦由 C、E、G 组成", "可以同时弹，也可以分解成一个个音弹"],
    drill: "choice",
    questions: [
      { prompt: "C 大三和弦由哪三个音组成？", options: ["C E G", "C D E", "D F A"], answer: "C E G", explain: "C 大三和弦取 C 大调里的 1、3、5，也就是 C、E、G。" },
      { prompt: "三和弦常取音阶里的哪几个级数？", options: ["1 3 5", "1 2 3", "2 4 6"], answer: "1 3 5", explain: "最基础的三和弦先按 1、3、5 理解。" },
      { prompt: "分解和弦是什么意思？", options: ["把和弦音一个个弹", "只弹最低音", "把节奏删掉"], answer: "把和弦音一个个弹", explain: "C-E-G 可以一起弹，也可以按顺序分解弹。" }
    ]
  }
];

let activeTheoryLevelId = theoryLevels[0].id;

const noteOptions = [
  { name: "C", numbered: "1", solfege: "Do", semitone: 0 },
  { name: "D", numbered: "2", solfege: "Re", semitone: 2 },
  { name: "E", numbered: "3", solfege: "Mi", semitone: 4 },
  { name: "F", numbered: "4", solfege: "Fa", semitone: 5 },
  { name: "G", numbered: "5", solfege: "Sol", semitone: 7 },
  { name: "A", numbered: "6", solfege: "La", semitone: 9 },
  { name: "B", numbered: "7", solfege: "Si", semitone: 11 }
];

const pianoNoteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const earOctaveGroups = [
  { id: "octave0", label: "次大字二组", range: "A0-B0", minMidi: 21, maxMidi: 23 },
  { id: "octave1", label: "大字一组", range: "C1-B1", minMidi: 24, maxMidi: 35 },
  { id: "octave2", label: "大字组", range: "C2-B2", minMidi: 36, maxMidi: 47 },
  { id: "octave3", label: "小字组", range: "C3-B3", minMidi: 48, maxMidi: 59 },
  { id: "octave4", label: "小字一组", range: "C4-B4", minMidi: 60, maxMidi: 71 },
  { id: "octave5", label: "小字二组", range: "C5-B5", minMidi: 72, maxMidi: 83 },
  { id: "octave6", label: "小字三组", range: "C6-B6", minMidi: 84, maxMidi: 95 },
  { id: "octave7", label: "小字四组", range: "C7-B7", minMidi: 96, maxMidi: 107 },
  { id: "octave8", label: "小字五组", range: "C8", minMidi: 108, maxMidi: 108 }
];
const earCourseDefinitions = [
  { id: "single", number: "01", title: "单音辨认", summary: "从小字一组开始，听一个音并选出准确音名。" },
  { id: "compare-basic", number: "02", title: "分组高低", summary: "只听当前音组的白键，先判断哪个音更高或更低。" },
  { id: "compare", number: "03", title: "混合高低", summary: "加入黑键，连续听两个或三个音，判断最高音或最低音。" },
  { id: "staff", number: "04", title: "听音定位", summary: "听到单音后，在五线谱上标出它的位置。" }
];

const earState = {
  groupId: "octave4",
  course: "single",
  compareCount: 2,
  question: null,
  status: "idle",
  lastAnswer: null,
  staffMark: null
};
let earPlaybackTimers = [];
let pianoWarmGroupId = null;
let pianoWarmStatus = "idle";
let earPianoInitialPositioned = false;

const pianoWhiteKeys = [
  { name: "C", octave: 4 },
  { name: "D", octave: 4 },
  { name: "E", octave: 4 },
  { name: "F", octave: 4 },
  { name: "G", octave: 4 },
  { name: "A", octave: 4 },
  { name: "B", octave: 4 },
  { name: "C", octave: 5 },
  { name: "D", octave: 5 },
  { name: "E", octave: 5 },
  { name: "F", octave: 5 },
  { name: "G", octave: 5 },
  { name: "A", octave: 5 },
  { name: "B", octave: 5 },
  { name: "C", octave: 6 }
];

const pianoBlackKeys = [
  { sharp: "C#", flat: "Db", octave: 4, afterWhite: 0, semitone: 1 },
  { sharp: "D#", flat: "Eb", octave: 4, afterWhite: 1, semitone: 3 },
  { sharp: "F#", flat: "Gb", octave: 4, afterWhite: 3, semitone: 6 },
  { sharp: "G#", flat: "Ab", octave: 4, afterWhite: 4, semitone: 8 },
  { sharp: "A#", flat: "Bb", octave: 4, afterWhite: 5, semitone: 10 },
  { sharp: "C#", flat: "Db", octave: 5, afterWhite: 7, semitone: 1 },
  { sharp: "D#", flat: "Eb", octave: 5, afterWhite: 8, semitone: 3 },
  { sharp: "F#", flat: "Gb", octave: 5, afterWhite: 10, semitone: 6 },
  { sharp: "G#", flat: "Ab", octave: 5, afterWhite: 11, semitone: 8 },
  { sharp: "A#", flat: "Bb", octave: 5, afterWhite: 12, semitone: 10 }
];

const staffDrillNotes = {
  treble: [
    { name: "A", octave: 3, step: -4, ledger: "below" },
    { name: "B", octave: 3, step: -3, ledger: "below" },
    { name: "C", octave: 4, step: -2, ledger: "below" },
    { name: "D", octave: 4, step: -1 },
    { name: "E", octave: 4, step: 0 },
    { name: "F", octave: 4, step: 1 },
    { name: "G", octave: 4, step: 2 },
    { name: "A", octave: 4, step: 3 },
    { name: "B", octave: 4, step: 4 },
    { name: "C", octave: 5, step: 5 },
    { name: "D", octave: 5, step: 6 },
    { name: "E", octave: 5, step: 7 },
    { name: "F", octave: 5, step: 8 },
    { name: "G", octave: 5, step: 9 },
    { name: "A", octave: 5, step: 10, ledger: "above" },
    { name: "B", octave: 5, step: 11, ledger: "above" },
    { name: "C", octave: 6, step: 12, ledger: "above" }
  ],
  bass: [
    { name: "C", octave: 2, step: -4, ledger: "below" },
    { name: "D", octave: 2, step: -3, ledger: "below" },
    { name: "E", octave: 2, step: -2, ledger: "below" },
    { name: "F", octave: 2, step: -1 },
    { name: "G", octave: 2, step: 0 },
    { name: "A", octave: 2, step: 1 },
    { name: "B", octave: 2, step: 2 },
    { name: "C", octave: 3, step: 3 },
    { name: "D", octave: 3, step: 4 },
    { name: "E", octave: 3, step: 5 },
    { name: "F", octave: 3, step: 6 },
    { name: "G", octave: 3, step: 7 },
    { name: "A", octave: 3, step: 8 },
    { name: "B", octave: 3, step: 9 },
    { name: "C", octave: 4, step: 10, ledger: "above" },
    { name: "D", octave: 4, step: 11, ledger: "above" },
    { name: "E", octave: 4, step: 12, ledger: "above" }
  ]
};

const staffLedgerDrillNotes = {
  treble: [
    { name: "C", octave: 4, step: -2, ledger: "below" },
    { name: "D", octave: 4, step: -1 },
    { name: "A", octave: 5, step: 10, ledger: "above" },
    { name: "B", octave: 5, step: 11, ledger: "above" },
    { name: "C", octave: 6, step: 12, ledger: "above" }
  ],
  bass: [
    { name: "C", octave: 2, step: -4, ledger: "below" },
    { name: "D", octave: 2, step: -3, ledger: "below" },
    { name: "E", octave: 2, step: -2, ledger: "below" },
    { name: "F", octave: 2, step: -1, ledger: "below" },
    { name: "C", octave: 4, step: 10, ledger: "above" },
    { name: "D", octave: 4, step: 11, ledger: "above" },
    { name: "E", octave: 4, step: 12, ledger: "above" }
  ]
};

const drillState = {
  keyboard: { note: null, status: "idle", correct: 0, attempts: 0 },
  black: { note: null, naming: "sharp", status: "idle", correct: 0, attempts: 0 },
  staff: { clef: "treble", question: null, marks: [], status: "idle", correct: 0, attempts: 0 },
  staffLedger: { clef: "treble", question: null, marks: [], status: "idle", correct: 0, attempts: 0 },
  choice: {}
};

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function ensureDrillQuestion(type) {
  if (type === "keyboard" && !drillState.keyboard.note) {
    drillState.keyboard.note = randomItem(pianoWhiteKeys);
  }
  if (type === "black" && !drillState.black.note) {
    drillState.black.note = randomItem(pianoBlackKeys);
  }
  if ((type === "staff" || type === "staffLedger") && !drillState[type].question) {
    drillState[type].question = createStaffPlacementQuestion(type, drillState[type].clef);
    drillState[type].marks = [];
  }
}

function staffNotePool(type, clef) {
  return type === "staffLedger" ? staffLedgerDrillNotes[clef] : staffDrillNotes[clef];
}

function createStaffPlacementQuestion(type, clef) {
  const notes = staffNotePool(type, clef);
  const byName = notes.reduce((map, note) => {
    map[note.name] = [...(map[note.name] || []), note];
    return map;
  }, {});
  const multiOptions = Object.values(byName).filter(items => items.length >= 2);
  const shouldAskMultiple = multiOptions.length > 0 && Math.random() < 0.38;

  if (shouldAskMultiple) {
    const positions = [...randomItem(multiOptions)]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .sort((a, b) => a.step - b.step);
    return {
      mode: "multiple",
      targetName: positions[0].name,
      positions,
      prompt: `请在下面标注出 ${staffTargetNameList(positions)} 的位置`,
      requiredCount: 2
    };
  }

  const position = randomItem(notes);
  return {
    mode: "single",
    targetName: position.name,
    positions: [position],
    prompt: `请在下面标注出 ${position.name}${position.octave}`,
    requiredCount: 1
  };
}

function staffPositionFromStep(clef, step) {
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const basePosition = clef === "treble" ? 4 * 7 + 2 : 2 * 7 + 4;
  const absolutePosition = basePosition + step;
  return {
    name: letters[((absolutePosition % 7) + 7) % 7],
    octave: Math.floor(absolutePosition / 7),
    step
  };
}

function numberedPitchInfo(position) {
  const note = noteOptions.find(item => item.name === position.name);
  const octaveOffset = position.octave - 4;
  return {
    number: note?.numbered || "",
    upperDots: Math.max(0, octaveOffset),
    lowerDots: Math.max(0, -octaveOffset)
  };
}

function numberedPitchMarkup(position) {
  const info = numberedPitchInfo(position);
  return `
    <span class="numbered-pitch" aria-label="简谱 ${info.number}${info.upperDots ? ` 上方 ${info.upperDots} 点` : ""}${info.lowerDots ? ` 下方 ${info.lowerDots} 点` : ""}">
      <span class="numbered-pitch-dots">${"•".repeat(info.upperDots)}</span>
      <strong>${info.number}</strong>
      <span class="numbered-pitch-dots">${"•".repeat(info.lowerDots)}</span>
    </span>
  `;
}

function numberedPitchText(position) {
  const info = numberedPitchInfo(position);
  if (info.upperDots === 1) return `${info.number}\u0307`;
  if (info.upperDots >= 2) return `${info.number}\u0308`;
  if (info.lowerDots === 1) return `${info.number}\u0323`;
  if (info.lowerDots >= 2) return `${info.number}\u0324`;
  return info.number;
}

function staffPitchText(position) {
  return `${position.name}${position.octave} · ${numberedPitchText(position)}`;
}

function staffTargetNameList(positions) {
  return positions.map(position => `${position.name}${position.octave}`).join("、");
}

function staffTargetSummary(question) {
  return question.positions.map(staffPitchText).join("、");
}

function staffTargetChipMarkup(question) {
  return question.positions
    .map(position => `<span>${position.name}${position.octave} = ${numberedPitchMarkup(position)}</span>`)
    .join("");
}

function staffMarkIsCorrect(mark, question) {
  return question.positions.some(position => position.step === mark.step);
}

function staffMarkY(step, bottomLineY, stepGap) {
  return bottomLineY - step * stepGap;
}

function staffLedgerLinesForMark(x, step, bottomLineY, stepGap) {
  const lines = [];
  if (step <= -2) {
    const lastLedgerStep = Math.floor(step / 2) * 2;
    for (let ledgerStep = -2; ledgerStep >= lastLedgerStep; ledgerStep -= 2) {
      const y = staffMarkY(ledgerStep, bottomLineY, stepGap);
      lines.push(`<line x1="${x - 24}" y1="${y}" x2="${x + 24}" y2="${y}" stroke="#333" stroke-width="1.7" />`);
    }
  }
  if (step >= 10) {
    const lastLedgerStep = Math.ceil(step / 2) * 2;
    for (let ledgerStep = 10; ledgerStep <= lastLedgerStep; ledgerStep += 2) {
      const y = staffMarkY(ledgerStep, bottomLineY, stepGap);
      lines.push(`<line x1="${x - 24}" y1="${y}" x2="${x + 24}" y2="${y}" stroke="#333" stroke-width="1.7" />`);
    }
  }
  return lines.join("");
}

function staffMarkFromSvgEvent(event) {
  const svg = event.target.closest("svg");
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const x = ((event.clientX - rect.left) / rect.width) * viewBox.width;
  const y = ((event.clientY - rect.top) / rect.height) * viewBox.height;
  const bottomLineY = Number(svg.dataset.bottomLineY);
  const stepGap = Number(svg.dataset.stepGap);
  const minStep = Number(svg.dataset.minStep);
  const maxStep = Number(svg.dataset.maxStep);
  const step = Math.max(minStep, Math.min(maxStep, Math.round((bottomLineY - y) / stepGap)));
  return {
    step,
    x: Math.max(128, Math.min(viewBox.width - 52, x))
  };
}

function getAllTheoryLevels() {
  return [...theoryLevels, ...buildImportedTheoryLevels()];
}

function getLevelShortTitle(level) {
  return level.shortTitle || levelShortTitles[level.id] || level.title.replace(/^识别|怎么|和/g, "").slice(0, 14);
}

const practiceLessons = [
  {
    level: "识谱",
    title: "五线谱不是背图，是坐标系统",
    body: "先用高音谱号第 2 线 G、低音谱号第 4 线 F、中央 C 三个锚点定位，再按线间一步步推音名。",
    visual: staffVisual("高音谱表：线 E G B D F", ["E4", "G4", "B4", "D5", "F5"]),
    points: ["先找锚点，再往上/下数", "线和间交替走，相邻位置差一个音级", "加线只是五线谱往外延伸，不是新规则"]
  },
  {
    level: "键盘",
    title: "音名、八度和真实按键",
    body: "同样是 C，C4、C5、C6 的音高不同。识谱和弹琴必须把音名、八度、键盘位置绑在一起。",
    visual: keyboardVisual(["C4", "D4", "E4", "F4", "G4", "A4", "B4"], "中央 C 开始建立键盘坐标"),
    points: ["白键按 C-D-E-F-G-A-B 循环", "黑键按升号/降号命名", "八度决定声音高低，不只是字母不同"]
  },
  {
    level: "简谱",
    title: "简谱是相对音级，不是固定琴键",
    body: "C 大调里 1=C，但换到 G 大调时 1=G。先用 C 大调入门，再理解调号为什么会改变 1 的位置。",
    visual: noteMapVisual(),
    points: ["1-7 是音阶级数", "上/下点表示高低八度", "换调以后 1 的实际键位会变"]
  },
  {
    level: "节奏",
    title: "节奏是时间坐标",
    body: "拍号告诉你每小节怎么数，时值告诉你每个音持续多久。先稳定，再速度。",
    visual: rhythmVisual(["1", "2", "3", "4"], "先数稳每一拍"),
    points: ["4/4 拍每小节 4 拍", "休止符也要数拍", "节拍器不是催你快，是检查你稳不稳"]
  },
  {
    level: "和声",
    title: "从音阶走到和弦",
    body: "旋律是横向的音，和弦是纵向的音。理解 1-3-5 后，很多流行伴奏会开始变清楚。",
    visual: chordVisual(),
    points: ["C 大调音阶先全用白键", "三和弦常取 1、3、5", "和弦进行决定歌曲的情绪走向"]
  },
  {
    level: "练法",
    title: "把知识变成手上的动作",
    body: "真正会弹不是看懂，而是能慢速、稳定、重复地做出来。每次只解决一个小问题。",
    visual: loopVisual(),
    points: ["先分手，再合手", "错在哪里就循环哪里", "慢练时动作正确，比快弹一遍更有价值"]
  }
];

const trustedResources = {
  theory: [
    {
      name: "musictheory.net Lessons",
      url: "https://www.musictheory.net/lessons",
      tag: "系统乐理",
      use: "按 staff、节奏、音阶、调号、音程、和弦逐级学；适合作为琴习乐理路线的主骨架。"
    },
    {
      name: "musictheory.net Exercises",
      url: "https://www.musictheory.net/exercises",
      tag: "识谱练习",
      use: "有音符识别、键盘识别、音程、和弦和听音训练；适合补“练一下才会”的部分。"
    },
    {
      name: "Musicca Lessons",
      url: "https://www.musicca.com/lessons",
      tag: "图文入门",
      use: "有 notes、staff、clefs、accidentals、intervals、chords、scales、keys 等模块，适合图文讲解参考。"
    },
    {
      name: "Musicca Exercises",
      url: "https://www.musicca.com/exercises",
      tag: "在线题库",
      use: "可练 notes、rhythms、intervals、chords、scales、key signatures，适合作为每日 5 分钟题库入口。"
    }
  ],
  practice: [
    {
      name: "Simply Piano",
      url: "https://www.hellosimply.com/simply-piano",
      tag: "即时反馈",
      use: "值得借鉴实时听音反馈、按水平分课、用喜欢的歌建立动力。"
    },
    {
      name: "flowkey",
      url: "https://www.flowkey.com/en",
      tag: "曲谱练习",
      use: "值得借鉴视频和乐谱同屏、慢速、循环片段、左右手分开练、等待模式。"
    },
    {
      name: "Yousician Piano",
      url: "https://yousician.com/piano",
      tag: "游戏化练习",
      use: "值得借鉴准确度和节奏反馈、关卡式课程、练习后给分。"
    },
    {
      name: "Hoffman Academy",
      url: "https://www.hoffmanacademy.com/",
      tag: "零基础课程",
      use: "适合参考从儿童和成人零基础都能理解的讲课顺序。"
    }
  ],
  scores: [
    {
      name: "IMSLP",
      url: "https://imslp.org/wiki/Main_Page",
      tag: "公共版权乐谱",
      use: "适合找古典原版谱、公共领域作品和作曲家目录；需要注意不同国家版权状态。"
    },
    {
      name: "Mutopia Project",
      url: "https://www.mutopiaproject.org/",
      tag: "可下载乐谱",
      use: "提供 LilyPond 排版的乐谱，常有 PDF、MIDI、源码，适合做可播放/可打印练习素材。"
    },
    {
      name: "Musopen",
      url: "https://musopen.org/",
      tag: "乐谱和录音",
      use: "适合把乐谱、录音和学习资料关联起来，做“先听再弹”的学习路径。"
    },
    {
      name: "MuseScore",
      url: "https://musescore.com/",
      tag: "现代曲谱社区",
      use: "曲目多，但授权和质量差异较大；更适合作为用户自己导入授权谱的参考来源。"
    }
  ]
};

const scorePieces = [
  {
    category: "古典入门",
    level: "第 1 课",
    title: "欢乐颂",
    artist: "贝多芬",
    meta: "C 大调 / 4/4 / 入门旋律片段",
    status: "可内置示例",
    notes: ["E4", "E4", "F4", "G4", "G4", "F4", "E4", "D4", "C4", "C4", "D4", "E4", "E4", "D4", "D4"],
    numbered: "3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3 2 2",
    tip: "适合练右手顺指和四拍稳定。先只弹旋律，左手伴奏以后再加。"
  },
  {
    category: "儿歌民谣",
    level: "第 2 课",
    title: "小星星",
    artist: "传统旋律",
    meta: "C 大调 / 4/4 / 入门旋律片段",
    status: "可内置示例",
    notes: ["C4", "C4", "G4", "G4", "A4", "A4", "G4", "F4", "F4", "E4", "E4", "D4", "D4", "C4"],
    numbered: "1 1 5 5 | 6 6 5 | 4 4 3 3 | 2 2 1",
    tip: "适合练大跳：从 1 跳到 5 时，手腕保持放松。"
  },
  {
    category: "古典入门",
    level: "第 3 课",
    title: "致爱丽丝",
    artist: "贝多芬",
    meta: "A 小调 / 3/8 / 主题动机片段",
    status: "可内置示例",
    notes: ["E4", "D#4", "E4", "D#4", "E4", "B3", "D4", "C4", "A3"],
    numbered: "5 #4 5 #4 | 5 7 2 1 6",
    tip: "这个比前两首难：有半音和小调感觉。先慢练前 9 个音。"
  },
  {
    category: "流行",
    level: "目标曲",
    title: "流行钢琴伴奏",
    artist: "通用练习",
    meta: "C / G / Am / F 和弦走向",
    status: "内置练习模板",
    notes: ["C4", "E4", "G4", "G3", "B3", "D4", "A3", "C4", "E4", "F3", "A3", "C4"],
    numbered: "C: 1 3 5 | G: 5 7 2 | Am: 6 1 3 | F: 4 6 1",
    tip: "很多流行歌会用类似和弦走向。先练分解和弦，再套到具体歌曲。"
  },
  {
    category: "电子",
    level: "版权曲目",
    title: "Fade",
    artist: "Alan Walker",
    meta: "电子 / 流行 / 适合节奏和和弦练习",
    status: "需导入授权乐谱",
    notes: [],
    numbered: "",
    tip: "这类现代作品不适合直接内置完整乐谱。可以后续加“上传 PDF/图片乐谱”，你有授权谱后在 App 里练。"
  },
  {
    category: "摇滚/金属",
    level: "目标曲",
    title: "重金属节奏型",
    artist: "通用练习",
    meta: "八分音符 / 强弱重音 / 左手根音",
    status: "内置练习模板",
    notes: ["E3", "E3", "E3", "G3", "E3", "E3", "E3", "A3"],
    numbered: "3 3 3 5 | 3 3 3 6",
    tip: "钢琴练金属感，重点是稳定八分音符和重音，不是只追求速度。"
  }
];

let currentScoreMode = "both";
let currentScoreCategory = "全部";
let appLearningStartedAt = Date.now();
let appLearningSeconds = 0;
let appLearningLastSavedMinute = 0;

const levelShortTitles = {
  notes: "自然音",
  "black-keys": "黑键音",
  "staff-note": "五线谱音符",
  "staff-ledger": "加线音",
  steps: "半音和全音",
  intervals: "常见音程",
  clefs: "谱号",
  rhythm: "节拍",
  duration: "音符时值",
  scales: "大调音阶",
  "key-signatures": "调号",
  chords: "三和弦"
};

const theoryCategories = [
  {
    id: "notes",
    title: "音符",
    summary: "读懂音名、键盘位置和五线谱位置，先把“弹哪个音”练稳。",
    action: "从自然音开始",
    levelIds: ["notes", "black-keys", "staff-note", "staff-ledger"],
    visual: staffVisual("音符：键盘和谱面坐标", ["C4", "E4", "G4"])
  },
  {
    id: "rhythms",
    title: "节奏",
    summary: "理解拍号、时值和休止，先能稳定数拍，再把节奏弹准。",
    action: "练节拍和时值",
    levelIds: ["rhythm", "duration"],
    visual: rhythmVisual(["1", "2", "3", "4"], "一小节里稳定数拍")
  },
  {
    id: "intervals",
    title: "音程",
    summary: "学会判断两个音之间的距离，为听音、和弦和旋律分析打底。",
    action: "认识音程距离",
    levelIds: ["steps", "intervals"],
    visual: staffVisual("音程：从距离开始理解", ["C4", "D4", "E4", "G4"])
  },
  {
    id: "chords",
    title: "和弦",
    summary: "从 1-3-5 的三和弦开始，理解歌曲背后的和声支撑。",
    action: "练三和弦",
    levelIds: ["chords"],
    visual: chordVisual()
  },
  {
    id: "scales",
    title: "音阶",
    summary: "从 C 大调到大调规律，建立手指、耳朵和谱面的共同路线。",
    action: "认识大调音阶",
    levelIds: ["scales"],
    visual: staffVisual("音阶：C 到下一个 C", ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"])
  },
  {
    id: "key-signatures",
    title: "调号",
    summary: "看懂谱号后的升降号，知道一首曲子默认哪些音会变化。",
    action: "看懂调号",
    levelIds: ["key-signatures", "clefs"],
    visual: keySignatureVisual()
  }
];

const els = {
  tabButtons: [...document.querySelectorAll("[data-tab]")],
  panels: [...document.querySelectorAll(".tab-panel")],
  theoryLevels: document.querySelector("#theoryLevels"),
  theoryCategories: document.querySelector("#theoryCategories"),
  theoryLevelDetail: document.querySelector("#theoryLevelDetail"),
  earPianoExplorer: document.querySelector("#earPianoExplorer"),
  earCourseTabs: document.querySelector("#earCourseTabs"),
  earCoursePanel: document.querySelector("#earCoursePanel"),
  practiceLessons: document.querySelector("#practiceLessons"),
  theoryResources: document.querySelector("#theoryResources"),
  practiceResources: document.querySelector("#practiceResources"),
  scoreResources: document.querySelector("#scoreResources"),
  scoreCategories: document.querySelector("#scoreCategories"),
  scoreList: document.querySelector("#scoreList"),
  scoreModes: [...document.querySelectorAll("[data-score-mode]")],
  importForm: document.querySelector("#importForm"),
  sourceUrl: document.querySelector("#sourceUrl"),
  sourceTitle: document.querySelector("#sourceTitle"),
  sourceText: document.querySelector("#sourceText"),
  sourceImage: document.querySelector("#sourceImage"),
  importMessage: document.querySelector("#importMessage"),
  importResults: document.querySelector("#importResults"),
  checkinForm: document.querySelector("#checkinForm"),
  practiceDate: document.querySelector("#practiceDate"),
  practiceMinutes: document.querySelector("#practiceMinutes"),
  practiceTopic: document.querySelector("#practiceTopic"),
  practiceNote: document.querySelector("#practiceNote"),
  formMessage: document.querySelector("#formMessage"),
  syncForm: document.querySelector("#syncForm"),
  syncEmail: document.querySelector("#syncEmail"),
  sendLoginLink: document.querySelector("#sendLoginLink"),
  verifyForm: document.querySelector("#verifyForm"),
  syncCode: document.querySelector("#syncCode"),
  verifyLoginCode: document.querySelector("#verifyLoginCode"),
  syncTitle: document.querySelector("#syncTitle"),
  syncStatus: document.querySelector("#syncStatus"),
  syncNow: document.querySelector("#syncNow"),
  signOut: document.querySelector("#signOut"),
  streakDays: document.querySelector("#streakDays"),
  totalCheckinDays: document.querySelector("#totalCheckinDays"),
  weekMinutes: document.querySelector("#weekMinutes"),
  totalMinutes: document.querySelector("#totalMinutes"),
  todayStatus: document.querySelector("#todayStatus"),
  todaySummary: document.querySelector("#todaySummary"),
  recordDays: document.querySelector("#recordDays"),
  avgMinutes: document.querySelector("#avgMinutes"),
  lastPractice: document.querySelector("#lastPractice"),
  recordsList: document.querySelector("#recordsList")
};

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function createEmptyAppData() {
  const hasRandomUUID = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
  return {
    version: appDataVersion,
    profile: {
      displayName: "本机用户",
      createdAt: new Date().toISOString()
    },
    records: [],
    lessonProgress: {},
    questionStats: {},
    imports: [],
    sync: {
      deviceId: hasRandomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      updatedAt: new Date().toISOString()
    }
  };
}

function readLegacyJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function normalizeRecord(record) {
  return {
    id: record.id || `${record.date || todayISO()}-${record.kind || "学习"}-${record.createdAt || Date.now()}`,
    date: record.date || todayISO(),
    minutes: Number(record.minutes) || 0,
    topic: record.topic || "未命名学习",
    mood: record.mood || "一般",
    kind: record.kind || "钢琴学习",
    note: record.note || "",
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || record.createdAt || new Date().toISOString()
  };
}

function getDeviceId(data = readAppData()) {
  const hasRandomUUID = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
  if (!data.sync) data.sync = {};
  if (!data.sync.deviceId) {
    data.sync.deviceId = hasRandomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  return data.sync.deviceId;
}

function normalizeQuestionStat(stat, fallbackDeviceId = "legacy") {
  const byDevice = {};
  if (stat?.byDevice && typeof stat.byDevice === "object") {
    Object.entries(stat.byDevice).forEach(([deviceId, deviceStat]) => {
      byDevice[deviceId] = {
        attempts: Number(deviceStat?.attempts) || 0,
        correct: Number(deviceStat?.correct) || 0,
        lastPracticedAt: deviceStat?.lastPracticedAt || null,
        revisionAt: deviceStat?.revisionAt || null
      };
    });
  } else if (stat) {
    byDevice[fallbackDeviceId] = {
      attempts: Number(stat.attempts) || 0,
      correct: Number(stat.correct) || 0,
      lastPracticedAt: stat.lastPracticedAt || null,
      revisionAt: stat.revisionAt || null
    };
  }

  const totals = Object.values(byDevice).reduce(
    (sum, item) => ({
      attempts: sum.attempts + (Number(item.attempts) || 0),
      correct: sum.correct + (Number(item.correct) || 0),
      lastPracticedAt:
        timestampValue(sum.lastPracticedAt) >= timestampValue(item.lastPracticedAt)
          ? sum.lastPracticedAt
          : item.lastPracticedAt || null
    }),
    { attempts: 0, correct: 0, lastPracticedAt: null }
  );

  return {
    ...totals,
    byDevice
  };
}

function migrateAppData() {
  const existing = readLegacyJson(appDataKey, null);
  if (existing && existing.version === appDataVersion) return existing;

  const data = createEmptyAppData();
  data.records = readLegacyJson(storageKey, []).map(normalizeRecord);
  data.imports = readLegacyJson(importStorageKey, []);
  data.lessonProgress = readLegacyJson(theoryProgressKey, {});
  data.sync.updatedAt = new Date().toISOString();
  localStorage.setItem(appDataKey, JSON.stringify(data));
  return data;
}

function readAppData() {
  return migrateAppData();
}

function writeAppData(data) {
  const nextData = {
    ...data,
    version: appDataVersion,
    sync: {
      ...(data.sync || {}),
      updatedAt: new Date().toISOString()
    }
  };
  localStorage.setItem(appDataKey, JSON.stringify(nextData));
  if (!isApplyingCloudData) scheduleCloudSync();
}

function readRecords() {
  return readAppData().records || [];
}

function readImports() {
  return readAppData().imports || [];
}

function readTheoryProgress() {
  return readAppData().lessonProgress || {};
}

function writeRecords(records) {
  const data = readAppData();
  data.records = records.map(normalizeRecord);
  writeAppData(data);
}

function upsertAppLearningRecord() {
  const now = Date.now();
  appLearningSeconds += Math.max(0, Math.floor((now - appLearningStartedAt) / 1000));
  appLearningStartedAt = now;
  const minutes = Math.max(1, Math.floor(appLearningSeconds / 60));
  if (minutes <= appLearningLastSavedMinute) return;

  const date = todayISO();
  const records = readRecords();
  const existing = records.find(record => record.date === date && record.kind === "APP学习");
  if (existing) {
    existing.minutes = minutes;
    existing.note = "自动记录：完成课时互动练习。";
    existing.updatedAt = new Date().toISOString();
  } else {
    records.push({
      id: `${date}-APP学习`,
      date,
      minutes,
      topic: "APP课时练习",
      mood: "自动",
      kind: "APP学习",
      note: "自动记录：完成课时互动练习。",
      createdAt: new Date().toISOString()
    });
  }

  appLearningLastSavedMinute = minutes;
  writeRecords(records.sort((a, b) => b.date.localeCompare(a.date)));
  renderStats();
}

function writeTheoryProgress(progress) {
  const data = readAppData();
  data.lessonProgress = progress;
  writeAppData(data);
}

function writeImports(items) {
  const data = readAppData();
  data.imports = items;
  writeAppData(data);
}

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!window.supabase || typeof window.supabase.createClient !== "function") return null;

  supabaseClient = window.supabase.createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  return supabaseClient;
}

function setSyncStatus(message) {
  if (els.syncStatus) els.syncStatus.textContent = message;
}

function getAppUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function getPendingSyncEmail() {
  return localStorage.getItem(pendingSyncEmailKey) || "";
}

function setPendingSyncEmail(email) {
  if (email) {
    localStorage.setItem(pendingSyncEmailKey, email);
    return;
  }
  localStorage.removeItem(pendingSyncEmailKey);
}

function withTimeout(promise, milliseconds, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function updateSyncUI(message) {
  const client = getSupabaseClient();
  if (!els.syncTitle) return;

  if (!client) {
    els.syncTitle.textContent = "云同步未加载";
    setSyncStatus("当前网络没有加载同步组件，仍可继续使用本地记录。");
    els.syncForm.hidden = false;
    els.syncNow.hidden = true;
    els.signOut.hidden = true;
    return;
  }

  if (currentUser) {
    els.syncTitle.textContent = `已登录：${currentUser.email || "当前账号"}`;
    setSyncStatus(message || "云同步已开启。打卡、学习进度和做题记录会自动保存到云端。");
    els.syncForm.hidden = true;
    els.verifyForm.hidden = true;
    els.syncNow.hidden = false;
    els.signOut.hidden = false;
    return;
  }

  const pendingEmail = getPendingSyncEmail();
  els.syncTitle.textContent = "未登录";
  setSyncStatus(message || "输入邮箱后会收到验证码。电脑和手机用同一个邮箱登录即可同步。");
  els.syncForm.hidden = false;
  els.verifyForm.hidden = !pendingEmail;
  if (pendingEmail && !els.syncEmail.value) els.syncEmail.value = pendingEmail;
  els.syncNow.hidden = true;
  els.signOut.hidden = true;
}

function normalizeAppData(data) {
  const empty = createEmptyAppData();
  const source = data || {};
  const fallbackDeviceId = source.sync?.deviceId || empty.sync.deviceId;
  const questionStats = {};
  Object.entries(source.questionStats || {}).forEach(([levelId, stat]) => {
    questionStats[levelId] = normalizeQuestionStat(stat, fallbackDeviceId);
  });
  return {
    ...empty,
    ...source,
    version: appDataVersion,
    profile: {
      ...empty.profile,
      ...(source.profile || {})
    },
    records: (source.records || []).map(normalizeRecord),
    lessonProgress: source.lessonProgress || {},
    questionStats,
    imports: source.imports || [],
    sync: {
      ...empty.sync,
      ...(source.sync || {})
    }
  };
}

function timestampValue(value) {
  return value ? new Date(value).getTime() || 0 : 0;
}

function mergeRecords(first, second) {
  const byId = new Map();
  [...(first || []), ...(second || [])].map(normalizeRecord).forEach(record => {
    const existing = byId.get(record.id);
    if (!existing || timestampValue(record.updatedAt || record.createdAt) >= timestampValue(existing.updatedAt || existing.createdAt)) {
      byId.set(record.id, record);
    }
  });
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function mergeImports(first, second) {
  const byKey = new Map();
  [...(first || []), ...(second || [])].forEach(item => {
    const key = item.id || item.url || `${item.title || "素材"}-${item.createdAt || ""}`;
    const existing = byKey.get(key);
    if (!existing || timestampValue(item.updatedAt || item.createdAt) >= timestampValue(existing.updatedAt || existing.createdAt)) {
      byKey.set(key, item);
    }
  });
  return [...byKey.values()].sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt));
}

function mergeQuestionStats(first, second) {
  const merged = {};
  const ids = new Set([...Object.keys(first || {}), ...Object.keys(second || {})]);
  ids.forEach(id => {
    const left = normalizeQuestionStat(first?.[id]);
    const right = normalizeQuestionStat(second?.[id]);
    const byDevice = {};
    new Set([...Object.keys(left.byDevice || {}), ...Object.keys(right.byDevice || {})]).forEach(deviceId => {
      const leftStat = left.byDevice?.[deviceId] || {};
      const rightStat = right.byDevice?.[deviceId] || {};
      byDevice[deviceId] = {
        attempts: Math.max(Number(leftStat.attempts) || 0, Number(rightStat.attempts) || 0),
        correct: Math.max(Number(leftStat.correct) || 0, Number(rightStat.correct) || 0),
        lastPracticedAt:
          timestampValue(leftStat.lastPracticedAt) >= timestampValue(rightStat.lastPracticedAt)
            ? leftStat.lastPracticedAt || null
            : rightStat.lastPracticedAt || null,
        revisionAt:
          timestampValue(leftStat.revisionAt) >= timestampValue(rightStat.revisionAt)
            ? leftStat.revisionAt || null
            : rightStat.revisionAt || null
      };
    });
    merged[id] = normalizeQuestionStat({ byDevice });
  });
  return merged;
}

function filterStatsAfterReset(stats, resetAt, revisionAt = {}) {
  const nextStats = {};
  Object.entries(stats || {}).forEach(([levelId, stat]) => {
    const normalized = normalizeQuestionStat(stat);
    const byDevice = {};
    const resetTime = timestampValue(typeof resetAt === "object" ? resetAt[levelId] : resetAt);
    const revisionTime = timestampValue(revisionAt?.[levelId]);
    Object.entries(normalized.byDevice || {}).forEach(([deviceId, deviceStat]) => {
      if (revisionTime) {
        if (timestampValue(deviceStat.revisionAt) >= revisionTime) byDevice[deviceId] = deviceStat;
        return;
      }
      if (!resetTime || timestampValue(deviceStat.lastPracticedAt) > resetTime) byDevice[deviceId] = deviceStat;
    });
    const nextStat = normalizeQuestionStat({ byDevice });
    if (nextStat.attempts > 0) nextStats[levelId] = nextStat;
  });
  return nextStats;
}

function filterProgressAfterReset(progress, stats, resetAt) {
  const nextProgress = {};
  Object.entries(progress || {}).forEach(([levelId, completed]) => {
    const resetTime = timestampValue(typeof resetAt === "object" ? resetAt[levelId] : resetAt);
    if (!resetTime) {
      if (completed) nextProgress[levelId] = true;
      return;
    }
    if (completed && stats?.[levelId]?.attempts) nextProgress[levelId] = true;
  });
  return nextProgress;
}

function mergeAppData(remoteData, localData) {
  const remote = normalizeAppData(remoteData);
  const local = normalizeAppData(localData);
  const learningResetAt =
    timestampValue(local.sync?.learningResetAt) >= timestampValue(remote.sync?.learningResetAt)
      ? local.sync?.learningResetAt
      : remote.sync?.learningResetAt;
  const levelResetAt = {};
  new Set([...Object.keys(remote.sync?.levelResetAt || {}), ...Object.keys(local.sync?.levelResetAt || {})]).forEach(levelId => {
    const remoteReset = remote.sync?.levelResetAt?.[levelId];
    const localReset = local.sync?.levelResetAt?.[levelId];
    levelResetAt[levelId] =
      timestampValue(localReset) >= timestampValue(remoteReset) ? localReset || null : remoteReset || null;
  });
  const levelStatRevisionAt = {};
  new Set([
    ...Object.keys(remote.sync?.levelStatRevisionAt || {}),
    ...Object.keys(local.sync?.levelStatRevisionAt || {})
  ]).forEach(levelId => {
    const remoteRevision = remote.sync?.levelStatRevisionAt?.[levelId];
    const localRevision = local.sync?.levelStatRevisionAt?.[levelId];
    levelStatRevisionAt[levelId] =
      timestampValue(localRevision) >= timestampValue(remoteRevision) ? localRevision || null : remoteRevision || null;
  });
  const resetMap = { ...levelResetAt };
  if (learningResetAt) {
    new Set([...Object.keys(remote.questionStats || {}), ...Object.keys(local.questionStats || {})]).forEach(levelId => {
      if (timestampValue(learningResetAt) > timestampValue(resetMap[levelId])) resetMap[levelId] = learningResetAt;
    });
  }
  const mergedStats = filterStatsAfterReset(
    mergeQuestionStats(remote.questionStats, local.questionStats),
    resetMap,
    levelStatRevisionAt
  );
  return {
    ...local,
    profile: {
      ...remote.profile,
      ...local.profile,
      email: currentUser?.email || local.profile.email || remote.profile.email
    },
    records: mergeRecords(remote.records, local.records),
    lessonProgress: filterProgressAfterReset(
      {
        ...remote.lessonProgress,
        ...local.lessonProgress
      },
      mergedStats,
      resetMap
    ),
    questionStats: mergedStats,
    imports: mergeImports(remote.imports, local.imports),
    sync: {
      ...local.sync,
      learningResetAt,
      levelResetAt,
      levelStatRevisionAt,
      updatedAt:
        timestampValue(local.sync?.updatedAt) >= timestampValue(remote.sync?.updatedAt)
          ? local.sync?.updatedAt
          : remote.sync?.updatedAt
    }
  };
}

function renderAll() {
  renderLessons();
  renderScores();
  renderImports();
  renderStats();
}

function scheduleCloudSync() {
  if (!currentUser || !getSupabaseClient()) return;
  window.clearTimeout(cloudSyncTimer);
  cloudSyncTimer = window.setTimeout(() => {
    saveCloudData("已自动同步到云端。").catch(error => {
      console.error(error);
      setSyncStatus("自动同步失败：请检查 Supabase 表是否已创建。");
    });
  }, 1000);
}

function startCloudAutoPull() {
  window.clearInterval(cloudPullTimer);
  if (!currentUser || !getSupabaseClient()) return;
  cloudPullTimer = window.setInterval(() => {
    loadCloudData({ silent: true }).catch(error => {
      console.error(error);
      setSyncStatus("自动同步失败：稍后会继续重试。");
    });
  }, 30000);
}

async function saveCloudData(successMessage = "已同步到云端。") {
  const client = getSupabaseClient();
  if (!client || !currentUser) return;

  const data = readAppData();
  data.profile = {
    ...(data.profile || {}),
    email: currentUser.email
  };

  const { error } = await client.from(cloudDataTable).upsert(
    {
      user_id: currentUser.id,
      data,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
  setSyncStatus(successMessage);
}

async function loadCloudData(options = {}) {
  const client = getSupabaseClient();
  if (!client || !currentUser) return;

  if (!options.silent) setSyncStatus("正在合并本机和云端数据...");
  const { data: row, error } = await client
    .from(cloudDataTable)
    .select("data, updated_at")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) throw error;

  const merged = row?.data ? mergeAppData(row.data, readAppData()) : normalizeAppData(readAppData());
  isApplyingCloudData = true;
  writeAppData(merged);
  isApplyingCloudData = false;
  renderAll();
  await saveCloudData(
    row?.data
      ? options.silent
        ? "已自动同步。"
        : "已合并电脑和手机数据。"
      : "已把本机数据上传到云端。"
  );
}

async function initCloudSync() {
  const client = getSupabaseClient();
  updateSyncUI();
  if (!client) return;

  const { data } = await client.auth.getSession();
  currentUser = data.session?.user || null;
  updateSyncUI();
  if (currentUser) {
    loadCloudData().catch(error => {
      console.error(error);
      setSyncStatus("云同步初始化失败：请先运行 Supabase 数据表 SQL。");
    });
    startCloudAutoPull();
  }

  client.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateSyncUI(currentUser ? "已登录，正在同步数据..." : "已退出登录，本机数据仍保留。");
    if (currentUser) {
      loadCloudData().catch(error => {
        console.error(error);
        setSyncStatus("同步失败：请确认 Supabase 数据表和权限策略已创建。");
      });
      startCloudAutoPull();
    } else {
      window.clearInterval(cloudPullTimer);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && currentUser) {
      loadCloudData({ silent: true }).catch(error => {
        console.error(error);
      });
    }
  });
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${date}T12:00:00`));
}

function keyboardVisual(keys, caption) {
  const whiteKeys = keys
    .map((key, index) => {
      const isSharp = key.includes("#");
      const x = index * 44 + 12;
      const y = isSharp ? 16 : 10;
      const height = isSharp ? 82 : 126;
      const fill = isSharp ? "#1f2a24" : "#fffdf8";
      const stroke = isSharp ? "#1f2a24" : "#d9cdbc";
      const textColor = isSharp ? "#fffdf8" : "#2e5f4d";
      return `
        <g>
          <rect x="${x}" y="${y}" width="38" height="${height}" rx="5" fill="${fill}" stroke="${stroke}" />
          <text x="${x + 19}" y="${isSharp ? 82 : 116}" text-anchor="middle" fill="${textColor}" font-size="14" font-weight="800">${key}</text>
        </g>
      `;
    })
    .join("");

  return `
    <figure class="visual-card">
      <svg viewBox="0 0 340 160" role="img" aria-label="${caption}">
        ${whiteKeys}
        <text x="170" y="150" text-anchor="middle" fill="#6f766f" font-size="13">${caption}</text>
      </svg>
    </figure>
  `;
}

function staffClefMarkup(clef, x, referenceLineY, staffSpace) {
  const glyph = clef === "bass" ? "&#xE062;" : "&#xE050;";
  return `<text class="staff-clef" x="${x}" y="${referenceLineY}" font-size="${staffSpace * 3.25}" fill="#1f2a24" aria-hidden="true">${glyph}</text>`;
}

function staffVisual(label, notes) {
  const width = Math.max(340, 120 + notes.length * 42);
  const yMap = {
    C3: 118,
    D3: 110,
    E3: 102,
    F3: 94,
    G3: 86,
    A3: 78,
    B3: 70,
    C4: 62,
    D4: 54,
    E4: 46,
    F4: 38,
    G4: 30,
    A4: 22,
    B4: 14
  };
  const circles = notes
    .map((note, index) => {
      const x = 78 + index * 42;
      const y = yMap[note] || 62;
      return `
        <g>
          <ellipse cx="${x}" cy="${y}" rx="12" ry="8" fill="#2e5f4d" transform="rotate(-16 ${x} ${y})" />
          <text x="${x}" y="142" text-anchor="middle" fill="#1f2a24" font-size="12" font-weight="800">${note}</text>
        </g>
      `;
    })
    .join("");
  const lines = [30, 46, 62, 78, 94]
    .map(y => `<line x1="42" y1="${y}" x2="${width - 36}" y2="${y}" stroke="#8f806d" stroke-width="1.4" />`)
    .join("");

  return `
    <figure class="visual-card">
      <svg viewBox="0 0 ${width} 160" role="img" aria-label="${label}">
        ${lines}
        <text x="44" y="24" fill="#bf8f54" font-size="13" font-weight="800">${label}</text>
        ${circles}
      </svg>
    </figure>
  `;
}

function noteMapVisual() {
  const notes = ["C=1", "D=2", "E=3", "F=4", "G=5", "A=6", "B=7"];
  return `
    <figure class="visual-card note-map">
      ${notes.map(note => `<span>${note}</span>`).join("")}
      <small>C 大调先这样对应；换调以后 1 的位置会变化。</small>
    </figure>
  `;
}

function rhythmVisual(beats, caption) {
  return `
    <figure class="visual-card beat-row">
      ${beats.map(beat => `<span>${beat}</span>`).join("")}
      <small>${caption}</small>
    </figure>
  `;
}

function chordVisual() {
  return `
    <figure class="visual-card chord-card">
      <div><strong>1</strong><span>C</span></div>
      <div><strong>3</strong><span>E</span></div>
      <div><strong>5</strong><span>G</span></div>
      <small>C 大三和弦：1、3、5 一起弹或分解弹。</small>
    </figure>
  `;
}

function keySignatureVisual() {
  return `
    <figure class="visual-card key-card">
      <span>C 大调：无升降号</span>
      <span>G 大调：F#</span>
      <span>F 大调：Bb</span>
      <small>调号像一首曲子的默认规则。</small>
    </figure>
  `;
}

function postureVisual() {
  return `
    <figure class="visual-card posture-check">
      <div><strong>1</strong><span>坐琴凳前半</span></div>
      <div><strong>2</strong><span>背自然直立</span></div>
      <div><strong>3</strong><span>肩膀放松</span></div>
      <div><strong>4</strong><span>手肘接近键盘高度</span></div>
      <small>先按这四点自查，比抽象人形图更实用。</small>
    </figure>
  `;
}

function handVisual() {
  return `
    <figure class="visual-card hand-card">
      <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      <small>手指编号：拇指是 1，小指是 5。</small>
    </figure>
  `;
}

function handsTogetherVisual() {
  return `
    <figure class="visual-card hands-card">
      <span>右手</span>
      <span>左手</span>
      <strong>合手</strong>
      <small>先分手练稳定，再用超慢速度合起来。</small>
    </figure>
  `;
}

function loopVisual() {
  return `
    <figure class="visual-card loop-card">
      <span>前一小节</span>
      <strong>错误点</strong>
      <span>后一小节</span>
      <small>只循环小片段，效率比从头弹更高。</small>
    </figure>
  `;
}

function noteToMidiName(note) {
  const match = String(note).match(/^([A-G])(#|b)?(\d)$/);
  if (!match) return null;
  const [, name, accidental = "", octaveText] = match;
  const natural = noteOptions.find(item => item.name === name);
  if (!natural) return null;
  const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const octave = Number(octaveText);
  return {
    name,
    accidental,
    octave,
    semitone: natural.semitone + accidentalOffset,
    midi: 12 * (octave + 1) + natural.semitone + accidentalOffset,
    numbered: natural.numbered
  };
}

function scoreStaff(notes) {
  const parsed = notes.map(noteToMidiName).filter(Boolean);
  const width = Math.max(680, parsed.length * 48 + 120);
  const bottomLineY = 128;
  const stepGap = 9;
  const noteToStep = note => {
    const letters = ["C", "D", "E", "F", "G", "A", "B"];
    return (note.octave - 4) * 7 + letters.indexOf(note.name) - 2;
  };
  const lines = [48, 68, 88, 108, 128]
    .map(y => `<line x1="48" y1="${y}" x2="${width - 34}" y2="${y}" stroke="#333" stroke-width="1.5" />`)
    .join("");
  const notesMarkup = parsed
    .map((note, index) => {
      const x = 128 + index * 48;
      const step = noteToStep(note);
      const y = bottomLineY - step * stepGap;
      const ledgers = [];
      if (step <= -2) {
        for (let ledgerStep = -2; ledgerStep >= step; ledgerStep -= 2) {
          const ledgerY = bottomLineY - ledgerStep * stepGap;
          ledgers.push(`<line x1="${x - 18}" y1="${ledgerY}" x2="${x + 18}" y2="${ledgerY}" stroke="#333" stroke-width="1.5" />`);
        }
      }
      if (step >= 10) {
        for (let ledgerStep = 10; ledgerStep <= step; ledgerStep += 2) {
          const ledgerY = bottomLineY - ledgerStep * stepGap;
          ledgers.push(`<line x1="${x - 18}" y1="${ledgerY}" x2="${x + 18}" y2="${ledgerY}" stroke="#333" stroke-width="1.5" />`);
        }
      }
      return `
        <g>
          ${ledgers.join("")}
          ${note.accidental ? `<text x="${x - 22}" y="${y + 5}" fill="#333" font-size="16" font-weight="800">${note.accidental}</text>` : ""}
          <ellipse cx="${x}" cy="${y}" rx="14" ry="9" fill="#2e5f4d" transform="rotate(-16 ${x} ${y})" />
          <text x="${x}" y="${y - 16}" text-anchor="middle" fill="#bf8f54" font-size="15" font-weight="900">${note.numbered}</text>
          <text x="${x}" y="168" text-anchor="middle" fill="#1f2a24" font-size="13" font-weight="800">${note.name}${note.accidental}${note.octave}</text>
        </g>
      `;
    })
    .join("");

  return `
    <figure class="visual-card score-staff">
      <svg viewBox="0 0 ${width} 186" role="img" aria-label="五线谱和简谱对照">
        ${lines}
        ${staffClefMarkup("treble", 50, 108, 20)}
        ${notesMarkup}
      </svg>
    </figure>
  `;
}

function getAccuracy(state) {
  if (!state.attempts) return `0%（0/0）`;
  return `${Math.round((state.correct / state.attempts) * 100)}%（${state.correct}/${state.attempts}）`;
}

function getStatSummary(state) {
  const attempts = Number(state?.attempts) || 0;
  const correct = Number(state?.correct) || 0;
  return `${correct}/${attempts}`;
}

function getPersistedLevelStats(levelId, fallback = { attempts: 0, correct: 0 }) {
  const stat = normalizeQuestionStat(readAppData().questionStats?.[levelId]);
  if (stat.attempts) return stat;
  return fallback;
}

function getDisplayLevelStats(levelId) {
  const ids = relatedLevelStatIds(levelId);
  if (ids.length === 1) return getPersistedLevelStats(levelId);
  return ids
    .filter(id => id !== levelId)
    .map(id => getPersistedLevelStats(id))
    .reduce(
      (sum, stat) => ({
        attempts: sum.attempts + (Number(stat.attempts) || 0),
        correct: sum.correct + (Number(stat.correct) || 0)
      }),
      { attempts: 0, correct: 0 }
    );
}

function staffStatsId(type, clef) {
  const base = type === "staffLedger" ? "staff-ledger" : "staff-note";
  return `${base}-${clef}`;
}

function relatedLevelStatIds(levelId) {
  if (levelId === "staff-note") return ["staff-note", "staff-note-treble", "staff-note-bass"];
  if (levelId === "staff-ledger") return ["staff-ledger", "staff-ledger-treble", "staff-ledger-bass"];
  return [levelId];
}

function updateStaffCompletion(baseLevelId) {
  const trebleStats = getPersistedLevelStats(`${baseLevelId}-treble`);
  const bassStats = getPersistedLevelStats(`${baseLevelId}-bass`);
  if (trebleStats.correct >= 5 && bassStats.correct >= 5) {
    completeDrillLevel(baseLevelId);
  }
}

function noteFrequency(note) {
  const info = note.semitone === undefined ? noteOptions.find(item => item.name === note.name) : note;
  const midi = 12 * (note.octave + 1) + info.semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

function getPianoAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!pianoAudioContext) pianoAudioContext = new AudioContext();
  return pianoAudioContext;
}

function decodePianoSample(context, arrayBuffer) {
  return new Promise((resolve, reject) => {
    context.decodeAudioData(arrayBuffer, resolve, reject);
  });
}

function fetchPianoSampleData(sample) {
  if (pianoSampleData.has(sample.url)) return Promise.resolve(pianoSampleData.get(sample.url));
  if (pianoSampleDataLoads.has(sample.url)) return pianoSampleDataLoads.get(sample.url);

  const load = fetch(sample.url)
    .then(response => {
      if (!response.ok) throw new Error(`钢琴采样加载失败：${response.status}`);
      return response.arrayBuffer();
    })
    .then(arrayBuffer => {
      pianoSampleData.set(sample.url, arrayBuffer);
      pianoSampleDataLoads.delete(sample.url);
      return arrayBuffer;
    })
    .catch(error => {
      pianoSampleDataLoads.delete(sample.url);
      throw error;
    });

  pianoSampleDataLoads.set(sample.url, load);
  return load;
}

function loadPianoSample(context, sample) {
  if (pianoSampleBuffers.has(sample.url)) return Promise.resolve(pianoSampleBuffers.get(sample.url));
  if (pianoSampleLoads.has(sample.url)) return pianoSampleLoads.get(sample.url);

  const load = fetchPianoSampleData(sample)
    .then(arrayBuffer => decodePianoSample(context, arrayBuffer.slice(0)))
    .then(buffer => {
      pianoSampleBuffers.set(sample.url, buffer);
      pianoSampleLoads.delete(sample.url);
      return buffer;
    })
    .catch(error => {
      pianoSampleLoads.delete(sample.url);
      throw error;
    });

  pianoSampleLoads.set(sample.url, load);
  return load;
}

function nearestPianoSample(midi) {
  return pianoSamples.reduce((closest, candidate) =>
    Math.abs(candidate.midi - midi) < Math.abs(closest.midi - midi) ? candidate : closest
  );
}

function pianoSamplesForGroup(groupId) {
  const notes = getEarGroupNotes(groupId, true);
  return [...new Map(notes.map(note => {
    const sample = nearestPianoSample(note.midi);
    return [sample.url, sample];
  })).values()];
}

function updateEarAudioStatus(message) {
  const status = els.earPianoExplorer?.querySelector("[data-ear-audio-status]");
  if (!status) return;
  status.textContent = message || (pianoWarmStatus === "ready" && pianoWarmGroupId === earState.groupId ? "音色已就绪" : "首次播放前会准备音色");
  status.classList.toggle("ready", pianoWarmStatus === "ready" && pianoWarmGroupId === earState.groupId);
}

function prefetchPianoGroup(groupId = "octave4") {
  return Promise.all(pianoSamplesForGroup(groupId).map(sample => fetchPianoSampleData(sample))).catch(error => {
    console.error("钢琴采样预取失败", error);
  });
}

async function warmPianoGroup(groupId = earState.groupId) {
  if (pianoWarmStatus === "ready" && pianoWarmGroupId === groupId) {
    updateEarAudioStatus();
    return;
  }

  pianoWarmGroupId = groupId;
  pianoWarmStatus = "loading";
  updateEarAudioStatus("音色准备中…");
  try {
    const context = getPianoAudioContext();
    if (!context) throw new Error("当前浏览器不支持音频播放");
    if (context.state === "suspended") await context.resume();
    await Promise.all(pianoSamplesForGroup(groupId).map(sample => loadPianoSample(context, sample)));
    if (pianoWarmGroupId === groupId) {
      pianoWarmStatus = "ready";
      updateEarAudioStatus("音色已就绪");
    }
  } catch (error) {
    if (pianoWarmGroupId === groupId) {
      pianoWarmStatus = "error";
      updateEarAudioStatus("音色准备失败，请再点一次");
    }
    console.error("钢琴音色准备失败", error);
  }
}

async function playPianoTone(freq) {
  const context = getPianoAudioContext();
  if (!context) return;
  if (context.state === "suspended") await context.resume();

  const targetMidi = 69 + 12 * Math.log2(freq / 440);
  const sample = nearestPianoSample(targetMidi);
  const buffer = await loadPianoSample(context, sample);
  const now = context.currentTime;

  if (currentPianoSource && currentPianoGain) {
    currentPianoGain.gain.cancelScheduledValues(now);
    currentPianoGain.gain.setValueAtTime(Math.max(currentPianoGain.gain.value, 0.0001), now);
    currentPianoGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    try {
      currentPianoSource.stop(now + 0.04);
    } catch {}
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(2 ** ((targetMidi - sample.midi) / 12), now);
  gain.gain.setValueAtTime(0.58, now);
  gain.gain.setValueAtTime(0.58, now + 1.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.05);
  source.connect(gain);
  gain.connect(context.destination);
  source.start(now);
  source.stop(now + 2.1);
  currentPianoSource = source;
  currentPianoGain = gain;
  source.addEventListener("ended", () => {
    if (currentPianoSource === source) {
      currentPianoSource = null;
      currentPianoGain = null;
    }
  });
}

function playTone(freq, isCorrect) {
  if (!isCorrect) return;
  playPianoTone(freq).catch(error => {
    updateEarAudioStatus("音频加载失败，请再点一次");
    console.error("钢琴采样播放失败", error);
  });
}

function midiToPianoNote(midi) {
  const name = pianoNoteNames[midi % 12];
  return {
    midi,
    name,
    octave: Math.floor(midi / 12) - 1,
    isBlack: name.includes("#"),
    frequency: 440 * 2 ** ((midi - 69) / 12)
  };
}

function getEarGroup(groupId = earState.groupId) {
  return earOctaveGroups.find(group => group.id === groupId) || earOctaveGroups[4];
}

function getEarGroupNotes(groupId = earState.groupId, includeBlack = false) {
  const group = getEarGroup(groupId);
  return Array.from({ length: group.maxMidi - group.minMidi + 1 }, (_, index) => midiToPianoNote(group.minMidi + index))
    .filter(note => includeBlack || !note.isBlack);
}

function shuffled(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function clearEarPlayback() {
  earPlaybackTimers.forEach(timer => window.clearTimeout(timer));
  earPlaybackTimers = [];
}

function playEarSequence(midis) {
  clearEarPlayback();
  midis.forEach((midi, index) => {
    const playMidi = () => {
      const note = midiToPianoNote(midi);
      playTone(note.frequency, true);
    };
    if (index === 0) {
      playMidi();
      return;
    }
    const timer = window.setTimeout(() => {
      playMidi();
    }, index * 820);
    earPlaybackTimers.push(timer);
  });
}

function earStatsId() {
  return earState.course === "staff" ? "ear-staff-C4" : `ear-${earState.course}-${earState.groupId}`;
}

function resetEarQuestion() {
  clearEarPlayback();
  earState.question = null;
  earState.status = "idle";
  earState.lastAnswer = null;
  earState.staffMark = null;
}

function ensureEarQuestion() {
  if (earState.question) return earState.question;

  if (earState.course === "single") {
    const target = randomItem(getEarGroupNotes());
    earState.question = { target };
  } else if (earState.course === "compare-basic" || earState.course === "compare") {
    const candidates = getEarGroupNotes(earState.groupId, earState.course === "compare");
    const count = Math.min(earState.compareCount, candidates.length);
    const notes = shuffled(candidates).slice(0, count);
    const direction = Math.random() < 0.5 ? "highest" : "lowest";
    const targetMidi = direction === "highest"
      ? Math.max(...notes.map(note => note.midi))
      : Math.min(...notes.map(note => note.midi));
    earState.question = {
      notes,
      direction,
      answerIndex: notes.findIndex(note => note.midi === targetMidi)
    };
  } else {
    const target = randomItem(getEarGroupNotes("octave4"));
    const naturalIndex = noteOptions.findIndex(note => note.name === target.name);
    earState.question = { target, step: naturalIndex - 2 };
  }

  return earState.question;
}

function earNoteMarkup(note) {
  const naturalName = note.name.replace("#", "");
  const numbered = note.isBlack ? "" : numberedPitchMarkup({ name: naturalName, octave: note.octave });
  return `<span class="ear-note-name"><strong>${note.name}${note.octave}</strong>${numbered ? `<span>${numbered}</span>` : ""}</span>`;
}

function buildPiano88Keys() {
  const whiteWidth = 34;
  const blackWidth = 22;
  let whiteIndex = 0;
  const keys = [];

  for (let midi = 21; midi <= 108; midi += 1) {
    const note = midiToPianoNote(midi);
    if (note.isBlack) {
      keys.push({ ...note, left: whiteIndex * whiteWidth - blackWidth / 2, whiteIndex: null });
    } else {
      keys.push({ ...note, left: whiteIndex * whiteWidth, whiteIndex });
      whiteIndex += 1;
    }
  }

  return { keys, whiteWidth, blackWidth, width: whiteIndex * whiteWidth };
}

function updateEarVisibleGroup(scroller, piano) {
  const center = scroller.scrollLeft + scroller.clientWidth / 2;
  const whiteIndex = Math.max(0, Math.min(51, Math.floor(center / piano.whiteWidth)));
  const centerKey = piano.keys.find(key => key.whiteIndex === whiteIndex);
  const group = earOctaveGroups.find(item => centerKey && centerKey.midi >= item.minMidi && centerKey.midi <= item.maxMidi);
  const label = scroller.closest(".ear-piano-tool")?.querySelector("[data-ear-visible-group]");
  if (group && label) label.textContent = `${group.label} · ${group.range}`;
}

function scrollEarPianoToGroup(groupId = earState.groupId, behavior = "auto") {
  const scroller = els.earPianoExplorer?.querySelector(".ear-keyboard-scroll");
  if (!scroller || scroller.clientWidth <= 0) return false;
  const piano = buildPiano88Keys();
  const group = getEarGroup(groupId);
  const groupWhites = piano.keys.filter(key => !key.isBlack && key.midi >= group.minMidi && key.midi <= group.maxMidi);
  const firstWhite = groupWhites[0];
  if (!firstWhite) return false;
  const groupWidth = groupWhites.length * piano.whiteWidth;
  const targetLeft = Math.max(0, Math.min(piano.width - scroller.clientWidth, firstWhite.left - (scroller.clientWidth - groupWidth) / 2));
  if (behavior === "auto") scroller.scrollLeft = targetLeft;
  else scroller.scrollTo({ left: targetLeft, behavior });
  updateEarVisibleGroup(scroller, piano);
  return true;
}

function positionEarPianoOnFirstVisible() {
  if (earPianoInitialPositioned) return;
  if (scrollEarPianoToGroup("octave4")) earPianoInitialPositioned = true;
}

function updateEarLandscapeButton() {
  const button = els.earPianoExplorer?.querySelector("[data-ear-landscape]");
  if (!button) return;
  const active = document.body.classList.contains("ear-landscape-mode");
  button.textContent = active ? "退出横屏" : "横屏";
  button.setAttribute("aria-pressed", String(active));
}

async function toggleEarLandscape() {
  const tool = els.earPianoExplorer?.querySelector(".ear-piano-tool");
  if (!tool) return;
  const active = document.body.classList.contains("ear-landscape-mode");

  if (active) {
    document.body.classList.remove("ear-landscape-mode");
    try {
      screen.orientation?.unlock?.();
      if (document.fullscreenElement) await document.exitFullscreen?.();
    } catch {}
    updateEarLandscapeButton();
    return;
  }

  document.body.classList.add("ear-landscape-mode");
  updateEarLandscapeButton();
  try {
    if (tool.requestFullscreen && !document.fullscreenElement) await tool.requestFullscreen();
    await screen.orientation?.lock?.("landscape");
  } catch {
    // iPhone 不开放横屏锁定 API，CSS 横向全屏模式仍会生效。
  }
}

function updateStaffLandscapeButtons() {
  document.querySelectorAll("[data-staff-landscape]").forEach(button => {
    const active = document.body.classList.contains("staff-landscape-mode");
    button.textContent = active ? "退出横屏" : "横屏练习";
    button.setAttribute("aria-pressed", String(active));
  });
}

async function toggleStaffLandscape(type) {
  const tool = document.querySelector(`[data-staff-tool="${type}"]`);
  if (!tool) return;
  const active = document.body.classList.contains("staff-landscape-mode");

  if (active) {
    document.body.classList.remove("staff-landscape-mode");
    try {
      screen.orientation?.unlock?.();
      if (document.fullscreenElement) await document.exitFullscreen?.();
    } catch {}
    updateStaffLandscapeButtons();
    return;
  }

  document.body.classList.add("staff-landscape-mode");
  updateStaffLandscapeButtons();
  try {
    if (tool.requestFullscreen && !document.fullscreenElement) await tool.requestFullscreen();
    await screen.orientation?.lock?.("landscape");
  } catch {
    // iPhone 添加到桌面时通常不开放横屏锁定 API，CSS 横向全屏模式仍会生效。
  }
}

function renderEarPianoExplorer() {
  if (!els.earPianoExplorer) return;
  const previousScroller = els.earPianoExplorer.querySelector(".ear-keyboard-scroll");
  const previousScrollLeft = previousScroller ? previousScroller.scrollLeft : null;
  const piano = buildPiano88Keys();
  const selectedGroup = getEarGroup();
  const ruler = earOctaveGroups
    .map(group => {
      const whites = piano.keys.filter(key => !key.isBlack && key.midi >= group.minMidi && key.midi <= group.maxMidi);
      const left = whites[0]?.left || 0;
      const width = whites.length * piano.whiteWidth;
      return `<div class="ear-octave-band ${group.id === earState.groupId ? "active" : ""}" style="left:${left}px;width:${width}px"><strong>${group.label}</strong><span>${group.range}</span></div>`;
    })
    .join("");
  const whiteKeys = piano.keys
    .filter(key => !key.isBlack)
    .map(key => {
      const isMiddleC = key.midi === 60;
      const isSelected = key.midi >= selectedGroup.minMidi && key.midi <= selectedGroup.maxMidi;
      return `<button class="ear-piano-key white ${isMiddleC ? "middle-c" : ""} ${isSelected ? "in-group" : ""}" style="left:${key.left}px;width:${piano.whiteWidth}px" type="button" data-ear-midi="${key.midi}" aria-label="播放 ${key.name}${key.octave}">
        ${key.name === "C" ? `<span>${isMiddleC ? "中央 C" : `C${key.octave}`}</span>` : ""}
      </button>`;
    })
    .join("");
  const blackKeys = piano.keys
    .filter(key => key.isBlack)
    .map(key => `<button class="ear-piano-key black" style="left:${key.left}px;width:${piano.blackWidth}px" type="button" data-ear-midi="${key.midi}" aria-label="播放 ${key.name}${key.octave}"></button>`)
    .join("");

  els.earPianoExplorer.innerHTML = `
    <section class="ear-piano-tool">
      <div class="ear-piano-toolbar">
        <div>
          <span>当前可视音组</span>
          <strong data-ear-visible-group>${selectedGroup.label} · ${selectedGroup.range}</strong>
          <small class="ear-audio-status ${pianoWarmStatus === "ready" && pianoWarmGroupId === earState.groupId ? "ready" : ""}" data-ear-audio-status>${pianoWarmStatus === "ready" && pianoWarmGroupId === earState.groupId ? "音色已就绪" : "首次播放前会准备音色"}</small>
        </div>
        <div class="ear-piano-toolbar-actions">
          <div class="ear-group-picker">
            <span>练习音组</span>
            <button class="ear-group-toggle" type="button" data-ear-group-menu aria-expanded="false">${selectedGroup.label}（${selectedGroup.range}）</button>
            <div class="ear-group-menu" data-ear-group-options hidden>
              ${earOctaveGroups.filter(group => group.maxMidi - group.minMidi >= 2).map(group => `<button class="${group.id === earState.groupId ? "active" : ""}" type="button" data-ear-group-option="${group.id}"><strong>${group.label}</strong><span>${group.range}</span></button>`).join("")}
            </div>
          </div>
          <button class="ghost-action ear-landscape-button" type="button" data-ear-landscape aria-pressed="false">横屏</button>
        </div>
      </div>
      <div class="ear-keyboard-scroll" aria-label="88键钢琴，可左右滑动">
        <div class="ear-keyboard-ruler" style="width:${piano.width}px">${ruler}</div>
        <div class="ear-keyboard" style="width:${piano.width}px">${whiteKeys}${blackKeys}</div>
      </div>
      <p class="ear-scroll-hint">左右滑动浏览 88 键；横屏时可以看到更多琴键。点任意琴键即可听音。</p>
    </section>
  `;

  const scroller = els.earPianoExplorer.querySelector(".ear-keyboard-scroll");
  scroller?.addEventListener("scroll", () => updateEarVisibleGroup(scroller, piano), { passive: true });
  updateEarLandscapeButton();
  if (scroller && previousScrollLeft !== null) {
    scroller.scrollLeft = previousScrollLeft;
    updateEarVisibleGroup(scroller, piano);
  } else if (!earPianoInitialPositioned) {
    window.requestAnimationFrame(positionEarPianoOnFirstVisible);
  }
}

function renderEarCourseTabs() {
  if (!els.earCourseTabs) return;
  els.earCourseTabs.innerHTML = earCourseDefinitions
    .map(course => `<button class="${course.id === earState.course ? "active" : ""}" type="button" data-ear-course="${course.id}"><span>${course.number}</span><strong>${course.title}</strong><small>${course.summary}</small></button>`)
    .join("");
}

function renderEarStats() {
  const stats = getPersistedLevelStats(earStatsId());
  return `<div class="ear-practice-stats"><span>本课统计</span><strong>${getAccuracy(stats)}</strong></div>`;
}

function renderEarSingleCourse(question) {
  const options = getEarGroupNotes();
  const feedback = earState.status === "idle"
    ? "先点播放，听清楚后再选择音名。"
    : earState.status === "correct"
      ? `答对了，这是 ${question.target.name}${question.target.octave}。`
      : `你选的是 ${midiToPianoNote(Number(earState.lastAnswer)).name}${midiToPianoNote(Number(earState.lastAnswer)).octave}，正确答案是 ${question.target.name}${question.target.octave}。`;
  return `
    <div class="ear-question-head">
      <div><span>课程 01</span><h4>听一个音，认出它</h4></div>
      ${renderEarStats()}
    </div>
    <div class="ear-listen-row"><button class="primary-action" type="button" data-ear-play>播放题目</button><span>${getEarGroup().label} · ${getEarGroup().range}</span></div>
    <div class="ear-answer-grid single">
      ${options.map(note => {
        const selected = Number(earState.lastAnswer) === note.midi;
        const stateClass = earState.status === "idle" || !selected ? "" : earState.status;
        return `<button class="${stateClass}" type="button" data-ear-answer-midi="${note.midi}" ${earState.status !== "idle" ? "disabled" : ""}>${earNoteMarkup(note)}</button>`;
      }).join("")}
    </div>
    <p class="ear-feedback ${earState.status}">${feedback}</p>
    ${earState.status !== "idle" ? `<button class="primary-action ear-next" type="button" data-ear-next>下一题</button>` : ""}
  `;
}

function displayPianoPitch(note) {
  return `${note.name.replace("#", "♯")}${note.octave}`;
}

function renderEarSequenceReveal(question) {
  if (earState.status === "idle") return "";
  const directionLabel = question.direction === "highest" ? "最高音" : "最低音";
  return `
    <div class="ear-sequence-reveal count-${question.notes.length}" aria-label="本题全部音高">
      ${question.notes.map((note, index) => {
        const previous = question.notes[index - 1];
        const relation = !previous ? "起始音" : note.midi > previous.midi ? "比前一个高" : "比前一个低";
        const isTarget = index === question.answerIndex;
        return `
          <div class="ear-sequence-note ${isTarget ? "target" : ""}">
            <span>第 ${index + 1} 个</span>
            <div>
              <strong>${displayPianoPitch(note)}</strong>
              ${note.isBlack ? "" : numberedPitchMarkup({ name: note.name, octave: note.octave })}
            </div>
            <small>${relation}</small>
            ${isTarget ? `<em>${directionLabel}</em>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderEarCompareCourse(question) {
  const course = earCourseDefinitions.find(item => item.id === earState.course);
  const isAdvanced = earState.course === "compare";
  const directionLabel = question.direction === "highest" ? "最高" : "最低";
  const answerNote = question.notes[question.answerIndex];
  const feedback = earState.status === "idle"
    ? `仔细听完整组音，再判断第几个音${directionLabel}。`
    : earState.status === "correct"
      ? `答对了，第 ${question.answerIndex + 1} 个音${directionLabel}。`
      : `正确答案是第 ${question.answerIndex + 1} 个音（${displayPianoPitch(answerNote)}）。`;
  return `
    <div class="ear-question-head">
      <div>
        <span>课程 ${course?.number || "02"}</span>
        <h4>哪个音${directionLabel}？</h4>
        <p>${isAdvanced ? "进阶：当前音组内会加入黑键。" : "基础：当前音组内只出现白键。"}</p>
      </div>
      ${renderEarStats()}
    </div>
    <div class="ear-compare-settings" aria-label="音符数量">
      <span>连续音数量</span>
      <button class="${earState.compareCount === 2 ? "active" : ""}" type="button" data-ear-count="2">2 个音</button>
      <button class="${earState.compareCount === 3 ? "active" : ""}" type="button" data-ear-count="3">3 个音</button>
    </div>
    <div class="ear-listen-row"><button class="primary-action" type="button" data-ear-play>依次播放</button><span>${getEarGroup().label} · ${getEarGroup().range}</span></div>
    <div class="ear-answer-grid compare">
      ${question.notes.map((note, index) => {
        const selected = Number(earState.lastAnswer) === index;
        const stateClass = earState.status === "idle" || !selected ? "" : earState.status;
        return `<button class="${stateClass}" type="button" data-ear-answer-index="${index}" ${earState.status !== "idle" ? "disabled" : ""}><strong>第 ${index + 1} 个</strong><span>音 ${index + 1}</span></button>`;
      }).join("")}
    </div>
    <p class="ear-feedback ${earState.status}">${feedback}</p>
    ${renderEarSequenceReveal(question)}
    ${earState.status !== "idle" ? `<button class="primary-action ear-next" type="button" data-ear-next>下一题</button>` : ""}
  `;
}

function renderEarStaffCourse(question) {
  const bottomLineY = 154;
  const stepGap = 12;
  const lines = [0, 2, 4, 6, 8].map(step => `<line x1="52" y1="${staffMarkY(step, bottomLineY, stepGap)}" x2="410" y2="${staffMarkY(step, bottomLineY, stepGap)}" stroke="#333" stroke-width="1.7" />`).join("");
  const mark = earState.staffMark;
  const markMarkup = mark ? (() => {
    const y = staffMarkY(mark.step, bottomLineY, stepGap);
    const correct = mark.step === question.step;
    return `${staffLedgerLinesForMark(mark.x, mark.step, bottomLineY, stepGap)}<ellipse cx="${mark.x}" cy="${y}" rx="18" ry="12" fill="${correct ? "#2e9b5f" : "#d93636"}" transform="rotate(-18 ${mark.x} ${y})" />`;
  })() : "";
  const correctionMarkup = earState.status === "wrong"
    ? `${staffLedgerLinesForMark(342, question.step, bottomLineY, stepGap)}<ellipse cx="342" cy="${staffMarkY(question.step, bottomLineY, stepGap)}" rx="18" ry="12" fill="#2e9b5f" transform="rotate(-18 342 ${staffMarkY(question.step, bottomLineY, stepGap)})" />`
    : "";
  const clickedPosition = mark ? staffPositionFromStep("treble", mark.step) : null;
  const feedback = earState.status === "idle"
    ? "播放题目后，点击最近的线或间。"
    : earState.status === "correct"
      ? `答对了，这是 ${question.target.name}${question.target.octave}。`
      : `红色是你标的 ${clickedPosition.name}${clickedPosition.octave}，绿色是正确的 ${question.target.name}${question.target.octave}。`;
  return `
    <div class="ear-question-head">
      <div><span>课程 04</span><h4>听音后标到五线谱</h4></div>
      ${renderEarStats()}
    </div>
    <div class="ear-listen-row"><button class="primary-action" type="button" data-ear-play>播放题目</button><span>第一阶段 · 小字一组</span></div>
    <div class="ear-staff-stage">
      <svg viewBox="0 0 450 220" role="img" aria-label="听音后点击高音谱表作答" data-ear-staff data-bottom-line-y="${bottomLineY}" data-step-gap="${stepGap}" data-min-step="-2" data-max-step="4">
        ${lines}
        ${staffClefMarkup("treble", 62, 130, 24)}
        ${markMarkup}${correctionMarkup}
      </svg>
    </div>
    <p class="ear-feedback ${earState.status}">${feedback}</p>
    ${earState.status !== "idle" ? `<button class="primary-action ear-next" type="button" data-ear-next>下一题</button>` : ""}
  `;
}

function renderEarCoursePanel() {
  if (!els.earCoursePanel) return;
  const question = ensureEarQuestion();
  const content = earState.course === "single"
    ? renderEarSingleCourse(question)
    : earState.course === "compare-basic" || earState.course === "compare"
      ? renderEarCompareCourse(question)
      : renderEarStaffCourse(question);
  els.earCoursePanel.innerHTML = `<section class="ear-practice-tool">${content}</section>`;
}

function renderEarTraining() {
  renderEarPianoExplorer();
  renderEarCourseTabs();
  renderEarCoursePanel();
}

function playCurrentEarQuestion() {
  const question = ensureEarQuestion();
  if (earState.course === "compare-basic" || earState.course === "compare") playEarSequence(question.notes.map(note => note.midi));
  else playEarSequence([question.target.midi]);
}

function answerEarSingle(midi) {
  if (earState.status !== "idle") return;
  const question = ensureEarQuestion();
  const isCorrect = midi === question.target.midi;
  earState.lastAnswer = midi;
  earState.status = isCorrect ? "correct" : "wrong";
  upsertAppLearningRecord();
  recordQuestionAttempt(earStatsId(), isCorrect);
  if (isCorrect) playEarSequence([question.target.midi]);
  renderEarCoursePanel();
}

function answerEarCompare(index) {
  if (earState.status !== "idle") return;
  const question = ensureEarQuestion();
  const isCorrect = index === question.answerIndex;
  earState.lastAnswer = index;
  earState.status = isCorrect ? "correct" : "wrong";
  upsertAppLearningRecord();
  recordQuestionAttempt(earStatsId(), isCorrect);
  renderEarCoursePanel();
}

function answerEarStaff(mark) {
  if (earState.status !== "idle" || !mark) return;
  const question = ensureEarQuestion();
  const isCorrect = mark.step === question.step;
  earState.staffMark = mark;
  earState.status = isCorrect ? "correct" : "wrong";
  upsertAppLearningRecord();
  recordQuestionAttempt(earStatsId(), isCorrect);
  if (isCorrect) playEarSequence([question.target.midi]);
  renderEarCoursePanel();
}

function nextEarQuestion() {
  resetEarQuestion();
  ensureEarQuestion();
  renderEarCoursePanel();
  playCurrentEarQuestion();
}

function renderPianoDrill() {
  ensureDrillQuestion("keyboard");
  const state = drillState.keyboard;
  const stats = getPersistedLevelStats("notes", state);
  const activeIndex = pianoWhiteKeys.findIndex(
    note => note.name === state.note.name && note.octave === state.note.octave
  );
  const keyWidth = 40;
  const keyboardWidth = pianoWhiteKeys.length * keyWidth;
  const blackKeys = pianoWhiteKeys
    .map((key, index) => ({ key, index }))
    .filter(({ key }) => !["E", "B"].includes(key.name))
    .slice(0, -1)
    .map(({ index }) => ({ x: index * keyWidth + 29 }));

  return `
    <section class="drill-card">
      <div class="drill-stats">
        <strong>${stats.correct}/${stats.attempts}</strong>
        <strong>${getAccuracy(stats)}</strong>
      </div>
      <div class="drill-stage ${state.status}">
        <svg class="drill-piano" viewBox="0 0 ${keyboardWidth} 210" role="img" aria-label="钢琴键盘认音练习">
          ${pianoWhiteKeys
            .map((note, index) => {
              const x = index * keyWidth;
              const isActive = index === activeIndex;
              return `
                <g>
                  <rect x="${x}" y="0" width="${keyWidth}" height="190" rx="5" fill="#fbfbfb" stroke="#9c9c9c" />
                  ${
                    isActive
                      ? `<circle class="drill-dot" cx="${x + keyWidth / 2}" cy="150" r="14" fill="${state.status === "correct" ? "#2e9b5f" : "#f12d2d"}" />`
                      : ""
                  }
                </g>
              `;
            })
            .join("")}
          ${blackKeys
            .map(key => `<rect x="${key.x}" y="0" width="28" height="118" rx="6" fill="#242629" />`)
            .join("")}
        </svg>
      </div>
      <div class="drill-options">
        ${noteOptions
          .map(
            note => {
              const buttonState =
                state.lastAnswer === note.name ? (state.status === "correct" ? "correct" : "wrong") : "";
              return `
              <button class="${buttonState}" data-drill-type="keyboard" data-drill-answer="${note.name}">
                <strong>${note.name}</strong>
                <span>${note.numbered} · ${["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"][noteOptions.indexOf(note)]}</span>
              </button>
            `;
            }
          )
          .join("")}
      </div>
      <p class="drill-hint">看红点落在哪个白键上，选择对应的 C-D-E-F-G-A-B。答对后自动下一题。</p>
    </section>
  `;
}

function renderBlackKeyDrill() {
  ensureDrillQuestion("black");
  const state = drillState.black;
  const stats = getPersistedLevelStats("black-keys", state);
  const keyWidth = 40;
  const keyboardWidth = pianoWhiteKeys.length * keyWidth;
  const correctName = state.naming === "sharp" ? state.note.sharp : state.note.flat;
  const feedback =
    state.status === "correct"
      ? `答对了：这个黑键是 ${correctName}。`
      : state.status === "wrong"
        ? `还不对，正确答案是 ${correctName}。`
        : `当前按${state.naming === "sharp" ? "升号" : "降号"}命名，选择红点所在黑键的音名。`;
  const options =
    state.naming === "sharp"
      ? ["C#", "D#", "F#", "G#", "A#"]
      : ["Db", "Eb", "Gb", "Ab", "Bb"];

  return `
    <section class="drill-card">
      <div class="drill-stats">
        <strong>${stats.correct}/${stats.attempts}</strong>
        <strong>${getAccuracy(stats)}</strong>
      </div>
      <div class="clef-switch">
        <button class="${state.naming === "sharp" ? "active" : ""}" data-black-naming="sharp">升号 #</button>
        <button class="${state.naming === "flat" ? "active" : ""}" data-black-naming="flat">降号 b</button>
      </div>
      <div class="drill-stage ${state.status}">
        <svg class="drill-piano" viewBox="0 0 ${keyboardWidth} 210" role="img" aria-label="黑键升降音练习">
          ${pianoWhiteKeys
            .map((note, index) => {
              const x = index * keyWidth;
              return `<rect x="${x}" y="0" width="${keyWidth}" height="190" rx="5" fill="#fbfbfb" stroke="#9c9c9c" />`;
            })
            .join("")}
          ${pianoBlackKeys
            .map(key => {
              const x = key.afterWhite * keyWidth + 26;
              const isActive =
                key.afterWhite === state.note.afterWhite && key.octave === state.note.octave;
              return `
                <g>
                  <rect x="${x}" y="0" width="28" height="118" rx="6" fill="#18191b" />
                  ${
                    isActive
                      ? `<circle class="drill-dot" cx="${x + 14}" cy="82" r="10" fill="${state.status === "correct" ? "#2e9b5f" : "#c8c8c8"}" />`
                      : ""
                  }
                </g>
              `;
            })
            .join("")}
        </svg>
      </div>
      <div class="drill-options black-options">
        ${options
          .map(option => {
            const buttonState =
              state.lastAnswer === option ? (state.status === "correct" ? "correct" : "wrong") : "";
            return `<button class="${buttonState}" data-drill-type="black" data-drill-answer="${option}"><strong>${option}</strong></button>`;
          })
          .join("")}
      </div>
      <p class="drill-hint">${feedback}</p>
    </section>
  `;
}

function renderStaffDrill(type = "staff") {
  ensureDrillQuestion(type);
  const state = drillState[type];
  const levelId = staffStatsId(type, state.clef);
  const stats = getPersistedLevelStats(levelId);
  const clefLabel = state.clef === "treble" ? "高音谱号" : "低音谱号";
  const question = state.question;
  const answeredPositions = (state.marks || []).map(mark => staffPositionFromStep(state.clef, mark.step));
  const feedback =
    state.status === "correct"
      ? `答对了。目标位置是 ${staffTargetSummary(question)}。`
      : state.status === "wrong"
        ? `本题目标是 ${staffTargetSummary(question)}；你标成了 ${answeredPositions.map(staffPitchText).join("、")}。请对照谱线查看红色落点。`
        : question.requiredCount === 2
          ? "依次点击两个位置，落点会自动吸附到最近的线或间。"
          : "点击五线谱上的线或间，落点会自动吸附到最近位置。";
  const bottomLineY = 172;
  const stepGap = 14;
  const lineStart = 64;
  const lineEnd = 636;
  const minStep = -4;
  const maxStep = 12;
  const lines = [0, 2, 4, 6, 8]
    .map(step => {
      const y = staffMarkY(step, bottomLineY, stepGap);
      return `<line x1="${lineStart}" y1="${y}" x2="${lineEnd}" y2="${y}" stroke="#333" stroke-width="1.7" />`;
    })
    .join("");
  const gradedWrong = state.status === "wrong";
  const answeredSteps = new Set((state.marks || []).map(mark => mark.step));
  const correctionMarks = gradedWrong
    ? question.positions
        .filter(position => !answeredSteps.has(position.step))
        .map((position, index, positions) => {
          const x = positions.length === 1 ? 510 : 468 + index * 84;
          const y = staffMarkY(position.step, bottomLineY, stepGap);
          const labelY = y <= 42 ? y + 36 : y >= 206 ? y - 30 : y - 30;
          const labelX = Math.max(92, Math.min(608, x));
          return `
            <g class="staff-correct-reference">
              ${staffLedgerLinesForMark(x, position.step, bottomLineY, stepGap)}
              <ellipse class="staff-note-dot" cx="${x}" cy="${y}" rx="19" ry="13" fill="#2e9b5f" transform="rotate(-18 ${x} ${y})" />
              <g class="staff-mark-label correct">
                <rect x="${labelX - 76}" y="${labelY - 15}" width="152" height="24" rx="5" />
                <text x="${labelX}" y="${labelY + 1}" text-anchor="middle">正确 ${staffPitchText(position)}</text>
              </g>
            </g>
          `;
        })
        .join("")
    : "";
  const marks = (state.marks || [])
    .map(mark => {
      const y = staffMarkY(mark.step, bottomLineY, stepGap);
      const position = staffPositionFromStep(state.clef, mark.step);
      const isGraded = state.status === "correct" || state.status === "wrong";
      const isMarkCorrect = staffMarkIsCorrect(mark, question);
      const fill = isGraded ? (isMarkCorrect ? "#2e9b5f" : "#d93636") : "#2f6a55";
      const labelY = y <= 42 ? y + 36 : y >= 206 ? y - 30 : y - 30;
      const labelX = Math.max(92, Math.min(608, mark.x));
      const label = `${isMarkCorrect ? "正确" : "标成"} ${staffPitchText(position)}`;
      return `
        <g class="staff-user-mark">
          ${staffLedgerLinesForMark(mark.x, mark.step, bottomLineY, stepGap)}
          <ellipse class="staff-note-dot" cx="${mark.x}" cy="${y}" rx="19" ry="13" fill="${fill}" transform="rotate(-18 ${mark.x} ${y})" />
          ${
            isGraded
              ? `<g class="staff-mark-label ${isMarkCorrect ? "correct" : "wrong"}">
                  <rect x="${labelX - 76}" y="${labelY - 15}" width="152" height="24" rx="5" />
                  <text x="${labelX}" y="${labelY + 1}" text-anchor="middle">${label}</text>
                </g>`
              : ""
          }
        </g>
      `;
    })
    .join("");

  return `
    <section class="drill-card staff-drill-card" data-staff-tool="${type}">
      <div class="drill-stats">
        <strong>${stats.correct}/${stats.attempts}</strong>
        <strong>${getAccuracy(stats)}</strong>
      </div>
      <div class="clef-switch">
        <button class="${state.clef === "treble" ? "active" : ""}" data-clef="treble" data-clef-drill="${type}">高音谱号</button>
        <button class="${state.clef === "bass" ? "active" : ""}" data-clef="bass" data-clef-drill="${type}">低音谱号</button>
      </div>
      <div class="staff-placement-prompt">
        <strong>${question.prompt}</strong>
        <span class="staff-target-chip">${staffTargetChipMarkup(question)}</span>
        <span>${question.requiredCount === 2 ? `${state.marks.length}/2 已标注` : "点击谱面作答"}</span>
      </div>
      <div class="staff-tool-actions">
        <button class="ghost-action" type="button" data-undo-staff="${type}" ${state.status !== "idle" || state.marks.length === 0 ? "disabled" : ""}>撤销上一个</button>
        <button class="ghost-action" type="button" data-staff-landscape="${type}" aria-pressed="${document.body.classList.contains("staff-landscape-mode")}">${document.body.classList.contains("staff-landscape-mode") ? "退出横屏" : "横屏练习"}</button>
      </div>
      <div class="drill-stage staff-placement-stage ${state.status}">
        <svg
          class="drill-staff staff-placement-svg ${state.status !== "idle" ? "graded" : ""}"
          viewBox="0 0 700 266"
          role="img"
          aria-label="${clefLabel}标注音符练习"
          data-staff-placement="${type}"
          data-bottom-line-y="${bottomLineY}"
          data-step-gap="${stepGap}"
          data-min-step="${minStep}"
          data-max-step="${maxStep}"
        >
          ${lines}
          ${staffClefMarkup(state.clef, 104, state.clef === "treble" ? 142 : 88, 28)}
          ${marks}${correctionMarks}
        </svg>
      </div>
      <p class="drill-hint">${feedback}</p>
      ${state.status === "correct" || state.status === "wrong" ? `<div class="staff-next-row"><button class="primary-action" data-next-staff="${type}">下一题</button></div>` : ""}
    </section>
  `;
}

function ensureChoiceQuestion(level) {
  const state = drillState.choice[level.id] || { question: null, status: "idle", correct: 0, attempts: 0 };
  if (!state.question) state.question = randomItem(level.questions);
  drillState.choice[level.id] = state;
  return state;
}

function renderChoiceDrill(level) {
  const state = ensureChoiceQuestion(level);
  const question = state.question;
  const stats = getPersistedLevelStats(level.id, state);

  return `
    <section class="drill-card choice-drill">
      <div class="drill-stats">
        <strong>${stats.correct}/${stats.attempts}</strong>
        <strong>${getAccuracy(stats)}</strong>
      </div>
      <div class="choice-prompt ${state.status}">
        ${level.visual}
        <h4>${question.prompt}</h4>
      </div>
      <div class="drill-options">
        ${question.options
          .map(option => {
            const buttonState =
              state.lastAnswer === option ? (state.status === "correct" ? "correct" : "wrong") : "";
            return `<button class="${buttonState}" data-choice-level="${level.id}" data-choice-answer="${option}"><strong>${option}</strong></button>`;
          })
          .join("")}
      </div>
      <p class="drill-hint">${state.feedback || "选一个答案，答对后会自动进入下一题。"}</p>
    </section>
  `;
}

function renderDrill(level) {
  if (level.drill === "keyboard") return renderPianoDrill();
  if (level.drill === "black") return renderBlackKeyDrill();
  if (level.drill === "staff") return renderStaffDrill("staff");
  if (level.drill === "staff-ledger") return renderStaffDrill("staffLedger");
  if (level.drill === "choice") return renderChoiceDrill(level);
  return "";
}

function renderLessons() {
  renderTheoryLevels();
  renderEarTraining();

  els.practiceLessons.innerHTML = practiceLessons
    .map(
      lesson => `
        <article class="practice-item">
          <span class="level-pill">${lesson.level}</span>
          ${lesson.visual}
          <h3>${lesson.title}</h3>
          <p>${lesson.body}</p>
          <ul>${lesson.points.map(point => `<li>${point}</li>`).join("")}</ul>
        </article>
      `
    )
    .join("");

  renderResources();
}

function renderTheoryCategories(allLevels, progress) {
  if (!els.theoryCategories) return;
  const levelMap = new Map(allLevels.map(level => [level.id, level]));
  const activeCategory =
    theoryCategories.find(category => category.levelIds.includes(activeTheoryLevelId)) || theoryCategories[0];

  els.theoryCategories.innerHTML = theoryCategories
    .map(category => {
      const levels = category.levelIds.map(id => levelMap.get(id)).filter(Boolean);
      const completed = levels.filter(level => progress[level.id]).length;
      return `
        <button class="theory-category-card ${category.id === activeCategory.id ? "active" : ""}" type="button" data-theory-category="${category.id}">
          <div>
            <span class="category-kicker">${completed}/${levels.length} 已掌握</span>
            <h3>${category.title}</h3>
            <p>${category.summary}</p>
          </div>
          <div class="category-visual" aria-hidden="true">${category.visual}</div>
          <strong>${category.action}</strong>
        </button>
      `;
    })
    .join("");
}

function renderTheoryLevels() {
  const allLevels = getAllTheoryLevels();
  const progress = readTheoryProgress();
  const allLevelIds = new Set(allLevels.map(level => level.id));
  const completed = Object.entries(progress).filter(([levelId, done]) => done && allLevelIds.has(levelId)).length;
  const activeLevel = allLevels.find(level => level.id === activeTheoryLevelId) || allLevels[0];
  const activeStats = getDisplayLevelStats(activeLevel.id);
  renderTheoryCategories(allLevels, progress);

  els.theoryLevels.innerHTML = `
    <div class="level-progress">
      <div>
        <strong>${completed}/${allLevels.length}</strong>
        <span>已完成关卡</span>
      </div>
      <button type="button" data-reset-learning>全清</button>
    </div>
    ${allLevels
      .map(
        (level, index) => {
          const stats = getDisplayLevelStats(level.id);
          return `
          <button class="level-button ${level.id === activeLevel.id ? "active" : ""}" data-level-id="${level.id}">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>${getLevelShortTitle(level)}</strong>
              <small>${stats.attempts ? `${Math.round((stats.correct / stats.attempts) * 100)}% · ${stats.correct}/${stats.attempts}` : level.group}</small>
            </div>
            <em>${progress[level.id] ? "已掌握" : "未完成"}</em>
          </button>
        `;
        }
      )
      .join("")}
  `;

  els.theoryLevelDetail.innerHTML = `
    <article class="level-card">
      <div class="level-card-head">
        <div>
          <span class="level-pill">${activeLevel.group}</span>
          <h3>${activeLevel.title}</h3>
          <p>${activeStats.attempts ? `当前统计：${getAccuracy(activeStats)}` : activeLevel.summary}</p>
        </div>
        <div class="level-actions">
          <button class="ghost-action compact-reset" type="button" data-repair-level="${activeLevel.id}">修正统计</button>
          <button class="ghost-action compact-reset" type="button" data-reset-level="${activeLevel.id}">重置本课</button>
        </div>
      </div>
      ${activeLevel.drill ? "" : activeLevel.visual}
      <details class="level-notes">
        <summary>本关要点和目录</summary>
        <div class="level-content-grid">
          <section>
            <h4>目录</h4>
            <ol>${activeLevel.contents.map(item => `<li>${item}</li>`).join("")}</ol>
          </section>
          <section>
            <h4>先记住</h4>
            <ul>${activeLevel.points.map(point => `<li>${point}</li>`).join("")}</ul>
          </section>
        </div>
      </details>
      ${
        activeLevel.drill
          ? renderDrill(activeLevel)
          : `<section class="quiz-card">
              <h4>小测验</h4>
              <p>${activeLevel.quiz.question}</p>
              <div class="quiz-options">
                ${activeLevel.quiz.options
                  .map(option => `<button data-quiz-answer="${option}" data-level-id="${activeLevel.id}">${option}</button>`)
                  .join("")}
              </div>
              <div class="quiz-feedback" id="quizFeedback">
                ${progress[activeLevel.id] ? `已完成。${activeLevel.quiz.explain}` : "选一个答案，马上看反馈。"}
              </div>
            </section>`
      }
    </article>
  `;
}

function answerTheoryQuiz(levelId, answer) {
  const level = theoryLevels.find(item => item.id === levelId);
  if (!level) return;

  const isCorrect = answer === level.quiz.answer;
  const feedback = document.querySelector("#quizFeedback");
  recordQuestionAttempt(levelId, isCorrect);
  if (isCorrect) {
    const progress = readTheoryProgress();
    progress[levelId] = true;
    writeTheoryProgress(progress);
    feedback.textContent = `答对了。${level.quiz.explain}`;
    feedback.classList.add("correct");
    renderTheoryLevels();
    return;
  }

  feedback.textContent = `还不对。${level.quiz.explain}`;
  feedback.classList.remove("correct");
}

function completeDrillLevel(levelId) {
  const progress = readTheoryProgress();
  progress[levelId] = true;
  writeTheoryProgress(progress);
}

function resetLearningProgress() {
  const confirmed = window.confirm("确认重置学习进度和做题统计吗？打卡日志、导入素材和账号登录不会删除。");
  if (!confirmed) return;
  const data = readAppData();
  const now = new Date().toISOString();
  const allStatIds = new Set([
    ...Object.keys(data.questionStats || {}),
    ...getAllTheoryLevels().flatMap(level => relatedLevelStatIds(level.id))
  ]);
  data.lessonProgress = {};
  data.questionStats = {};
  data.sync = {
    ...(data.sync || {}),
    learningResetAt: now,
    levelStatRevisionAt: {
      ...(data.sync?.levelStatRevisionAt || {}),
      ...Object.fromEntries([...allStatIds].map(statId => [statId, now]))
    }
  };
  writeAppData(data);
  Object.assign(drillState, {
    keyboard: { note: null, status: "idle", correct: 0, attempts: 0 },
    black: { note: null, naming: "sharp", status: "idle", correct: 0, attempts: 0 },
    staff: { clef: "treble", question: null, marks: [], status: "idle", correct: 0, attempts: 0 },
    staffLedger: { clef: "treble", question: null, marks: [], status: "idle", correct: 0, attempts: 0 },
    choice: {}
  });
  renderTheoryLevels();
  setSyncStatus("学习进度已重置，稍后会自动同步到云端。");
}

function resetLevelProgress(levelId) {
  const level = getAllTheoryLevels().find(item => item.id === levelId);
  if (!level) return;
  const confirmed = window.confirm(`确认重置“${level.title}”的做题数量和成功率吗？`);
  if (!confirmed) return;

  const data = readAppData();
  const now = new Date().toISOString();
  relatedLevelStatIds(levelId).forEach(statId => {
    delete data.lessonProgress[statId];
    delete data.questionStats[statId];
  });
  data.sync = {
    ...(data.sync || {}),
    levelResetAt: {
      ...(data.sync?.levelResetAt || {}),
      ...Object.fromEntries(relatedLevelStatIds(levelId).map(statId => [statId, now]))
    },
    levelStatRevisionAt: {
      ...(data.sync?.levelStatRevisionAt || {}),
      ...Object.fromEntries(relatedLevelStatIds(levelId).map(statId => [statId, now]))
    }
  };
  writeAppData(data);

  if (levelId === "notes") drillState.keyboard = { note: null, status: "idle", correct: 0, attempts: 0 };
  if (levelId === "black-keys") drillState.black = { note: null, naming: "sharp", status: "idle", correct: 0, attempts: 0 };
  if (levelId === "staff-note") drillState.staff = { clef: "treble", question: null, marks: [], status: "idle", correct: 0, attempts: 0 };
  if (levelId === "staff-ledger") drillState.staffLedger = { clef: "treble", question: null, marks: [], status: "idle", correct: 0, attempts: 0 };
  if (drillState.choice[levelId]) delete drillState.choice[levelId];

  renderTheoryLevels();
  setSyncStatus(`已重置“${level.title}”，稍后会自动同步到云端。`);
}

function repairLevelStats(levelId) {
  const level = getAllTheoryLevels().find(item => item.id === levelId);
  if (!level) return;

  const relatedStatIds = relatedLevelStatIds(levelId);
  if (relatedStatIds.length !== 1) {
    window.alert("这一课拆分了多个练习统计，请分别进入具体练习后修正。");
    return;
  }

  const statId = relatedStatIds[0];
  const currentStats = getPersistedLevelStats(statId);
  const input = window.prompt(
    `把“${level.title}”的统计修正为多少？\n格式：正确数/总题数，例如 ${getStatSummary(currentStats) || "520/560"}`,
    getStatSummary(currentStats)
  );
  if (input === null) return;

  const match = input.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) {
    window.alert("格式不对，请输入类似 520/560 的数字。");
    return;
  }

  const correct = Number(match[1]);
  const attempts = Number(match[2]);
  if (!Number.isInteger(correct) || !Number.isInteger(attempts) || attempts < 0 || correct < 0 || correct > attempts) {
    window.alert("数字不合理：正确数不能大于总题数。");
    return;
  }

  const data = readAppData();
  const deviceId = getDeviceId(data);
  const now = new Date().toISOString();
  const resetAt = new Date(Date.now() - 1000).toISOString();
  data.questionStats[statId] = normalizeQuestionStat(
    {
      byDevice: {
        [deviceId]: {
          attempts,
          correct,
          lastPracticedAt: now,
          revisionAt: now
        }
      }
    },
    deviceId
  );
  data.sync = {
    ...(data.sync || {}),
    levelResetAt: {
      ...(data.sync?.levelResetAt || {}),
      [statId]: resetAt
    },
    levelStatRevisionAt: {
      ...(data.sync?.levelStatRevisionAt || {}),
      [statId]: now
    }
  };
  if (correct >= 5) data.lessonProgress[statId] = true;
  else delete data.lessonProgress[statId];
  writeAppData(data);
  renderTheoryLevels();
  setSyncStatus(`已修正“${level.title}”统计，稍后会自动同步到云端。`);
}

function recordQuestionAttempt(levelId, isCorrect) {
  const data = readAppData();
  const deviceId = getDeviceId(data);
  const stats = normalizeQuestionStat(data.questionStats[levelId], deviceId);
  const deviceStats = stats.byDevice[deviceId] || {
    attempts: 0,
    correct: 0,
    lastPracticedAt: null
  };
  deviceStats.attempts += 1;
  if (isCorrect) deviceStats.correct += 1;
  deviceStats.lastPracticedAt = new Date().toISOString();
  deviceStats.revisionAt = data.sync?.levelStatRevisionAt?.[levelId] || deviceStats.revisionAt || null;
  stats.byDevice[deviceId] = deviceStats;
  data.questionStats[levelId] = normalizeQuestionStat(stats);
  writeAppData(data);
}

function answerStaffPlacement(type, mark) {
  const state = drillState[type];
  if (!state?.question || state.status !== "idle" || !mark) return;

  const question = state.question;
  const levelId = staffStatsId(type, state.clef);
  const baseStaffLevelId = type === "staffLedger" ? "staff-ledger" : "staff-note";

  if (question.requiredCount === 1) {
    state.marks = [mark];
  } else {
    const hasSameStep = state.marks.some(item => item.step === mark.step);
    if (!hasSameStep && state.marks.length < question.requiredCount) state.marks = [...state.marks, mark];
  }

  if (state.marks.length < question.requiredCount) {
    renderTheoryLevels();
    return;
  }

  upsertAppLearningRecord();
  const targetSteps = question.positions.map(position => position.step).sort((a, b) => a - b);
  const answerSteps = state.marks.map(item => item.step).sort((a, b) => a - b);
  const isCorrect =
    targetSteps.length === answerSteps.length &&
    targetSteps.every((step, index) => step === answerSteps[index]);

  state.attempts += 1;
  recordQuestionAttempt(levelId, isCorrect);

  if (isCorrect) {
    state.correct += 1;
    state.status = "correct";
    playTone(noteFrequency(question.positions[0]), true);
    updateStaffCompletion(baseStaffLevelId);
    renderTheoryLevels();
    return;
  }

  state.status = "wrong";
  renderTheoryLevels();
}

function undoStaffPlacement(type) {
  const state = drillState[type];
  if (!state || state.status !== "idle" || !state.marks.length) return;
  state.marks = state.marks.slice(0, -1);
  renderTheoryLevels();
}

function nextStaffPlacement(type) {
  const state = drillState[type];
  if (!state) return;
  state.question = null;
  state.marks = [];
  state.status = "idle";
  renderTheoryLevels();
}

function answerDrill(type, answer) {
  const state = drillState[type];
  const current = state.note;
  if (!current) return;
  if (state.status === "correct") return;
  upsertAppLearningRecord();

  const correctName = current.name;
  const blackCorrectName = type === "black" ? (state.naming === "sharp" ? current.sharp : current.flat) : null;
  const isCorrect = answer === (blackCorrectName || correctName);
  const levelId =
    type === "keyboard"
      ? "notes"
      : type === "black"
        ? "black-keys"
        : staffStatsId(type, state.clef);
  const baseStaffLevelId =
    type === "staffLedger" ? "staff-ledger" : type === "staff" ? "staff-note" : "";
  state.attempts += 1;
  state.lastAnswer = answer;
  recordQuestionAttempt(levelId, isCorrect);

  if (isCorrect) {
    state.correct += 1;
    state.status = "correct";
    playTone(noteFrequency(current), true);
    if (baseStaffLevelId) {
      updateStaffCompletion(baseStaffLevelId);
    } else if (state.correct >= 5) {
      completeDrillLevel(levelId);
    }
    renderTheoryLevels();
    setTimeout(() => {
      state.note = null;
      state.status = "idle";
      state.lastAnswer = null;
      renderTheoryLevels();
    }, 650);
    return;
  }

  state.status = "wrong";
  playTone(120, false);
  renderTheoryLevels();
  setTimeout(() => {
    state.status = "idle";
    state.lastAnswer = null;
    renderTheoryLevels();
  }, 420);
}

function answerChoiceDrill(levelId, answer) {
  const level = getAllTheoryLevels().find(item => item.id === levelId);
  if (!level) return;

  const state = ensureChoiceQuestion(level);
  if (state.status === "correct") return;
  const isCorrect = answer === state.question.answer;
  upsertAppLearningRecord();
  state.attempts += 1;
  state.lastAnswer = answer;
  state.status = isCorrect ? "correct" : "wrong";
  state.feedback = `${isCorrect ? "答对了。" : "还不对。"}${state.question.explain}`;
  recordQuestionAttempt(levelId, isCorrect);

  if (isCorrect) {
    state.correct += 1;
    playTone(523.25, true);
    if (state.correct >= 3) completeDrillLevel(levelId);
    renderTheoryLevels();
    setTimeout(() => {
      state.question = null;
      state.status = "idle";
      state.lastAnswer = null;
      state.feedback = "";
      renderTheoryLevels();
    }, 850);
    return;
  }

  playTone(120, false);
  renderTheoryLevels();
  setTimeout(() => {
    state.status = "idle";
    state.lastAnswer = null;
    renderTheoryLevels();
  }, 520);
}

function switchBlackNaming(naming) {
  drillState.black.naming = naming;
  drillState.black.note = null;
  drillState.black.status = "idle";
  drillState.black.lastAnswer = null;
  renderTheoryLevels();
}

function switchStaffClef(clef, type = "staff") {
  const state = drillState[type] || drillState.staff;
  state.clef = clef;
  state.question = null;
  state.marks = [];
  state.status = "idle";
  state.lastAnswer = null;
  renderTheoryLevels();
}

function renderResources() {
  const render = resources =>
    resources
      .map(
        resource => `
          <article class="resource-card">
            <span>${resource.tag}</span>
            <h4>${resource.name}</h4>
            <p>${resource.use}</p>
            <a href="${resource.url}" target="_blank" rel="noreferrer">打开资源</a>
          </article>
        `
      )
      .join("");

  els.theoryResources.innerHTML = render(trustedResources.theory);
  els.practiceResources.innerHTML = render(trustedResources.practice);
  els.scoreResources.innerHTML = render(trustedResources.scores);
}

function renderScores() {
  const categories = ["全部", ...new Set(scorePieces.map(piece => piece.category))];
  els.scoreCategories.innerHTML = categories
    .map(
      category => `
        <button class="category-chip ${category === currentScoreCategory ? "active" : ""}" data-score-category="${category}">
          ${category}
        </button>
      `
    )
    .join("");

  const visiblePieces =
    currentScoreCategory === "全部"
      ? scorePieces
      : scorePieces.filter(piece => piece.category === currentScoreCategory);

  els.scoreList.innerHTML = visiblePieces
    .map(piece => {
      const showStaff = currentScoreMode === "both" || currentScoreMode === "staff";
      const showNumbered = currentScoreMode === "both" || currentScoreMode === "numbered";
      const hasScore = piece.notes.length > 0;
      return `
        <article class="score-card">
          <div class="score-head">
            <span class="level-pill">${piece.level}</span>
            <div>
              <h3>${piece.title}</h3>
              <p>${piece.artist} · ${piece.meta}</p>
            </div>
          </div>
          <div class="score-status">${piece.category} · ${piece.status}</div>
          ${
            hasScore
              ? `
                <div class="score-views">
                  ${showStaff ? `<section><h4>五线谱 + 简谱数字</h4>${scoreStaff(piece.notes)}</section>` : ""}
                  ${
                    showNumbered
                      ? `<section><h4>简谱文本</h4><div class="numbered-score">${piece.numbered}</div></section>`
                      : ""
                  }
                </div>
              `
              : `
                <div class="import-panel">
                  <strong>先作为目标曲收藏</strong>
                  <p>等加入“上传乐谱”功能后，可以把你自己购买或获得授权的 PDF、图片乐谱导入这里练。</p>
                </div>
              `
          }
          <p class="score-tip">${piece.tip}</p>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-score-category]").forEach(button => {
    button.addEventListener("click", () => {
      currentScoreCategory = button.dataset.scoreCategory;
      renderScores();
    });
  });
}

function splitSourceText(text) {
  return text
    .split(/[\n。；;.!！?？]/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function analyzeSource(text) {
  return analyzeImportedSource({ text });
}

function buildTrainingQuestions(source) {
  const questions = [];
  const has = pattern => pattern.test(source);

  if (has(/五线谱|谱号|高音谱|低音谱|加线|线间/)) {
    questions.push(
      { prompt: "高音谱号第 2 线是什么音？", options: ["G", "F", "C"], answer: "G", explain: "高音谱号也叫 G 谱号，第 2 线是 G，也就是 sol。" },
      { prompt: "高音谱号下加一线是什么？", options: ["中央 C", "高音 C", "低音 F"], answer: "中央 C", explain: "高音谱号下加一线是中央 C，是入门识谱的重要定位点。" }
    );
  }

  if (has(/黑键|升号|降号|#|♯|b|♭/i)) {
    questions.push(
      { prompt: "C 右边的黑键可以叫什么？", options: ["C# / Db", "E# / Fb", "B# / Cb"], answer: "C# / Db", explain: "同一个黑键可按左边白键升高叫 C#，也可按右边白键降低叫 Db。" },
      { prompt: "升号 # 的含义是什么？", options: ["升高半音", "降低半音", "延长一拍"], answer: "升高半音", explain: "升号表示把当前音升高半音。" }
    );
  }

  if (has(/半音|全音/)) {
    questions.push(
      { prompt: "E 到 F 是什么距离？", options: ["半音", "全音", "八度"], answer: "半音", explain: "E 和 F 中间没有黑键，所以是半音。" },
      { prompt: "两个半音组成什么？", options: ["全音", "四分音符", "和弦"], answer: "全音", explain: "两个连续半音就是一个全音。" }
    );
  }

  if (has(/节拍|拍号|4\/4|节奏|时值|休止/)) {
    questions.push(
      { prompt: "4/4 拍通常一小节有几拍？", options: ["4 拍", "3 拍", "2 拍"], answer: "4 拍", explain: "4/4 拍的上方数字表示每小节 4 拍。" },
      { prompt: "遇到休止符应该怎样？", options: ["不弹但继续数拍", "跳过这一拍", "马上加速"], answer: "不弹但继续数拍", explain: "休止符也是节奏的一部分，手不弹，心里仍要数拍。" }
    );
  }

  if (has(/和弦|三和弦|135|1-3-5|C大|C 大/)) {
    questions.push(
      { prompt: "C 大三和弦是哪三个音？", options: ["C E G", "C D E", "D F A"], answer: "C E G", explain: "C 大三和弦由 1、3、5 级组成，也就是 C、E、G。" },
      { prompt: "三和弦最基础的级数关系是？", options: ["1 3 5", "1 2 3", "2 4 6"], answer: "1 3 5", explain: "先按音阶的 1、3、5 构成三和弦理解。" }
    );
  }

  if (has(/手型|指法|坐姿|放松|慢练|节拍器|分手|合手/)) {
    questions.push(
      { prompt: "新片段练不稳时，优先怎么做？", options: ["慢练小片段", "从头弹很快", "只看不弹"], answer: "慢练小片段", explain: "慢练和小片段循环更容易把动作固定下来。" },
      { prompt: "合手前更稳的步骤是？", options: ["先分手练", "直接加速", "只练右手"], answer: "先分手练", explain: "分手稳定以后再用很慢速度合手。" }
    );
  }

  if (!questions.length) {
    questions.push(
      { prompt: "只有链接时，下一步最有效的整理方式是什么？", options: ["补充字幕/截图/笔记", "直接背链接", "删除素材"], answer: "补充字幕/截图/笔记", explain: "纯前端网页无法直接读取小红书视频；补充可见文字后才能提取成具体乐理训练。" },
      { prompt: "导入素材最终应该变成什么？", options: ["可练习的知识点", "只收藏链接", "一个空卡片"], answer: "可练习的知识点", explain: "琴习会把文字内容整理成知识点和小测题，方便反复练。" }
    );
  }

  return questions.slice(0, 5);
}

function analyzeImportedSource({ text = "", title = "", url = "" }) {
  const source = [title, text, url].filter(Boolean).join("\n").trim();
  if (!source) {
    return {
      type: "待自动解析",
      theory: ["已保存链接。等接入视频读取、转写或你补充文字后，再提取乐理知识点。"],
      practice: ["可以先收藏这条素材，练琴前打开原链接观看。"],
      scoreDraft: "只有链接时无法判断是否包含琴谱。后续可接入视频转写、截图识别或手动补充。",
      training: buildTrainingQuestions("")
    };
  }

  const lines = splitSourceText(source);
  const lower = source.toLowerCase();
  const hasTheory = /五线谱|简谱|音阶|和弦|节拍|拍号|调号|升号|降号|半音|全音|谱号|音符/.test(source);
  const hasPractice = /手型|坐姿|放松|节拍器|慢练|双手|左手|右手|指法|练习|速度|错音/.test(source);
  const hasScore = /(^|[\s,，|:：])([1-7][#b]?|[a-g](#|b)?m?)(?=$|[\s,，|:：])|和弦|旋律|谱/.test(lower);

  return {
    type: hasScore ? "可能包含琴谱/和弦" : hasPractice ? "练琴技巧" : hasTheory ? "乐理知识" : "待整理素材",
    theory: hasTheory
      ? lines.filter(line => /五线谱|简谱|音阶|和弦|节拍|拍号|调号|升号|降号|半音|全音|谱号|音符/.test(line)).slice(0, 4)
      : ["先标记为素材，后续可补充具体乐理概念。"],
    practice: hasPractice
      ? lines.filter(line => /手型|坐姿|放松|节拍器|慢练|双手|左手|右手|指法|练习|速度|错音/.test(line)).slice(0, 4)
      : ["看完后用 10 分钟慢练验证，记录是否真的有效。"],
    scoreDraft: hasScore
      ? "检测到可能的音名、简谱数字、和弦或谱相关内容。建议下一步做“琴谱识别/手动校对”入口。"
      : "暂未检测到明显琴谱信息。",
    training: buildTrainingQuestions(source)
  };
}

function normalizeImportAnalysis(analysis, fallbackSource) {
  const local = analyzeImportedSource(fallbackSource);
  return {
    type: analysis?.type || local.type,
    theory: Array.isArray(analysis?.theory) && analysis.theory.length ? analysis.theory.slice(0, 6) : local.theory,
    practice: Array.isArray(analysis?.practice) && analysis.practice.length ? analysis.practice.slice(0, 6) : local.practice,
    scoreDraft: analysis?.scoreDraft || local.scoreDraft,
    training:
      Array.isArray(analysis?.training) && analysis.training.length
        ? analysis.training
            .filter(question => question?.prompt && Array.isArray(question.options) && question.answer)
            .slice(0, 8)
        : local.training
  };
}

async function requestBackendImportAnalysis(payload) {
  const client = getSupabaseClient();
  const headers = {
    "Content-Type": "application/json",
    apikey: supabasePublishableKey
  };
  if (client) {
    const { data } = await client.auth.getSession();
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  const response = await withTimeout(
    fetch(importAnalyzerEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    }),
    60000,
    "后端解析超时，已改用本地解析。"
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `后端解析失败：HTTP ${response.status}`);
  }
  const result = await response.json();
  return normalizeImportAnalysis(result.analysis || result, payload);
}

function titleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1] || parsed.hostname;
    return `小红书素材 ${lastPart.slice(0, 8)}`;
  } catch {
    return "小红书素材";
  }
}

function readImageAttachment(file) {
  if (!file) return Promise.resolve(null);
  const maxBytes = 700 * 1024;
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: file.size <= maxBytes ? dataUrl : "",
        note: file.size <= maxBytes ? "已保存图片预览。" : "图片太大，已记录文件名；建议截图裁剪后再导入。"
      });
    };
    reader.onerror = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: "", note: "图片读取失败。" });
    reader.readAsDataURL(file);
  });
}

function buildImportedTheoryLevels() {
  return readImports()
    .filter(item => item.analysis?.training?.length)
    .slice(0, 8)
    .map((item, index) => ({
      id: `import-${item.id || item.createdAt}`,
      group: "导入",
      title: item.title,
      shortTitle: `导入 ${index + 1}`,
      summary: `来自导入素材：${item.analysis.type}。先用这些题把内容变成可练的知识点。`,
      contents: ["素材重点", "小测题", "回到原链接复习"],
      visual: noteMapVisual(),
      points: [
        item.analysis.theory?.[0] || "先补充字幕、截图或你的笔记，再提取更准确的知识点。",
        item.analysis.practice?.[0] || "练琴前打开原链接回看关键动作。",
        "答题统计会和其他课时一起同步。"
      ],
      drill: "choice",
      questions: item.analysis.training
    }));
}

function renderImports() {
  const items = readImports();
  if (!items.length) {
    els.importResults.innerHTML = `<div class="empty-state">还没有导入内容。可以先粘贴一个小红书链接和你看到的重点。</div>`;
    return;
  }

  els.importResults.innerHTML = items
    .map(
      item => `
        <article class="import-card">
          <div class="record-meta">
            <span>${item.analysis.type}</span>
            <span>${formatDate(item.date)}</span>
          </div>
          <h3>${item.title}</h3>
          <a href="${item.url}" target="_blank" rel="noreferrer">打开原链接</a>
          ${
            item.image?.dataUrl
              ? `<figure class="import-image"><img src="${item.image.dataUrl}" alt="${item.image.name || "导入图片"}" /><figcaption>${item.image.note}</figcaption></figure>`
              : item.image?.name
                ? `<div class="import-panel"><strong>图片素材</strong><p>${item.image.name}：${item.image.note}</p></div>`
                : ""
          }
          <div class="import-grid">
            <section>
              <h4>乐理知识点</h4>
              <ul>${item.analysis.theory.map(point => `<li>${point}</li>`).join("")}</ul>
            </section>
            <section>
              <h4>练琴动作</h4>
              <ul>${item.analysis.practice.map(point => `<li>${point}</li>`).join("")}</ul>
            </section>
          </div>
          <div class="import-panel">
            <strong>琴谱草稿</strong>
            <p>${item.analysis.scoreDraft}</p>
          </div>
          <div class="import-panel">
            <strong>已生成练习</strong>
            <ul>${(item.analysis.training || []).map(question => `<li>${question.prompt}</li>`).join("")}</ul>
            <p>这些题会出现在学习页的“导入”关卡里。</p>
          </div>
        </article>
      `
    )
    .join("");
}

function calculateStreak(records) {
  const dates = getPracticeDates(records);
  if (!dates.length) return 0;

  let cursor = new Date(`${dates[0]}T12:00:00`);
  let streak = 0;

  while (dates.includes(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getPracticeDates(records) {
  return [...new Set(records.map(record => record.date).filter(Boolean))].sort((a, b) => b.localeCompare(a));
}

function weekTotal(records) {
  const now = new Date(`${todayISO()}T12:00:00`);
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);

  return records
    .filter(record => new Date(`${record.date}T12:00:00`) >= monday)
    .reduce((sum, record) => sum + record.minutes, 0);
}

function renderStats() {
  const records = readRecords().sort((a, b) => b.date.localeCompare(a.date));
  const total = records.reduce((sum, record) => sum + record.minutes, 0);
  const practiceDates = getPracticeDates(records);
  const todayRecord = records.find(record => record.date === todayISO());

  els.streakDays.textContent = `${calculateStreak(records)} 天`;
  els.totalCheckinDays.textContent = `${practiceDates.length} 天`;
  els.weekMinutes.textContent = `${weekTotal(records)} 分钟`;
  els.totalMinutes.textContent = `${total} 分钟`;
  els.recordDays.textContent = practiceDates.length;
  els.avgMinutes.textContent = practiceDates.length ? `${Math.round(total / practiceDates.length)} 分钟` : "0 分钟";
  els.lastPractice.textContent = records[0] ? formatDate(records[0].date) : "暂无";

  if (todayRecord) {
    els.todayStatus.textContent = `已打卡 ${todayRecord.minutes} 分钟`;
    els.todaySummary.textContent = `${todayRecord.kind || "学习"}：${todayRecord.topic}，感觉${todayRecord.mood}。${todayRecord.note || "保持这个节奏。"} `;
  } else {
    els.todayStatus.textContent = "还没有打卡";
    els.todaySummary.textContent = "练完以后记录一下内容和感受，明天会更容易接上。";
  }

  renderRecords(records);
}

function renderRecords(records) {
  if (!records.length) {
    els.recordsList.innerHTML = `<div class="empty-state">还没有练习记录。完成第一次打卡后，这里会显示你的学习轨迹。</div>`;
    return;
  }

  els.recordsList.innerHTML = records
    .map(
      record => `
        <article class="record-item">
          <div class="record-meta">
            <span>${formatDate(record.date)}</span>
            <span>${record.kind || "学习"}</span>
            <span>${record.minutes} 分钟</span>
            <span>${record.mood}</span>
          </div>
          <h3>${record.topic}</h3>
          <p>${record.note || "今天没有写备注。"}</p>
        </article>
      `
    )
    .join("");
}

function switchTab(tabId) {
  els.panels.forEach(panel => panel.classList.toggle("active", panel.id === tabId));
  els.tabButtons.forEach(button => button.classList.toggle("active", button.dataset.tab === tabId));
  if (tabId === "theory") {
    window.requestAnimationFrame(() => window.requestAnimationFrame(positionEarPianoOnFirstVisible));
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupEvents() {
  els.tabButtons.forEach(button => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) return;
    if (document.body.classList.contains("ear-landscape-mode")) {
      document.body.classList.remove("ear-landscape-mode");
      updateEarLandscapeButton();
    }
    if (document.body.classList.contains("staff-landscape-mode")) {
      document.body.classList.remove("staff-landscape-mode");
      updateStaffLandscapeButtons();
    }
  });

  els.scoreModes.forEach(button => {
    button.addEventListener("click", () => {
      currentScoreMode = button.dataset.scoreMode;
      els.scoreModes.forEach(item => item.classList.toggle("active", item === button));
      renderScores();
    });
  });

  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => switchTab(button.dataset.go));
  });

  els.earPianoExplorer?.addEventListener("click", event => {
    if (event.target.closest("[data-ear-landscape]")) {
      toggleEarLandscape();
      return;
    }

    const groupMenuButton = event.target.closest("[data-ear-group-menu]");
    if (groupMenuButton) {
      const menu = els.earPianoExplorer.querySelector("[data-ear-group-options]");
      const willOpen = menu?.hidden;
      if (menu) menu.hidden = !willOpen;
      groupMenuButton.setAttribute("aria-expanded", String(Boolean(willOpen)));
      return;
    }

    const groupOption = event.target.closest("[data-ear-group-option]");
    if (groupOption) {
      earState.groupId = groupOption.dataset.earGroupOption;
      resetEarQuestion();
      renderEarPianoExplorer();
      renderEarCoursePanel();
      warmPianoGroup(earState.groupId);
      window.requestAnimationFrame(() => scrollEarPianoToGroup(earState.groupId, "smooth"));
      return;
    }

    const key = event.target.closest("[data-ear-midi]");
    if (!key) return;
    const midi = Number(key.dataset.earMidi);
    warmPianoGroup(earState.groupId);
    playEarSequence([midi]);
    key.classList.add("pressed");
    window.setTimeout(() => key.classList.remove("pressed"), 180);
  });

  els.earCourseTabs?.addEventListener("click", event => {
    const button = event.target.closest("[data-ear-course]");
    if (!button) return;
    earState.course = button.dataset.earCourse;
    resetEarQuestion();
    renderEarCourseTabs();
    renderEarCoursePanel();
  });

  els.earCoursePanel?.addEventListener("click", event => {
    const staff = event.target.closest("[data-ear-staff]");
    if (staff) {
      answerEarStaff(staffMarkFromSvgEvent(event));
      return;
    }

    const playButton = event.target.closest("[data-ear-play]");
    if (playButton) {
      playCurrentEarQuestion();
      return;
    }

    const midiAnswer = event.target.closest("[data-ear-answer-midi]");
    if (midiAnswer) {
      answerEarSingle(Number(midiAnswer.dataset.earAnswerMidi));
      return;
    }

    const indexAnswer = event.target.closest("[data-ear-answer-index]");
    if (indexAnswer) {
      answerEarCompare(Number(indexAnswer.dataset.earAnswerIndex));
      return;
    }

    const countButton = event.target.closest("[data-ear-count]");
    if (countButton) {
      earState.compareCount = Number(countButton.dataset.earCount);
      resetEarQuestion();
      renderEarCoursePanel();
      return;
    }

    if (event.target.closest("[data-ear-next]")) nextEarQuestion();
  });

  els.theoryLevels.addEventListener("click", event => {
    const resetButton = event.target.closest("[data-reset-learning]");
    if (resetButton) {
      resetLearningProgress();
      return;
    }

    const button = event.target.closest("[data-level-id]");
    if (!button) return;
    activeTheoryLevelId = button.dataset.levelId;
    renderTheoryLevels();
    if (window.matchMedia("(max-width: 820px)").matches) {
      window.setTimeout(() => {
        els.theoryLevelDetail.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  });

  els.theoryCategories?.addEventListener("click", event => {
    const card = event.target.closest("[data-theory-category]");
    if (!card) return;
    const category = theoryCategories.find(item => item.id === card.dataset.theoryCategory);
    if (!category) return;
    activeTheoryLevelId = category.levelIds[0];
    renderTheoryLevels();
    document.querySelector("#learning-drills")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  els.theoryLevelDetail.addEventListener("click", event => {
    const nextStaffButton = event.target.closest("[data-next-staff]");
    if (nextStaffButton) {
      nextStaffPlacement(nextStaffButton.dataset.nextStaff);
      return;
    }

    const undoStaffButton = event.target.closest("[data-undo-staff]");
    if (undoStaffButton) {
      undoStaffPlacement(undoStaffButton.dataset.undoStaff);
      return;
    }

    const staffLandscapeButton = event.target.closest("[data-staff-landscape]");
    if (staffLandscapeButton) {
      toggleStaffLandscape(staffLandscapeButton.dataset.staffLandscape);
      return;
    }

    const staffPlacement = event.target.closest("[data-staff-placement]");
    if (staffPlacement) {
      answerStaffPlacement(staffPlacement.dataset.staffPlacement, staffMarkFromSvgEvent(event));
      return;
    }

    const repairLevelButton = event.target.closest("[data-repair-level]");
    if (repairLevelButton) {
      repairLevelStats(repairLevelButton.dataset.repairLevel);
      return;
    }

    const resetLevelButton = event.target.closest("[data-reset-level]");
    if (resetLevelButton) {
      resetLevelProgress(resetLevelButton.dataset.resetLevel);
      return;
    }

    const choiceButton = event.target.closest("[data-choice-answer]");
    if (choiceButton) {
      answerChoiceDrill(choiceButton.dataset.choiceLevel, choiceButton.dataset.choiceAnswer);
      return;
    }

    const drillButton = event.target.closest("[data-drill-answer]");
    if (drillButton) {
      answerDrill(drillButton.dataset.drillType, drillButton.dataset.drillAnswer);
      return;
    }

    const clefButton = event.target.closest("[data-clef]");
    if (clefButton) {
      switchStaffClef(clefButton.dataset.clef, clefButton.dataset.clefDrill);
      return;
    }

    const blackNamingButton = event.target.closest("[data-black-naming]");
    if (blackNamingButton) {
      switchBlackNaming(blackNamingButton.dataset.blackNaming);
      return;
    }

    const button = event.target.closest("[data-quiz-answer]");
    if (!button) return;
    answerTheoryQuiz(button.dataset.levelId, button.dataset.quizAnswer);
  });

  els.checkinForm.addEventListener("submit", event => {
    event.preventDefault();
    try {
      const date = els.practiceDate.value;
      const minutes = Number(els.practiceMinutes.value);
      const mood = new FormData(els.checkinForm).get("mood") || "一般";

      if (!date || !Number.isFinite(minutes) || minutes < 1) {
        els.formMessage.textContent = "请先填写有效日期和练习时长。";
        return;
      }

      const nextRecord = {
        id: `${date}-钢琴学习`,
        date,
        minutes,
        topic: els.practiceTopic.value,
        mood,
        kind: "钢琴学习",
        note: els.practiceNote.value.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const records = readRecords().filter(record => !(record.date === date && record.kind === "钢琴学习"));
      records.push(nextRecord);
      writeRecords(records.sort((a, b) => b.date.localeCompare(a.date)));

      els.formMessage.textContent = "已保存今天的练习记录。";
      renderStats();
    } catch (error) {
      els.formMessage.textContent = "保存失败：浏览器本地存储不可用，请刷新后再试。";
      console.error(error);
    }
  });

  els.importForm.addEventListener("submit", async event => {
    event.preventDefault();
    const text = els.sourceText.value.trim();
    const url = els.sourceUrl.value.trim();
    const title = els.sourceTitle.value.trim() || titleFromUrl(url);
    const createdAt = new Date().toISOString();
    els.importMessage.textContent = "正在解析素材...";
    const image = await readImageAttachment(els.sourceImage?.files?.[0]);
    const analysisPayload = {
      url,
      title,
      text: [text, image?.name ? `图片素材：${image.name}` : ""].filter(Boolean).join("\n"),
      image: image?.dataUrl ? { name: image.name, type: image.type, dataUrl: image.dataUrl } : null,
      requestedSource: "xiaohongshu"
    };
    let analysis;
    let usedBackend = false;
    try {
      analysis = await requestBackendImportAnalysis(analysisPayload);
      usedBackend = true;
    } catch (error) {
      console.warn(error);
      analysis = normalizeImportAnalysis(null, analysisPayload);
    }
    const item = {
      id: `import-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      url,
      title,
      text,
      image,
      date: todayISO(),
      createdAt,
      updatedAt: createdAt,
      analysis,
      backend: {
        used: usedBackend,
        endpoint: usedBackend ? importAnalyzerEndpoint : ""
      }
    };
    const items = readImports();
    items.unshift(item);
    writeImports(items);
    els.importMessage.textContent = usedBackend
      ? "后端已解析，并生成学习训练。"
      : "后端暂不可用，已用本地规则生成训练。";
    els.importForm.reset();
    renderImports();
    renderTheoryLevels();
  });

  els.syncForm.addEventListener("submit", async event => {
    event.preventDefault();
    const client = getSupabaseClient();
    const email = els.syncEmail.value.trim();
    if (!client) {
      setSyncStatus("同步组件没有加载成功，请检查网络后刷新。");
      return;
    }
    if (!email) return;

    setSyncStatus("正在发送验证码，手机网络慢时可能需要半分钟左右...");
    els.sendLoginLink.disabled = true;
    els.sendLoginLink.textContent = "发送中...";
    let result;
    try {
      result = await withTimeout(
        client.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: getAppUrl()
          }
        }),
        45000,
        "发送超时。手机网络到 Supabase 可能较慢，请切换 Wi-Fi 或稍后再试。"
      );
    } catch (error) {
      setSyncStatus(error.message);
      els.sendLoginLink.disabled = false;
      els.sendLoginLink.textContent = "重新发送验证码";
      return;
    }

    if (result.error) {
      setSyncStatus(`发送失败：${result.error.message}`);
      els.sendLoginLink.disabled = false;
      els.sendLoginLink.textContent = "重新发送验证码";
      return;
    }

    setPendingSyncEmail(email);
    els.verifyForm.hidden = false;
    els.syncCode.focus();
    setSyncStatus("验证码已发送。看邮箱里的数字验证码，回到这里输入即可登录。");
    els.sendLoginLink.disabled = false;
    els.sendLoginLink.textContent = "重新发送验证码";
  });

  els.verifyForm.addEventListener("submit", async event => {
    event.preventDefault();
    const client = getSupabaseClient();
    const email = getPendingSyncEmail() || els.syncEmail.value.trim();
    const token = els.syncCode.value.trim();
    if (!client || !email || !token) return;

    setSyncStatus("正在验证验证码...");
    els.verifyLoginCode.disabled = true;
    els.verifyLoginCode.textContent = "验证中...";

    let result;
    try {
      result = await withTimeout(
        client.auth.verifyOtp({
          email,
          token,
          type: "email"
        }),
        45000,
        "验证超时。请检查网络后再试一次。"
      );
    } catch (error) {
      setSyncStatus(error.message);
      els.verifyLoginCode.disabled = false;
      els.verifyLoginCode.textContent = "验证登录";
      return;
    }

    if (result.error) {
      setSyncStatus(`验证失败：${result.error.message}`);
      els.verifyLoginCode.disabled = false;
      els.verifyLoginCode.textContent = "验证登录";
      return;
    }

    currentUser = result.data.user;
    setPendingSyncEmail("");
    els.syncCode.value = "";
    els.verifyLoginCode.disabled = false;
    els.verifyLoginCode.textContent = "验证登录";
    updateSyncUI("登录成功，正在同步数据...");
    loadCloudData().catch(error => {
      console.error(error);
      setSyncStatus("登录成功，但同步失败：请稍后点立即同步。");
    });
  });

  els.signOut.addEventListener("click", async () => {
    const client = getSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
    currentUser = null;
    setPendingSyncEmail("");
    updateSyncUI("已退出登录，本机数据仍保留。");
  });

  els.syncNow.addEventListener("click", () => {
    loadCloudData().catch(error => {
      console.error(error);
      setSyncStatus("同步失败：请确认 Supabase 数据表和权限策略已创建。");
    });
  });
}

function init() {
  prefetchPianoGroup("octave4");
  els.practiceDate.value = todayISO();
  renderLessons();
  renderScores();
  renderImports();
  renderStats();
  setupEvents();
  document.addEventListener("pointerdown", () => warmPianoGroup("octave4"), { once: true, capture: true });
  initCloudSync();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").then(registration => {
      if (registration.waiting) registration.waiting.postMessage("SKIP_WAITING");
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage("SKIP_WAITING");
          }
        });
      });
    }).catch(() => {});

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (sessionStorage.getItem("qinxi_reloaded_for_update") === "1") return;
      sessionStorage.setItem("qinxi_reloaded_for_update", "1");
      window.location.reload();
    });
  }
}

init();
