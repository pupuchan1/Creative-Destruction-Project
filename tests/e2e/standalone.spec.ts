import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

test('single-file preview works offline, including an isolated HTML preview', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  const requests: string[] = [];
  const html = await readFile(resolve('preview.html'), 'utf8');
  const documentUrl = 'http://127.0.0.1:4173/standalone-preview.html';
  // Fulfill just this HTML from disk; every other network request stays offline.
  await page.route(documentUrl, (route) => route.fulfill({ contentType: 'text/html', body: html }));
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && request.url() !== documentUrl)
      requests.push(request.url());
  });
  await context.setOffline(true);
  await page.goto(documentUrl);
  await page.getByRole('navigation').getByRole('link', { name: '求人・質問設定' }).click();
  await expect(page).toHaveURL(/#\/jobs$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('求人・質問設定');
  await page.getByRole('link', { name: '求人・質問を確認' }).click();
  await page.getByRole('button', { name: '設定を保存' }).click();
  await expect(page.getByRole('status')).toContainText('現在利用できません');

  // HTML visualization commonly runs in an iframe without same-origin access.
  await page.goto('about:blank');
  await page.evaluate((content) => {
    const frame = document.createElement('iframe');
    frame.sandbox.add('allow-scripts');
    frame.srcdoc = content;
    document.body.append(frame);
  }, html);
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { level: 1 })).toHaveText('採用の、今を見渡す。');
  await frame.getByRole('navigation').getByRole('link', { name: 'サイトへの設置' }).click();
  await frame.getByRole('link', { name: '採用サイトへの設置例を見る' }).click();
  await frame.getByRole('link', { name: '事前ヒアリングへ進む' }).click();
  await frame.getByRole('link', { name: 'ダミーの受検リンクで試す' }).click();
  await expect(frame.getByRole('heading', { level: 1 })).toContainText('あなたの経験を、');
  await frame.getByRole('link', { name: '利用前の確認へ' }).click();
  await frame.getByRole('checkbox', { name: '画面確認用の説明を確認しました' }).check();
  await frame.getByRole('link', { name: '対話画面へ進む' }).click();
  for (let index = 0; index < 4; index++) {
    await frame.getByRole('button', { name: 'ダミー回答を入力' }).click();
    await frame
      .getByRole('button', { name: index === 3 ? '要約を確認する' : 'この回答で次へ' })
      .click();
  }
  await expect(frame.getByRole('heading', { level: 1 })).toHaveText('あなたのお話をまとめました');
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});
