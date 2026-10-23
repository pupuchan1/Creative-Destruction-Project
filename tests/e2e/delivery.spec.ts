import { expect, test } from '@playwright/test';

async function fillDemo(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: '利用前の確認へ' }).click();
  await page.getByRole('checkbox', { name: '画面確認用の説明を確認しました' }).check();
  await page.getByRole('link', { name: '対話画面へ進む' }).click();
  for (let index = 0; index < 4; index++) {
    await page.getByRole('button', { name: 'ダミー回答を入力' }).click();
    await page
      .getByRole('button', { name: index === 3 ? '要約を確認する' : 'この回答で次へ' })
      .click();
  }
}

test('company site module opens hosted assessment and never reports an unavailable submission as delivered', async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) requests.push(request.url());
    if (request.method() !== 'GET') requests.push(request.method());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/settings/integration');
  await page.getByRole('radio', { name: 'カード', exact: true }).check();
  await expect(page.getByLabel('設置用HTMLの例')).toHaveValue(/<section.*sample-open/s);
  await expect(page.getByLabel('設置用HTMLの例')).not.toHaveValue(/candidate\/|script|token=/);
  await page.getByRole('link', { name: '採用サイトへの設置例を見る' }).click();
  await page.getByRole('link', { name: '事前ヒアリングへ進む' }).click();
  await expect(page).toHaveURL('/apply/sample-open');
  await page.getByRole('button', { name: '受検リンクを取得する' }).click();
  await expect(page.getByRole('status')).toContainText('現在利用できません');
  await page.getByRole('link', { name: 'ダミーの受検リンクで試す' }).click();
  await expect(page.locator('.candidate-company')).toContainText('サンプル株式会社');
  await expect(page.getByRole('link', { name: '企業画面へ戻る' })).toHaveCount(0);
  await fillDemo(page);
  await page.getByRole('button', { name: '提出内容の確認へ進む' }).click();
  await expect(page).toHaveURL('/candidate/demo/review');
  await expect(page.locator('.submission-destination')).toContainText('サンプル株式会社');
  await page.getByRole('button', { name: 'この内容を企業に提出する' }).click();
  await expect(page.getByRole('status')).toContainText('送信は行っていません');
  await expect(page).toHaveURL('/candidate/demo/review');
  await page.getByRole('link', { name: '要約を見直す' }).click();
  await expect(page.getByText('回答済み 4 / 4')).toBeVisible();
  await page.getByRole('button', { name: '提出内容の確認へ進む' }).click();
  await page.getByRole('button', { name: '送信せず完了画面を確認する' }).click();
  await expect(page.getByText('企業への提出は完了していません。', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'サンプル株式会社の採用サイトへ戻る' }).click();
  await expect(page).toHaveURL('/careers/sample');
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('a different company gets its own context and unknown invitations fail closed', async ({
  page,
}) => {
  await page.goto('/candidate/demo');
  await fillDemo(page);
  await expect(page.getByText('回答済み 4 / 4')).toBeVisible();
  // SPA navigation between invitation IDs must remount the in-memory answer context.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/candidate/sora-demo/summary');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('.candidate-company')).toContainText('ソラテック株式会社');
  await expect(page.getByText('未回答', { exact: true })).toHaveCount(4);
  await expect(page.getByRole('button', { name: '提出内容の確認へ進む' })).toBeDisabled();
  await page.goto('/candidate/sora-demo/review');
  await expect(page).toHaveURL('/candidate/sora-demo/summary');
  await page.goto('/careers/sora');
  await page.getByRole('link', { name: '事前ヒアリングへ進む' }).click();
  await expect(page).toHaveURL('/apply/sora-engineering');
  await page.getByRole('link', { name: 'ダミーの受検リンクで試す' }).click();
  await page.getByRole('link', { name: '利用前の確認へ' }).click();
  await expect(page.getByRole('radio', { name: /Webエンジニア/ })).toBeChecked();
  await page.getByRole('link', { name: '採用サイトへ戻る', exact: true }).click();
  await expect(page).toHaveURL('/careers/sora');
  for (const path of ['/candidate/unknown', '/candidate/unknown/summary', '/apply/unknown']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'この受検リンクは利用できません',
    );
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '利用前の確認へ' })).toHaveCount(0);
  }
});
