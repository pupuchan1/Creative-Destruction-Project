import { useEffect, useState } from 'react';

type Phase = 'idle' | 'running' | 'paused' | 'finished';

// Simulated recognition only. No microphone, browser speech service, or network access.
export function LiveTranscriptDemo({
  sample,
  onApply,
}: {
  sample: string;
  onApply: (text: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [visible, setVisible] = useState(0);
  const [applied, setApplied] = useState(false);
  const characters = Array.from(sample);
  const transcript = characters.slice(0, visible).join('');
  const boundary = Math.max(transcript.lastIndexOf('。'), transcript.lastIndexOf('？')) + 1;
  const finalText = phase === 'finished' ? transcript : transcript.slice(0, boundary);
  const interimText = phase === 'finished' ? '' : transcript.slice(boundary);

  useEffect(() => {
    if (phase !== 'running') return;
    if (visible >= characters.length) {
      setPhase('finished');
      return;
    }
    const timer = window.setTimeout(() => setVisible((count) => count + 8), 240);
    return () => window.clearTimeout(timer);
  }, [phase, visible, characters.length]);

  function start() {
    setVisible(0);
    setApplied(false);
    setPhase('running');
  }

  return (
    <section className="live-transcript" aria-label="リアルタイム文字起こしのデモ">
      <div className="transcript-heading">
        <div>
          <p className="eyebrow">LIVE TRANSCRIPT</p>
          <h2>話した内容を、その場で確認</h2>
        </div>
        <span className="badge blue">ダミー音声の再現</span>
      </div>
      <p className="transcript-help">
        架空の回答が少しずつ表示されます。実際の録音・音声認識は行いません。
      </p>
      <p className="transcript-status" role="status">
        {applied
          ? '文字起こしを回答欄に反映しました。内容を確認・編集してください。'
          : phase === 'running'
            ? '文字起こしを表示中（デモ）'
            : phase === 'paused'
              ? '一時停止中。再開するか、ここまでの内容を確認できます。'
              : phase === 'finished'
                ? '文字起こしが完了しました（デモ）。回答に使う前に確認してください。'
                : '待機中。開始すると、文字起こしの表示を体験できます。'}
      </p>
      <div
        className="transcript-output"
        role="region"
        aria-label="文字起こしの内容"
        aria-live="off"
      >
        {transcript ? (
          <p>
            <span>{finalText}</span>
            <span className="interim-transcript">{interimText}</span>
          </p>
        ) : (
          <p className="muted">ここに認識した内容が表示されます。</p>
        )}
      </div>
      <p className="transcript-legend">
        薄い文字は認識途中の表示です。回答欄への反映は、確認してから行います。
      </p>
      <div className="transcript-controls">
        {phase === 'idle' && (
          <button className="button secondary" onClick={start}>
            文字起こしデモを開始
          </button>
        )}
        {phase === 'running' && (
          <button className="button secondary" onClick={() => setPhase('paused')}>
            文字起こしを一時停止
          </button>
        )}
        {phase === 'paused' && (
          <button className="button secondary" onClick={() => setPhase('running')}>
            文字起こしを再開
          </button>
        )}
        {(phase === 'running' || phase === 'paused') && (
          <button
            className="button secondary"
            disabled={!transcript}
            onClick={() => setPhase('finished')}
          >
            ここまでで終了する
          </button>
        )}
        {phase === 'finished' && (
          <>
            <button
              className="button secondary"
              onClick={() => {
                onApply(transcript);
                setApplied(true);
              }}
            >
              この文字起こしを回答に使う
            </button>
            <button className="text-link text-link-button" onClick={start}>
              デモを最初から再生
            </button>
          </>
        )}
      </div>
      <p className="transcript-legend">
        「回答に使う」で下の回答欄を置き換えます。再生中に入力した文章は、自動で上書きしません。
      </p>
    </section>
  );
}
