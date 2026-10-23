import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/candidate/demo/check');
  await page.getByRole('checkbox', { name: '画面確認用の説明を確認しました' }).check();
  await page.getByRole('link', { name: '対話画面へ進む' }).click();
}

test('incremental transcript can pause, resume and be reviewed without overwriting a typed answer', async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) requests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => {
        throw new Error('No microphone or camera in demo');
      },
    });
  });
  await page.clock.install();
  await start(page);
  await page.getByRole('button', { name: 'ダミー回答を入力' }).click();
  const sample = await page.getByLabel('この質問への回答').inputValue();
  await page.getByLabel('この質問への回答').fill('自分で書いた回答を残します。');
  const live = page.getByRole('region', { name: 'リアルタイム文字起こしのデモ', exact: true });
  const output = live.getByRole('region', { name: '文字起こしの内容', exact: true });
  await live.getByRole('button', { name: '文字起こしデモを開始' }).click();
  await page.clock.runFor(500);
  await expect(output).not.toHaveText(sample);
  await expect(output).not.toContainText('ここに認識した内容が表示されます。');
  await expect(live.getByRole('button', { name: 'この文字起こしを回答に使う' })).toHaveCount(0);
  await expect(page.getByLabel('この質問への回答')).toHaveValue('自分で書いた回答を残します。');
  await live.getByRole('button', { name: '文字起こしを一時停止' }).click();
  const paused = await output.innerText();
  await page.clock.runFor(3000);
  await expect(output).toHaveText(paused);
  await live.getByRole('button', { name: '文字起こしを再開' }).click();
  await page.clock.runFor(10000);
  await expect(output).toHaveText(sample);
  await expect(live.getByRole('status')).toContainText('完了しました（デモ）');
  await expect(page.getByLabel('この質問への回答')).toHaveValue('自分で書いた回答を残します。');
  await live.getByRole('button', { name: 'この文字起こしを回答に使う' }).click();
  await expect(page.getByLabel('この質問への回答')).toHaveValue(sample);
  await page.getByLabel('この質問への回答').fill('認識結果を確認して、自分の言葉で訂正しました。');
  await page.getByRole('button', { name: 'この回答で次へ' }).click();
  await page.getByRole('link', { name: 'ここまでの要約を見る' }).click();
  await expect(page.locator('.answer-summary')).toHaveText(
    '認識結果を確認して、自分の言葉で訂正しました。',
  );
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('early finish and replay work, and changing question cancels the previous transcript', async ({
  page,
}) => {
  await page.clock.install();
  await start(page);
  const live = page.getByRole('region', { name: 'リアルタイム文字起こしのデモ', exact: true });
  const output = live.getByRole('region', { name: '文字起こしの内容', exact: true });
  await live.getByRole('button', { name: '文字起こしデモを開始' }).click();
  await expect(live.getByRole('button', { name: 'ここまでで終了する' })).toBeDisabled();
  await page.clock.runFor(500);
  await live.getByRole('button', { name: 'ここまでで終了する' }).click();
  const partial = await output.innerText();
  await page.clock.runFor(3000);
  await expect(output).toHaveText(partial);
  await live.getByRole('button', { name: 'この文字起こしを回答に使う' }).click();
  await expect(page.getByLabel('この質問への回答')).toHaveValue(partial);
  await live.getByRole('button', { name: 'デモを最初から再生' }).click();
  await expect(output).toContainText('ここに認識した内容が表示されます。');
  await page.clock.runFor(500);
  await page.getByRole('link', { name: /02 これまでの経験/ }).click();
  await page.clock.runFor(10000);
  await expect(live.getByRole('status')).toContainText('待機中');
  await expect(output).toContainText('ここに認識した内容が表示されます。');
  await expect(page.getByLabel('この質問への回答')).toBeEmpty();
});
