import { expect, test } from '@playwright/test';

test('company workflow navigates through settings, invitation and grounded record', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('採用の、今を見渡す。');
  await page.getByRole('navigation').getByRole('link', { name: '求人・質問設定' }).click();
  await page.getByRole('link', { name: '求人・質問を確認' }).click();
  await page.getByLabel('求人名', { exact: true }).fill('画面確認用の変更');
  await page.getByRole('button', { name: '設定を保存' }).click();
  await expect(page.getByRole('status')).toContainText('現在利用できません');
  await page.getByRole('link', { name: '招待画面へ' }).click();
  await page.getByRole('button', { name: '招待リンクを発行' }).click();
  await expect(page.getByRole('status')).toContainText('データの保存・送信は行っていません');
  await page.getByRole('navigation').getByRole('link', { name: '面談一覧' }).click();
  await page.getByRole('link', { name: '候補者 Aの記録を確認' }).click();
  await page.getByText('発言の根拠を見る').click();
  await expect(
    page.getByText('「まず利用者に話を聞いて、チームで課題の優先順位を整理しました。」'),
  ).toBeVisible();
  await page.getByRole('button', { name: '確認結果を保存' }).click();
  await expect(page.getByRole('status')).toContainText('現在利用できません');
  await page.getByRole('navigation').getByRole('link', { name: 'メンバー・権限' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('メンバー・権限');
  expect(failures).toEqual([]);
});

test('candidate workflow requires acknowledgement and never starts audio or makes external calls', async ({
  page,
}) => {
  const unexpectedRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) unexpectedRequests.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => {
        throw new Error('Microphone must not be used in prototype');
      },
    });
  });
  await page.goto('/candidate/demo');
  await page.getByRole('link', { name: '利用前の確認へ' }).click();
  await expect(page.getByRole('button', { name: '対話画面へ進む' })).toBeDisabled();
  await page.getByRole('button', { name: 'マイクを確認' }).click();
  await expect(page.getByRole('status')).toContainText('現在利用できません');
  await page.getByRole('checkbox').check();
  await page.getByRole('link', { name: '対話画面へ進む' }).click();
  await page.getByRole('button', { name: '音声対話を開始' }).click();
  await expect(page.getByRole('status')).toContainText('現在利用できません');
  await page.getByRole('link', { name: '画面確認として完了画面へ' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('画面の確認が完了しました');
  await page.getByRole('link', { name: 'もう一度確認する' }).click();
  await expect(page).toHaveURL('/candidate/demo');
  expect(unexpectedRequests).toEqual([]);
});

test('deep links, reload, browser history, login and unknown IDs work', async ({ page }) => {
  await page.goto('/interviews/sample-b/report');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('候補者 Bの面談記録');
  await page.getByRole('link', { name: '面談一覧へ', exact: false }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('候補者 Bの面談記録');
  for (const path of ['/missing', '/jobs/unknown', '/interviews/unknown/report']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ページが見つかりません');
  }
  await page.goto('/login');
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('現在利用できません');
  await page.getByRole('link', { name: 'サンプル画面を開く' }).click();
  await expect(page).toHaveURL('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
