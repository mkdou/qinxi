const storageKey = "qinx_practice_records_v1";
const importStorageKey = "qinx_imported_sources_v1";
const theoryProgressKey = "qinx_theory_progress_v1";
const appDataKey = "qinxi_app_data_v2";
const appDataVersion = 2;
const supabaseUrl = "https://rwrqumnbgxcqonpvfxqj.supabase.co";
const supabasePublishableKey = "sb_publishable_sStbbTzJvM_7ehaSUJBN9A_GJcG90Ee";
const cloudDataTable = "qinxi_user_data";
const pendingSyncEmailKey = "qinxi_pending_sync_email";

let supabaseClient = null;
let currentUser = null;
let isApplyingCloudData = false;
let cloudSyncTimer = null;

const theoryLevels = [
  {
    id: "notes",
    group: "Pitch",
    title: "识别音符在钢琴上的位置",
    summary: "看钢琴键上的红点，判断它是 C 到 B 里的哪个音。答对会变绿并发出对应音高。",
    contents: ["白键 C 到 B", "音名和简谱", "键盘位置"],
    visual: keyboardVisual(["C", "D", "E", "F", "G", "A", "B"], "白键按 C 到 B 循环，再回到 C"),
    points: ["钢琴白键是 7 个自然音反复循环", "C 大调里 C D E F G A B 对应 1 2 3 4 5 6 7", "先记白键顺序，再理解升降号"],
    drill: "keyboard"
  },
  {
    id: "black-keys",
    group: "Pitch",
    title: "识别黑键升降音",
    summary: "黑键有两种常见叫法：可以按左边白键升高命名，也可以按右边白键降低命名。",
    contents: ["升号 #", "降号 b", "同一个黑键的两种名字"],
    visual: keyboardVisual(["C", "C#", "D", "D#", "E", "F", "F#"], "黑键可以用升号或降号命名"),
    points: ["C# 和 Db 是同一个黑键", "D# 和 Eb 是同一个黑键", "F# 和 Gb、G# 和 Ab、A# 和 Bb 也是同音异名"],
    drill: "black"
  },
  {
    id: "staff-note",
    group: "Notation",
    title: "识别五线谱上的音",
    summary: "在高音谱号或低音谱号里随机出现一个音符，选择正确的音名和简谱音级。",
    contents: ["高音谱号", "低音谱号", "简谱高低音点"],
    visual: staffVisual("高音谱号 C 到 G", ["C4", "D4", "E4", "F4", "G4"]),
    points: ["谱上越高，实际音越高", "高音谱号第 2 线是 G", "低音谱号第 4 线是 F"],
    drill: "staff"
  },
  {
    id: "steps",
    group: "Pitch",
    title: "半音和全音",
    summary: "理解相邻琴键的距离，是以后看升降号、音阶和和弦的基础。",
    contents: ["半音", "全音", "升号和降号"],
    visual: keyboardVisual(["C", "C#", "D", "D#", "E", "F", "F#"], "相邻琴键是半音，两个半音是全音"),
    points: ["相邻两个琴键的距离是半音", "两个半音组成一个全音", "E-F、B-C 中间没有黑键，所以它们本身就是半音"],
    quiz: {
      question: "下面哪一组在钢琴上是半音？",
      options: ["E 到 F", "C 到 D", "F 到 G"],
      answer: "E 到 F",
      explain: "E 和 F 中间没有黑键，是相邻琴键，所以是半音。"
    }
  },
  {
    id: "clefs",
    group: "Notation",
    title: "高音谱号和低音谱号",
    summary: "钢琴常用大谱表：右手多看高音谱号，左手多看低音谱号。",
    contents: ["高音谱号", "低音谱号", "左右手音区"],
    visual: noteMapVisual(),
    points: ["高音谱号常对应右手和较高音区", "低音谱号常对应左手和较低音区", "同一个音符位置在不同谱号里可能代表不同音"],
    quiz: {
      question: "初学钢琴时，低音谱号通常更常给哪只手看？",
      options: ["左手", "右手", "两只脚"],
      answer: "左手",
      explain: "钢琴大谱表中，低音谱号通常负责左手的低音区。"
    }
  },
  {
    id: "rhythm",
    group: "Rhythm",
    title: "节拍和拍号",
    summary: "节拍决定音乐怎么走路。先数稳，再弹准。",
    contents: ["小节", "4/4 拍", "强弱规律"],
    visual: rhythmVisual(["1", "2", "3", "4"], "4/4 拍：一小节数四下"),
    points: ["4/4 拍表示每小节有 4 拍", "四分音符通常算一拍", "练琴时先能稳定数拍，再追求速度"],
    quiz: {
      question: "4/4 拍通常表示一小节有几拍？",
      options: ["4 拍", "3 拍", "8 拍"],
      answer: "4 拍",
      explain: "4/4 拍的上方数字 4 表示每小节有 4 拍。"
    }
  },
  {
    id: "duration",
    group: "Rhythm",
    title: "音符时值",
    summary: "音符不只告诉你弹哪个音，也告诉你弹多久。",
    contents: ["全音符", "二分音符", "四分音符", "八分音符"],
    visual: rhythmVisual(["全音符 4 拍", "二分 2 拍", "四分 1 拍", "八分 1/2 拍"], "先理解长度，再看谱弹"),
    points: ["四分音符常作为一拍", "二分音符通常持续两拍", "休止符表示不弹，但仍然要在心里数拍"],
    quiz: {
      question: "在常见 4/4 拍里，二分音符通常持续几拍？",
      options: ["2 拍", "1 拍", "4 拍"],
      answer: "2 拍",
      explain: "二分音符通常持续 2 拍，四分音符通常持续 1 拍。"
    }
  },
  {
    id: "chords",
    group: "Structure",
    title: "音阶和三和弦",
    summary: "很多歌曲不是只靠单音旋律，也靠和弦支撑情绪。",
    contents: ["C 大调音阶", "1-3-5", "三和弦"],
    visual: chordVisual(),
    points: ["C 大调音阶全用白键", "三和弦通常取音阶里的 1、3、5", "C 大三和弦由 C、E、G 组成"],
    quiz: {
      question: "C 大三和弦由哪三个音组成？",
      options: ["C E G", "C D E", "D F A"],
      answer: "C E G",
      explain: "C 大三和弦取 C 大调里的 1、3、5，也就是 C、E、G。"
    }
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
    { name: "A", octave: 5, step: 10, ledger: "above" }
  ],
  bass: [
    { name: "E", octave: 2, step: -4, ledger: "below" },
    { name: "F", octave: 2, step: -3 },
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
    { name: "C", octave: 4, step: 10, ledger: "above" }
  ]
};

