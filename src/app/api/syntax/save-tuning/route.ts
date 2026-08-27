import { promises as fs } from 'node:fs';
import path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import { TuningDatasetSchema } from '@/lib/types/syntax-integration';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = TuningDatasetSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid tuning dataset schema',
          details: parseResult.error.format(),
        },
        { status: 400 },
      );
    }

    const payload = parseResult.data;

    // パストラバーサル防止のためのサニタイズ
    const safeId = payload.datasetId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const relativeDir = path.join('syntax', 'pipeline', 'tuning-dataset');
    const outputDir = path.join(process.cwd(), relativeDir);
    const fileName = `${safeId}.json`;
    const filePath = path.join(outputDir, fileName);

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      datasetId: payload.datasetId,
      savedPath: path.posix.join(
        'syntax',
        'pipeline',
        'tuning-dataset',
        fileName,
      ),
      message: 'Tuning dataset saved successfully',
    });
  } catch (err) {
    console.error('Failed to save tuning dataset:', err);
    return NextResponse.json(
      {
        error: 'Failed to save tuning dataset',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('id');

    if (!datasetId) {
      return NextResponse.json(
        { error: 'datasetId (id) is required' },
        { status: 400 },
      );
    }

    const safeId = datasetId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(
      process.cwd(),
      'syntax',
      'pipeline',
      'tuning-dataset',
      `${safeId}.json`,
    );

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      const parseResult = TuningDatasetSchema.safeParse(data);

      if (!parseResult.success) {
        return NextResponse.json(
          {
            error: 'Stored dataset format is invalid',
            details: parseResult.error.format(),
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: parseResult.data,
      });
    } catch (readErr: unknown) {
      if (
        readErr &&
        typeof readErr === 'object' &&
        'code' in readErr &&
        readErr.code === 'ENOENT'
      ) {
        return NextResponse.json(
          { error: `Tuning dataset "${datasetId}" not found` },
          { status: 404 },
        );
      }
      throw readErr;
    }
  } catch (err) {
    console.error('Failed to retrieve tuning dataset:', err);
    return NextResponse.json(
      {
        error: 'Failed to retrieve tuning dataset',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
