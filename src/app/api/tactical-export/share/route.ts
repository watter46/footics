import { type NextRequest, NextResponse } from 'next/server';
import { TacticalExportSharePayloadSchema } from '@/lib/tactical/export/share-payload';
import {
  getSharedExportData,
  saveSharedExportData,
} from '@/lib/tactical/export/share-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = TacticalExportSharePayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: '不正な共有データフォーマットです',
          details: parseResult.error.format(),
        },
        { status: 400 },
      );
    }

    const payload = parseResult.data;

    // シーンが空または1件未満の場合はエラー
    if (!payload.scenes || payload.scenes.length < 1) {
      return NextResponse.json(
        { error: 'エクスポートには1つ以上のシーンが必要です' },
        { status: 400 },
      );
    }

    // 24時間 (86400秒) 保存
    const shareId = await saveSharedExportData(payload, 86400);

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl: `/export/share/${shareId}`,
      expiresInSeconds: 86400,
    });
  } catch (err) {
    console.error('Failed to create export share:', err);
    return NextResponse.json(
      {
        error: '共有URLの発行に失敗しました',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('id');

    if (!shareId) {
      return NextResponse.json(
        { error: '共有ID (id) が指定されていません' },
        { status: 400 },
      );
    }

    const data = await getSharedExportData(shareId);

    if (!data) {
      return NextResponse.json(
        {
          error:
            '指定されたエクスポートデータが見つからないか、有効期限 (24時間) が切れています',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('Failed to retrieve export share:', err);
    return NextResponse.json(
      {
        error: 'データの取得に失敗しました',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
