import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterAll, describe, expect, it } from 'vitest';
import type { TuningDataset } from '@/lib/types/syntax-integration';
import { GET, POST } from '../route';

describe('src/app/api/syntax/save-tuning/route', () => {
  const testDatasetId = 'test_tuning_chelsea_fulham_001';
  const testFilePath = path.join(
    process.cwd(),
    'syntax',
    'pipeline',
    'tuning-dataset',
    `${testDatasetId}.json`,
  );

  const validPayload: TuningDataset = {
    datasetId: testDatasetId,
    timestamp: '2026-08-26T23:30:00.000Z',
    matchMetadata: {
      homeTeam: 'Chelsea',
      awayTeam: 'Fulham',
      actionType: 'Open Play Breakdown',
    },
    aiDraft: {
      version: '1.0.0',
      tacticalScenes: [
        {
          id: 'scene-1',
          title: 'Initial AI Build-up',
          description: 'AI detected build-up scene',
          players: [
            {
              id: 'p1',
              team: 'home',
              jerseyNumber: 8,
              x: 45.5,
              y: 50.0,
              annotation: 'Playmaker',
            },
            {
              id: 'p2',
              team: 'away',
              jerseyNumber: 4,
              x: 55.0,
              y: 52.0,
            },
          ],
          arrows: [
            {
              id: 'a1',
              type: 'pass',
              startX: 45.5,
              startY: 50.0,
              endX: 60.0,
              endY: 70.0,
            },
          ],
          zones: [
            {
              id: 'z1',
              type: 'space',
              points: [
                { x: 40, y: 40 },
                { x: 60, y: 40 },
                { x: 60, y: 60 },
              ],
            },
          ],
        },
      ],
    },
    humanGroundTruth: {
      version: '1.0.0',
      tacticalScenes: [
        {
          id: 'scene-1',
          title: 'Corrected Build-up',
          description: 'Human corrected player coordinate',
          players: [
            {
              id: 'p1',
              team: 'home',
              jerseyNumber: 8,
              x: 42.0,
              y: 48.0,
              annotation: 'Enzo',
            },
            {
              id: 'p2',
              team: 'away',
              jerseyNumber: 4,
              x: 56.0,
              y: 51.0,
            },
          ],
          arrows: [
            {
              id: 'a1',
              type: 'pass',
              startX: 42.0,
              startY: 48.0,
              endX: 65.0,
              endY: 75.0,
            },
          ],
        },
      ],
    },
  };

  afterAll(async () => {
    // テスト後に生成されたファイルをクリーンアップ
    try {
      await fs.unlink(testFilePath);
    } catch {
      // ファイルが存在しない場合は無視
    }
  });

  it('saves tuning dataset successfully on valid POST request', async () => {
    const postReq = new NextRequest(
      'http://localhost:3000/api/syntax/save-tuning',
      {
        method: 'POST',
        body: JSON.stringify(validPayload),
      },
    );

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);

    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.datasetId).toBe(testDatasetId);
    expect(postData.savedPath).toBe(
      `syntax/pipeline/tuning-dataset/${testDatasetId}.json`,
    );

    // ファイルが実際に保存されていることを確認
    const savedFileContent = await fs.readFile(testFilePath, 'utf-8');
    const parsedSavedData = JSON.parse(savedFileContent);
    expect(parsedSavedData.datasetId).toBe(testDatasetId);
    expect(parsedSavedData.matchMetadata.homeTeam).toBe('Chelsea');
    expect(
      parsedSavedData.humanGroundTruth.tacticalScenes[0].players[0].annotation,
    ).toBe('Enzo');
  });

  it('retrieves saved tuning dataset successfully on GET request', async () => {
    const getReq = new NextRequest(
      `http://localhost:3000/api/syntax/save-tuning?id=${testDatasetId}`,
      { method: 'GET' },
    );

    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);

    const getData = await getRes.json();
    expect(getData.success).toBe(true);
    expect(getData.data.datasetId).toBe(testDatasetId);
    expect(getData.data.matchMetadata.actionType).toBe('Open Play Breakdown');
  });

  it('returns 400 when body fails Zod schema validation (e.g. out-of-range coordinates)', async () => {
    const invalidPayload = {
      ...validPayload,
      aiDraft: {
        version: '1.0.0',
        tacticalScenes: [
          {
            id: 'scene-1',
            players: [
              {
                id: 'p1',
                team: 'home',
                x: 150.0, // Invalid: max is 100
                y: 50.0,
              },
            ],
          },
        ],
      },
    };

    const postReq = new NextRequest(
      'http://localhost:3000/api/syntax/save-tuning',
      {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      },
    );

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(400);

    const postData = await postRes.json();
    expect(postData.error).toBe('Invalid tuning dataset schema');
    expect(postData.details).toBeDefined();
  });

  it('returns 400 when missing required fields (e.g. humanGroundTruth)', async () => {
    const invalidPayload = {
      datasetId: 'invalid_dataset',
      timestamp: '2026-08-26T23:30:00.000Z',
      matchMetadata: {
        homeTeam: 'Chelsea',
        awayTeam: 'Fulham',
        actionType: 'Open Play Breakdown',
      },
      aiDraft: validPayload.aiDraft,
    };

    const postReq = new NextRequest(
      'http://localhost:3000/api/syntax/save-tuning',
      {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      },
    );

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(400);
  });

  it('returns 400 when GET request has no id query parameter', async () => {
    const getReq = new NextRequest(
      'http://localhost:3000/api/syntax/save-tuning',
      {
        method: 'GET',
      },
    );

    const getRes = await GET(getReq);
    expect(getRes.status).toBe(400);
  });

  it('returns 404 when GET request specifies non-existent dataset id', async () => {
    const getReq = new NextRequest(
      'http://localhost:3000/api/syntax/save-tuning?id=non_existent_id_99999',
      { method: 'GET' },
    );

    const getRes = await GET(getReq);
    expect(getRes.status).toBe(404);
  });
});