const drillState = {
  keyboard: { note: null, status: "idle", correct: 0, attempts: 0 },
  black: { note: null, naming: "sharp", status: "idle", correct: 0, attempts: 0 },
  staff: { clef: "treble", note: null, status: "idle", correct: 0, attempts: 0 }
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
  if (type === "staff" && !drillState.staff.note) {
    drillState.staff.note = randomItem(staffDrillNotes[drillState.staff.clef]);
  }
}

const practiceLessons = [
  {
    level: "五线谱",
    title: "高音谱表线间规律",
    body: "高音谱号中，第 1 线到第 5 线依次是 E、G、B、D、F；第 1 间到第 4 间依次是 F、A、C、E。",
    visual: staffVisual("高音谱表：线 E G B D F", ["E4", "G4", "B4", "D5", "F5"]),
    points: ["第 2 线是 G，也就是 sol", "下加一线是中央 C", "线与线、间与间都按隔一个音循环"]
  },
  {
    level: "五线谱",
    title: "低音谱表线间规律",
    body: "低音谱号中，第 1 线到第 5 线依次是 G、B、D、F、A；第 1 间到第 4 间依次是 A、C、E、G。",
    visual: staffVisual("低音谱表：线 G B D F A", ["G2", "B2", "D3", "F3", "A3"]),
    points: ["低音谱号第 4 线是 F", "上加一线附近是中央 C", "左手识谱先从低音谱表开始定位"]
  },
  {
    level: "简谱",
    title: "数字和音区点",
    body: "C 大调里 1-7 对应 C-D-E-F-G-A-B。数字上方点表示高八度，下方点表示低八度。",
    visual: noteMapVisual(),
    points: ["无点常表示中音区", "上方一个点表示高一组", "下方一个点表示低一组"]
  },
  {
    level: "键盘",
    title: "中央 C 与两组键盘",
    body: "本应用练习器的 15 个白键从中央 C 开始，到高两组的 C 结束。",
    visual: keyboardVisual(["C4", "D4", "E4", "F4", "G4", "A4", "B4"], "第一个 C 是中央 C"),
    points: ["C4 是中央 C", "同名音隔 8 度重复", "同一个字母在不同八度声音高度不同"]
  },
  {
    level: "节奏",
    title: "拍号和基本时值",
    body: "4/4 拍里每小节 4 拍，四分音符通常 1 拍，二分音符 2 拍，全音符 4 拍。",
    visual: rhythmVisual(["50", "54", "58", "62"], "一次只加一点点速度"),
    points: ["先数拍再弹", "休止符也要数拍", "节奏稳定比速度更重要"]
  },
  {
    level: "和弦",
    title: "三和弦 1-3-5",
    body: "三和弦常由音阶第 1、3、5 级构成。C 大三和弦就是 C、E、G。",
    visual: chordVisual(),
    points: ["先会认单音，再学和弦", "和弦可以同时弹，也可以分解弹", "很多流行伴奏围绕和弦进行"]
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

const els = {
  tabButtons: [...document.querySelectorAll("[data-tab]")],
  panels: [...document.querySelectorAll(".tab-panel")],
  theoryLevels: document.querySelector("#theoryLevels"),
  theoryLevelDetail: document.querySelector("#theoryLevelDetail"),
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
  setSyncStatus(message || "输入邮箱后会收到 6 位验证码。电脑和手机用同一个邮箱登录即可同步。");
  els.syncForm.hidden = false;
  els.verifyForm.hidden = !pendingEmail;
  if (pendingEmail && !els.syncEmail.value) els.syncEmail.value = pendingEmail;
  els.syncNow.hidden = true;
  els.signOut.hidden = true;
}

function normalizeAppData(data) {
  const empty = createEmptyAppData();
  const source = data || {};
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
    questionStats: source.questionStats || {},
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
    const left = first?.[id] || {};
    const right = second?.[id] || {};
    merged[id] = {
      attempts: Math.max(Number(left.attempts) || 0, Number(right.attempts) || 0),
      correct: Math.max(Number(left.correct) || 0, Number(right.correct) || 0),
      lastPracticedAt:
        timestampValue(left.lastPracticedAt) >= timestampValue(right.lastPracticedAt)
          ? left.lastPracticedAt || null
          : right.lastPracticedAt || null
    };
  });
  return merged;
}

