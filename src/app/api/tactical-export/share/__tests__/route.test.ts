import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSharedExportMemoryStore } from '@/lib/tactical/export/share-store';
import { DELETE, GET, POST } from '../route';

describe('src/app/api/tactical-export/share/route', () => {
  beforeEach(() => {
    clearSharedExportMemoryStore();
  });

  const mockPayload = {
    version: 1,
    createdAt: Date.now(),
    title: 'Test Tactical Share',
    orientation: 'vertical' as const,
    aspectRatio: '9:16' as const,
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

  it('lists shared export data when id is not provided', async () => {
    // 2件作成
    const req1 = new NextRequest(
      'http://localhost:3000/api/tactical-export/share',
      {
        method: 'POST',
        body: JSON.stringify({
          ...mockPayload,
          title: 'Project 1',
          createdAt: 1000,
        }),
      },
    );
    const res1 = await POST(req1);
    const data1 = await res1.json();

    const req2 = new NextRequest(
      'http://localhost:3000/api/tactical-export/share',
      {
        method: 'POST',
        body: JSON.stringify({
          ...mockPayload,
          title: 'Project 2',
          createdAt: 2000,
        }),
      },
    );
    const res2 = await POST(req2);
    const data2 = await res2.json();

    // GET /api/tactical-export/share (クエリパラメータなし)
    const listReq = new NextRequest(
      'http://localhost:3000/api/tactical-export/share',
      { method: 'GET' },
    );
    const listRes = await GET(listReq);
    expect(listRes.status).toBe(200);

    const listData = await listRes.json();
    expect(listData.success).toBe(true);
    expect(listData.items).toHaveLength(2);
    // 最新順 (createdAt 降順)
    expect(listData.items[0].shareId).toBe(data2.shareId);
    expect(listData.items[0].title).toBe('Project 2');
    expect(listData.items[1].shareId).toBe(data1.shareId);
    expect(listData.items[1].title).toBe('Project 1');
  });

  it('deletes shared export data via DELETE endpoint', async () => {
    const postReq = new NextRequest(
      'http://localhost:3000/api/tactical-export/share',
      {
        method: 'POST',
        body: JSON.stringify(mockPayload),
      },
    );
    const postRes = await POST(postReq);
    const { shareId } = await postRes.json();

    // 削除実行
    const delReq = new NextRequest(
      `http://localhost:3000/api/tactical-export/share?id=${shareId}`,
      { method: 'DELETE' },
    );
    const delRes = await DELETE(delReq);
    expect(delRes.status).toBe(200);
    const delData = await delRes.json();
    expect(delData.success).toBe(true);
    expect(delData.deleted).toBe(true);

    // 削除後は GET で 404
    const getReq = new NextRequest(
      `http://localhost:3000/api/tactical-export/share?id=${shareId}`,
      { method: 'GET' },
    );
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(404);

    // 存在しないIDの削除は 404
    const delReq2 = new NextRequest(
      `http://localhost:3000/api/tactical-export/share?id=non_existent_id`,
      { method: 'DELETE' },
    );
    const delRes2 = await DELETE(delReq2);
    expect(delRes2.status).toBe(404);
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
