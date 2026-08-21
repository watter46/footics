import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { GET, POST } from '../route';

describe('src/app/api/tactical-export/share/route', () => {
  const mockPayload = {
    version: 1,
    createdAt: Date.now(),
    title: 'Test Tactical Share',
    orientation: 'vertical' as const,
    teamVisibility: 'both' as const,
    exportFps: 30,
    scenes: [
      {
        id: 'scene-1',
        durationMs: 1500,
        pauseMs: 500,
        easing: 'easeInOut',
        players: {
          '1': {
            playerId: '1',
            name: 'Robert Sánchez',
            shirtNo: '1',
            team: 'home',
            position: { x: 50, y: 90 },
            options: {
              color: '#034694',
              insideContent: 'photo',
            },
          },
        },
      },
      {
        id: 'scene-2',
        durationMs: 1500,
        pauseMs: 500,
        easing: 'easeInOut',
        players: {
          '1': {
            playerId: '1',
            name: 'Robert Sánchez',
            shirtNo: '1',
            team: 'home',
            position: { x: 50, y: 80 },
            options: {
              color: '#034694',
              insideContent: 'photo',
            },
          },
        },
      },
    ],
    photos: {
      '1': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
  };

  it('creates share link and retrieves it successfully', async () => {
    // 1. POST で共有データを作成
    const postReq = new NextRequest(
      'http://localhost:3000/api/tactical-export/share',
      {
        method: 'POST',
        body: JSON.stringify(mockPayload),
      },
    );

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);

    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.shareId).toBeDefined();
    expect(postData.shareUrl).toBe(`/export/share/${postData.shareId}`);

    // 2. GET でデータを取得
    const getReq = new NextRequest(
      `http://localhost:3000/api/tactical-export/share?id=${postData.shareId}`,
      { method: 'GET' },
    );

    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);

    const getData = await getRes.json();
    expect(getData.success).toBe(true);
    expect(getData.data.title).toBe('Test Tactical Share');
    expect(getData.data.scenes).toHaveLength(2);
    expect(getData.data.photos['1']).toBe(mockPayload.photos['1']);
  });

  it('returns 400 when scenes is empty', async () => {
    const invalidPayload = {
      ...mockPayload,
      scenes: [],
    };

    const postReq = new NextRequest(
      'http://localhost:3000/api/tactical-export/share',
      {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      },
    );

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(400);
  });

  it('returns 404 when shareId does not exist', async () => {
    const getReq = new NextRequest(
      'http://localhost:3000/api/tactical-export/share?id=non_existent_id_99999',
      { method: 'GET' },
    );

    const getRes = await GET(getReq);
    expect(getRes.status).toBe(404);
  });
});