function mergeAppData(remoteData, localData) {
  const remote = normalizeAppData(remoteData);
  const local = normalizeAppData(localData);
  return {
    ...local,
    profile: {
      ...remote.profile,
      ...local.profile,
      email: currentUser?.email || local.profile.email || remote.profile.email
    },
    records: mergeRecords(remote.records, local.records),
    lessonProgress: {
      ...remote.lessonProgress,
      ...local.lessonProgress
    },
    questionStats: mergeQuestionStats(remote.questionStats, local.questionStats),
    imports: mergeImports(remote.imports, local.imports),
    sync: {
      ...local.sync,
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

async function loadCloudData() {
  const client = getSupabaseClient();
  if (!client || !currentUser) return;

  setSyncStatus("正在合并本机和云端数据...");
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
  await saveCloudData(row?.data ? "已合并电脑和手机数据。" : "已把本机数据上传到云端。");
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
  }

  client.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateSyncUI(currentUser ? "已登录，正在同步数据..." : "已退出登录，本机数据仍保留。");
    if (currentUser) {
      loadCloudData().catch(error => {
        console.error(error);
        setSyncStatus("同步失败：请确认 Supabase 数据表和权限策略已创建。");
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

function scoreStaff(notes) {
  return staffVisual("五线谱示意", notes).replace("visual-card", "visual-card score-staff");
}

function getAccuracy(state) {
  if (!state.attempts) return `0%（0/0）`;
  return `${Math.round((state.correct / state.attempts) * 100)}%（${state.correct}/${state.attempts}）`;
}

function noteFrequency(note) {
  const info = note.semitone === undefined ? noteOptions.find(item => item.name === note.name) : note;
  const midi = 12 * (note.octave + 1) + info.semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

function playTone(freq, isCorrect) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(isCorrect ? 0.22 : 0.09, now + 0.015);
  master.gain.exponentialRampToValueAtTime(0.0001, now + (isCorrect ? 0.9 : 0.22));
  master.connect(context.destination);

  const partials = isCorrect
    ? [
        { ratio: 1, gain: 1 },
        { ratio: 2, gain: 0.35 },
        { ratio: 3, gain: 0.14 }
      ]
    : [{ ratio: 1, gain: 1 }];

  partials.forEach(partial => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = isCorrect ? "triangle" : "square";
    osc.frequency.value = (isCorrect ? freq : 110) * partial.ratio;
    gain.gain.value = partial.gain;
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + (isCorrect ? 0.92 : 0.24));
  });
}

function renderPianoDrill() {
  ensureDrillQuestion("keyboard");
  const state = drillState.keyboard;
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
        <strong>${state.correct}/${state.attempts}</strong>
        <strong>${getAccuracy(state)}</strong>
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
  const keyWidth = 40;
  const keyboardWidth = pianoWhiteKeys.length * keyWidth;
  const correctName = state.naming === "sharp" ? state.note.sharp : state.note.flat;
  const options =
    state.naming === "sharp"
      ? ["C#", "D#", "F#", "G#", "A#"]
      : ["Db", "Eb", "Gb", "Ab", "Bb"];

  return `
    <section class="drill-card">
      <div class="drill-stats">
        <strong>${getAccuracy(state)}</strong>
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
      <p class="drill-hint">当前按${state.naming === "sharp" ? "升号" : "降号"}命名。这个键也可以叫 ${state.note.sharp} / ${state.note.flat}。</p>
    </section>
  `;
}

function renderStaffDrill() {
  ensureDrillQuestion("staff");
  const state = drillState.staff;
  const note = state.note;
  const noteInfo = noteOptions.find(item => item.name === note.name);
  const clefLabel = state.clef === "treble" ? "高音谱号" : "低音谱号";
  const octaveMark = note.octave >= 5 ? "上方一点" : note.octave <= 3 ? "下方一点" : "无点";
  const bottomLineY = 124;
  const stepGap = 10;
  const noteY = bottomLineY - note.step * stepGap;
  const lines = [44, 64, 84, 104, 124]
    .map(y => `<line x1="38" y1="${y}" x2="410" y2="${y}" stroke="#333" stroke-width="1.5" />`)
    .join("");
  const ledgerLines = [];
  if (note.step <= -2) {
    for (let step = -2; step >= note.step; step -= 2) {
      const y = bottomLineY - step * stepGap;
      ledgerLines.push(`<line x1="220" y1="${y}" x2="272" y2="${y}" stroke="#333" stroke-width="1.5" />`);
    }
  }
  if (note.step >= 10) {
    for (let step = 10; step <= note.step; step += 2) {
      const y = bottomLineY - step * stepGap;
      ledgerLines.push(`<line x1="220" y1="${y}" x2="272" y2="${y}" stroke="#333" stroke-width="1.5" />`);
    }
  }

  return `
    <section class="drill-card">
      <div class="drill-stats">
        <strong>${state.correct}/${state.attempts}</strong>
        <strong>${getAccuracy(state)}</strong>
      </div>
      <div class="clef-switch">
        <button class="${state.clef === "treble" ? "active" : ""}" data-clef="treble">高音谱号</button>
        <button class="${state.clef === "bass" ? "active" : ""}" data-clef="bass">低音谱号</button>
      </div>
      <div class="drill-stage ${state.status}">
        <svg class="drill-staff" viewBox="0 0 450 190" role="img" aria-label="${clefLabel}认音练习">
          ${lines}
          <text class="staff-clef" x="${state.clef === "treble" ? 48 : 54}" y="${state.clef === "treble" ? 133 : 118}" font-size="${state.clef === "treble" ? 112 : 92}" fill="#1f2a24">${state.clef === "treble" ? "𝄞" : "𝄢"}</text>
          ${ledgerLines.join("")}
          <ellipse class="staff-note-dot" cx="246" cy="${noteY}" rx="18" ry="12" fill="${state.status === "correct" ? "#2e9b5f" : "#f12d2d"}" transform="rotate(-18 246 ${noteY})" />
        </svg>
      </div>
      <div class="drill-options">
        ${noteOptions
          .map(
            option => {
              const buttonState =
                state.lastAnswer === option.name ? (state.status === "correct" ? "correct" : "wrong") : "";
              return `
              <button class="${buttonState}" data-drill-type="staff" data-drill-answer="${option.name}">
                <strong>${option.name}</strong>
                <span>${option.numbered} · ${["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"][noteOptions.indexOf(option)]}</span>
              </button>
            `;
            }
          )
          .join("")}
      </div>
      <p class="drill-hint">当前是${clefLabel}，答对后会播放 ${note.name}${note.octave}。简谱为 ${noteInfo.numbered}，音区标记：${octaveMark}。</p>
    </section>
  `;
}

function renderDrill(level) {
  if (level.drill === "keyboard") return renderPianoDrill();
  if (level.drill === "black") return renderBlackKeyDrill();
  return renderStaffDrill();
}

function renderLessons() {
  renderTheoryLevels();

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

function renderTheoryLevels() {
  const progress = readTheoryProgress();
  const completed = Object.values(progress).filter(Boolean).length;
  const activeLevel = theoryLevels.find(level => level.id === activeTheoryLevelId) || theoryLevels[0];

  els.theoryLevels.innerHTML = `
    <div class="level-progress">
      <strong>${completed}/${theoryLevels.length}</strong>
      <span>已完成关卡</span>
    </div>
    ${theoryLevels
      .map(
        (level, index) => `
          <button class="level-button ${level.id === activeLevel.id ? "active" : ""}" data-level-id="${level.id}">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>${level.title}</strong>
              <small>${level.group}</small>
            </div>
            <em>${progress[level.id] ? "已掌握" : "未完成"}</em>
          </button>
        `
      )
      .join("")}
  `;

  els.theoryLevelDetail.innerHTML = `
    <article class="level-card">
      <div class="level-card-head">
        <span class="level-pill">${activeLevel.group}</span>
        <h3>${activeLevel.title}</h3>
        <p>${activeLevel.summary}</p>
      </div>
      ${activeLevel.drill ? "" : activeLevel.visual}
      <div class="level-content-grid">
        <section>
          <h4>本关目录</h4>
          <ol>${activeLevel.contents.map(item => `<li>${item}</li>`).join("")}</ol>
        </section>
        <section>
          <h4>先记住</h4>
          <ul>${activeLevel.points.map(point => `<li>${point}</li>`).join("")}</ul>
        </section>
      </div>
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

function recordQuestionAttempt(levelId, isCorrect) {
  const data = readAppData();
  const stats = data.questionStats[levelId] || {
    attempts: 0,
    correct: 0,
    lastPracticedAt: null
  };
  stats.attempts += 1;
  if (isCorrect) stats.correct += 1;
  stats.lastPracticedAt = new Date().toISOString();
  data.questionStats[levelId] = stats;
  writeAppData(data);
}

function answerDrill(type, answer) {
  const state = drillState[type];
  const current = state.note;
  if (!current) return;
  upsertAppLearningRecord();

  const correctName = current.name;
  const blackCorrectName = type === "black" ? (state.naming === "sharp" ? current.sharp : current.flat) : null;
  const isCorrect = answer === (blackCorrectName || correctName);
  const levelId = type === "keyboard" ? "notes" : type === "black" ? "black-keys" : "staff-note";
  state.attempts += 1;
  state.lastAnswer = answer;
  recordQuestionAttempt(levelId, isCorrect);

  if (isCorrect) {
    state.correct += 1;
    state.status = "correct";
    playTone(noteFrequency(current), true);
    if (state.correct >= 5) {
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

function switchBlackNaming(naming) {
  drillState.black.naming = naming;
  drillState.black.note = null;
  drillState.black.status = "idle";
  drillState.black.lastAnswer = null;
  renderTheoryLevels();
}

function switchStaffClef(clef) {
  drillState.staff.clef = clef;
  drillState.staff.note = null;
  drillState.staff.status = "idle";
  drillState.staff.lastAnswer = null;
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
                  ${showStaff ? `<section><h4>五线谱</h4>${scoreStaff(piece.notes)}</section>` : ""}
                  ${
                    showNumbered
                      ? `<section><h4>简谱</h4><div class="numbered-score">${piece.numbered}</div></section>`
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
  const source = text.trim();
  if (!source) {
    return {
      type: "待自动解析",
      theory: ["已保存链接。等接入视频读取、转写或你补充文字后，再提取乐理知识点。"],
      practice: ["可以先收藏这条素材，练琴前打开原链接观看。"],
      scoreDraft: "只有链接时无法判断是否包含琴谱。后续可接入视频转写、截图识别或手动补充。"
    };
  }

  const lines = splitSourceText(source);
  const lower = source.toLowerCase();
  const hasTheory = /五线谱|简谱|音阶|和弦|节拍|拍号|调号|升号|降号|半音|全音|谱号|音符/.test(source);
  const hasPractice = /手型|坐姿|放松|节拍器|慢练|双手|左手|右手|指法|练习|速度|错音/.test(source);
  const hasScore = /[1-7][#b]?|c|d|e|f|g|a|b|am|em|dm|和弦|旋律|谱/.test(lower);

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
      : "暂未检测到明显琴谱信息。"
  };
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
        </article>
      `
    )
    .join("");
}

function calculateStreak(records) {
  const dates = [...new Set(records.map(record => record.date))].sort((a, b) => b.localeCompare(a));
  if (!dates.length) return 0;

  let cursor = new Date(`${dates[0]}T12:00:00`);
  let streak = 0;

  while (dates.includes(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
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
  const todayRecord = records.find(record => record.date === todayISO());

  els.streakDays.textContent = `${calculateStreak(records)} 天`;
  els.weekMinutes.textContent = `${weekTotal(records)} 分钟`;
  els.totalMinutes.textContent = `${total} 分钟`;
  els.recordDays.textContent = records.length;
  els.avgMinutes.textContent = records.length ? `${Math.round(total / records.length)} 分钟` : "0 分钟";
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
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupEvents() {
  els.tabButtons.forEach(button => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
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

  els.theoryLevels.addEventListener("click", event => {
    const button = event.target.closest("[data-level-id]");
    if (!button) return;
    activeTheoryLevelId = button.dataset.levelId;
    renderTheoryLevels();
  });

  els.theoryLevelDetail.addEventListener("click", event => {
    const drillButton = event.target.closest("[data-drill-answer]");
    if (drillButton) {
      answerDrill(drillButton.dataset.drillType, drillButton.dataset.drillAnswer);
      return;
    }

    const clefButton = event.target.closest("[data-clef]");
    if (clefButton) {
      switchStaffClef(clefButton.dataset.clef);
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

  els.importForm.addEventListener("submit", event => {
    event.preventDefault();
    const text = els.sourceText.value.trim();
    const url = els.sourceUrl.value.trim();
    const title = els.sourceTitle.value.trim() || titleFromUrl(url);
    const item = {
      url,
      title,
      text,
      date: todayISO(),
      createdAt: new Date().toISOString(),
      analysis: analyzeSource(text)
    };
    const items = readImports();
    items.unshift(item);
    writeImports(items);
    els.importMessage.textContent = text ? "已整理并保存在本机。" : "已保存链接，等待后续解析。";
    els.importForm.reset();
    renderImports();
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
    setSyncStatus("验证码已发送。看邮箱里的 6 位数字，回到这里输入即可登录。");
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
  els.practiceDate.value = todayISO();
  renderLessons();
  renderScores();
  renderImports();
  renderStats();
  setupEvents();
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
