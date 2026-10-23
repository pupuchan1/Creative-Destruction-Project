import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/candidate/demo/check');
  await page.getByRole('radio', { name: /Webエンジニア/ }).check();
  await page.getByRole('checkbox', { name: 'ものづくりをしたい', exact: true }).check();
  await page.getByRole('checkbox', { name: '画面確認用の説明を確認しました' }).check();
  await page.getByRole('link', { name: '対話画面へ進む' }).click();
}

test('role-specific sample answers can be reviewed, retried and supplemented without losing other answers', async ({
  page,
}) => {
  await start(page);
  for (let index = 0; index < 4; index++) {
    await page.getByRole('button', { name: 'ダミー回答を入力' }).click();
    if (index === 0) {
      await expect(page.getByLabel('この質問への回答')).toHaveValue(
        /Webエンジニア.*ものづくりをしたい/,
      );
    }
    if (index === 1) {
      await expect(page.getByLabel('この質問への回答')).toHaveValue(/読んだ本を記録するWebアプリ/);
    }
    await page
      .getByRole('button', { name: index === 3 ? '要約を確認する' : 'この回答で次へ' })
      .click();
  }
  const experience = page.getByRole('region', { name: 'これまでの経験', exact: true });
  const team = page.getByRole('region', { name: '一緒に働くうえで大切なこと', exact: true });
  await expect(
    experience.getByText(
      'Reactで読書記録アプリの一覧と検索画面を制作。友人3人の試用をもとに検索の操作を改善。',
      { exact: true },
    ),
  ).toBeVisible();
  const originalTeamSummary = await team.locator('.answer-summary').innerText();

  await experience.getByRole('link', { name: 'この質問をやり直す' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'これまでに取り組んだことを教えてください。',
  );
  await expect(page.getByLabel('この質問への回答')).toHaveValue(/読んだ本を記録するWebアプリ/);
  await page
    .getByLabel('この質問への回答')
    .fill('チーム制作で検索画面の実装と操作テストを担当しました。');
  await page.getByRole('button', { name: 'この回答を要約に反映する' }).click();
  await expect(experience.locator('.answer-summary')).toHaveText(
    'チーム制作で検索画面の実装と操作テストを担当しました。',
  );
  await expect(experience.getByText('編集した回答', { exact: true })).toBeVisible();
  await expect(team.locator('.answer-summary')).toHaveText(originalTeamSummary);

  await experience.getByRole('button', { name: '補足する', exact: true }).click();
  await page.getByLabel('これまでの経験の補足').fill('バックエンドは別のメンバーが担当しました。');
  await page.getByRole('button', { name: '補足を反映する' }).click();
  await expect(experience.locator('.supplement-result')).toContainText(
    'バックエンドは別のメンバーが担当しました。',
  );
  await experience.getByRole('button', { name: '補足を編集する' }).click();
  await page.getByLabel('これまでの経験の補足').fill('この変更はキャンセルします。');
  await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
  await expect(experience.locator('.supplement-result')).toContainText(
    'バックエンドは別のメンバーが担当しました。',
  );
  await experience.getByText('入力した回答を見る', { exact: true }).click();
  await expect(experience.locator('.original-answer')).toHaveText(
    'チーム制作で検索画面の実装と操作テストを担当しました。',
  );

  await page.getByRole('button', { name: 'この内容で確認を完了する' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('お話の内容を確認しました');
  await page.getByRole('link', { name: '要約をもう一度見る' }).click();
  await expect(experience.locator('.supplement-result')).toContainText(
    'バックエンドは別のメンバーが担当しました。',
  );
});

test('missing answers cannot be confirmed, and reloading does not fabricate answers or completion', async ({
  page,
}) => {
  await page.goto('/candidate/demo/complete');
  await expect(page).toHaveURL('/candidate/demo/summary');
  await expect(page.getByRole('button', { name: 'この内容で確認を完了する' })).toBeDisabled();
  await expect(page.getByText('未回答', { exact: true })).toHaveCount(4);
  await start(page);
  await expect(page.getByRole('button', { name: 'この回答で次へ' })).toBeDisabled();
  await page.getByLabel('この質問への回答').fill('   ');
  await expect(page.getByRole('button', { name: 'この回答で次へ' })).toBeDisabled();
  await page
    .getByLabel('この質問への回答')
    .fill('まだ職種を決めていませんが、ものづくりに興味があります。');
  await page.getByRole('button', { name: 'この回答で次へ' }).click();
  await page.getByRole('link', { name: 'ここまでの要約を見る' }).click();
  await expect(page.getByText('未回答', { exact: true })).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'この内容で確認を完了する' })).toBeDisabled();
  await page.getByRole('link', { name: '仕事の希望を見直す' }).click();
  await page.getByRole('radio', { name: /まだ決まっていない/ }).check();
  await page.getByRole('link', { name: '対話画面へ進む' }).click();
  await page.getByRole('link', { name: 'ここまでの要約を見る' }).click();
  await expect(page.locator('.answer-summary')).toHaveText(
    'まだ職種を決めていませんが、ものづくりに興味があります。',
  );
  await page.reload();
  await expect(page.getByText('未回答', { exact: true })).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'この内容で確認を完了する' })).toBeDisabled();
});
