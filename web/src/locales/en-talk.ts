import type { Copy } from '@/interfaces/copy.interface';

/** English functional phrases, spoken patterns and fluency ("three rounds") copy. */
export const enTalk: Pick<Copy, 'talk' | 'fluency' | 'feedback'> = {
  talk: {
    title: 'Speaking style',
    lead: 'Pick the phrase that fits the listener, then change sentences by voice. The scorer listens for the -s and -ed endings that are easy to drop.',
    unitLead: (unit: string): string => `Practise the phrases and the pattern of unit ${unit}.`,
    due: 'Due',
    fresh: 'New today',
    started: 'Met',
    startedHint: (started: number, total: number): string => `Met ${started} / ${total} cards`,
    start: (count: number): string => `Start ${count} cards`,
    allDone: 'All done for today. Come back tomorrow.',
    paused: 'Many cards are due, so new cards are paused. Clear some reviews first.',
    progress: (index: number, total: number): string => `Card ${index} / ${total}`,
    newBadge: 'New',
    register: { casual: 'Casual', neutral: 'Neutral', formal: 'Formal' },
    situationQuestion: 'What would you say?',
    rightRegister: (register: string): string => `Right: the ${register.toLowerCase()} one.`,
    wrongRegister: (register: string): string =>
      `Not quite. This situation needs the ${register.toLowerCase()} one.`,
    sayIt: 'Now say it:',
    transformQuestion: 'Change the sentence as the cue says, out loud:',
    cue: 'Cue',
    rule: 'Rule',
    play: 'Hear the sentence',
    record: 'Tap to speak',
    stop: 'Stop',
    scoring: 'Scoring…',
    dontKnow: "I don't know yet",
    model: 'Hear the model',
    answer: 'Answer',
    gradeGood: 'Exactly!',
    gradeHard: 'Close: the scorer is unsure about a few sounds. Compare with the model.',
    gradeAgain: 'Not yet. Hear the model and try again next review.',
    spokenGood: 'Clearly said.',
    spokenHard: 'The scorer is unsure about a few sounds. Compare with the model.',
    ending: { s: '-s', ed: '-ed' },
    endingOk: (ending: string, word: string): string => `The ${ending} of “${word}” is clear.`,
    endingCheck: (ending: string, word: string): string =>
      `The ${ending} of “${word}” is unclear. Say the last sound more clearly.`,
    endingError: (ending: string, word: string): string =>
      `The ${ending} of “${word}” was not heard. Don't drop the last sound.`,
    override: 'I said it right, the scorer is wrong',
    scoreFailed: 'This take could not be scored. Grade yourself:',
    selfGood: 'I said it',
    selfAgain: 'Not yet',
    next: 'Next',
    summaryTitle: 'Session done',
    summaryLine: (good: number, total: number): string => `Good on ${good} / ${total} cards`,
    summaryMore: 'Keep going',
    backHome: 'Back to home',
    homeTitle: 'Practise speaking style',
    homeLine: (due: number, fresh: number): string =>
      due > 0 ? `${due} due · ${fresh} new` : `${fresh} new today`,
    homeDone: 'Done for today',
    unitTitle: 'Speaking style',
    unitFunction: 'Phrases',
    unitPattern: 'Pattern',
    unitPractice: "Practise this unit's speaking style",
  },
  fluency: {
    title: 'Speak fluently',
    lead: 'Talk about the same topic three times: 60 seconds, then 45, then 30. Less time pushes you to speak faster and with fewer stops. Measured on the device and compared only with yourself.',
    topic: 'Topic',
    changeTopic: 'Change topic',
    topicOption: (unit: string, title: string): string => `${unit} · ${title}`,
    ideas: 'Ideas to cover',
    phrases: 'Phrases that keep you going',
    listen: (phrase: string): string => `Listen to “${phrase}”`,
    round: (index: number, total: number): string => `Round ${index} / ${total}`,
    start: (index: number, seconds: number): string => `Start round ${index} · ${seconds} s`,
    secondsLeft: (seconds: number): string => `${seconds} s left`,
    speakNow: "Keep talking; don't stop to fix mistakes.",
    finish: 'Finish early',
    analyzing: 'Measuring…',
    noSpeech:
      'No voice heard. Speak up or move closer to the microphone, then try this round again.',
    retry: 'Try this round again',
    next: (index: number, seconds: number): string => `Next: round ${index} · ${seconds} s`,
    showSummary: 'See the results',
    roundDone: (index: number): string => `Round ${index} done.`,
    column: (index: number, seconds: number): string => `Round ${index} · ${seconds}s`,
    metric: 'Measure',
    rate: 'Speech rate',
    rateUnit: 'syllables/min',
    run: 'Run length',
    runUnit: 'syllables per run',
    pauses: 'Pauses',
    pausesUnit: 'per minute',
    explain:
      'Speech rate counts syllables per minute. A run is the syllables between two pauses of 0.25 s or more. The numbers are estimated from the sound: watch whether they go up or down, not their size.',
    summaryTitle: 'Three rounds done!',
    compareLead: 'Last round against the first:',
    changeRate: (delta: number): string =>
      delta === 0
        ? 'the same speed'
        : delta > 0
          ? `${delta} syllables/min faster`
          : `${-delta} syllables/min slower`,
    changeRun: (delta: number): string =>
      delta === 0
        ? 'runs as long as before'
        : delta > 0
          ? `runs ${delta} syllables longer`
          : `runs ${-delta} syllables shorter`,
    changePauses: (delta: number): string =>
      delta === 0
        ? 'as many pauses as before'
        : delta < 0
          ? `${-delta} fewer pauses per minute`
          : `${delta} more pauses per minute`,
    again: 'Talk about this topic again',
    hideNumbers: 'Hide the numbers while practising',
    hiddenDone:
      'All three rounds recorded. The numbers are hidden; untick the box below to see them.',
    trendTitle: 'Your trend',
    trendEmpty: 'Finish one "three rounds" to see your trend.',
    trendNote:
      'The last round of each session, oldest first. Compared only with yourself, not a level.',
    trendRow: (date: string, topic: string): string => `${date} · ${topic}`,
    homeTitle: 'Speak fluently',
    homeLine: (topic: string): string => `Three rounds: ${topic}`,
    unitPractice: "Three rounds on this unit's topic",
    saveFailed: 'Could not save the results on this device.',
    backHome: 'Back to home',
    progressTitle: 'Vocabulary and fluency',
    remembered: (count: number, total: number): string => `Words remembered: ${count} / ${total}`,
    rememberedHint: 'Words you would recall with a probability of 90 % or more, every way asked.',
  },
  feedback: {
    title: 'Content feedback (AI)',
    lead: 'Type or dictate what you just said. The AI tutor gets only the text, never the audio, and comments only on grammar, word choice and formality. The scorer already handles pronunciation.',
    unavailable:
      'Content feedback needs a scoring server with the AI tutor turned on (Settings → Own scoring server). Only the text you enter is sent, never audio.',
    label: 'What did you say?',
    placeholder: 'For example: Yesterday I go to the market with my sister.',
    dictate: 'Dictate',
    stopDictate: 'Stop dictating',
    dictateNote: 'Speech recognition is done by your browser or operating system.',
    ask: 'Get feedback',
    asking: 'The tutor is reading…',
    focusTitle: 'Worth fixing',
    kind: { grammar: 'Grammar', word_choice: 'Word choice' },
    noIssue: 'No grammar or word-choice problems found. Well done!',
    formality: (level: string): string => `Formality: ${level}`,
    levels: { casual: 'casual', neutral: 'neutral', formal: 'formal' },
    better: 'A more natural way to say it',
    listenBetter: 'Listen to it',
    more: (count: number): string => `See ${count} more`,
  },
};
