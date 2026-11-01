import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportAllDataZip, importAllDataZip } from '../data-management';
import { uint8ArrayToBlob } from '../data-management-helpers';
import {
  getAllPlayerMasters,
  saveCustomEvent,
  savePlayerMaster,
  savePlayerPhoto,
} from '../db/queries';
import { db } from '../db/schema';
import { ensureTacticalProject } from '../types/tactical-unified';

describe('src/lib/data-management', () => {
  beforeEach(async () => {
    await db.custom_events.clear();
    await db.match_memos.clear();
    await db.matches.clear();
    await db.events.clear();
    await db.keyval.clear();
    await db.players.clear();
    await db.player_photos.clear();
    await db.tactical_projects.clear();
    vi.restoreAllMocks();
  });

  describe('uint8ArrayToBlob', () => {
    it('creates a slice of exact size and content when byteOffset > 0', async () => {
      const fullBuffer = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
      // Subarray with offset = 2, length = 4 -> [30, 40, 50, 60]
      const subArray = fullBuffer.subarray(2, 6);
      expect(subArray.byteOffset).toBe(2);
      expect(subArray.length).toBe(4);

      const blob = uint8ArrayToBlob(subArray, 'application/octet-stream');
      expect(blob.size).toBe(4);

      const arrayBuf = await blob.arrayBuffer();
      const resultBytes = new Uint8Array(arrayBuf);
      expect(Array.from(resultBytes)).toEqual([30, 40, 50, 60]);
    });
  });

  describe('exportAllDataZip', () => {
    it('exports player photos to separate photos/ folder and creates valid ZIP', async () => {
      let generatedBlob: Blob | MediaSource | null = null;
      vi.spyOn(window.URL, 'createObjectURL').mockImplementation(
        (blob: Blob | MediaSource) => {
          generatedBlob = blob;
          return 'blob:http://localhost/test-zip-url';
        },
      );
      vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

      const clickSpy = vi.fn();
      vi.spyOn(document, 'createElement').mockImplementation(
        (tagName: string) => {
          if (tagName === 'a') {
            return {
              href: '',
              download: '',
              click: clickSpy,
            } as unknown as HTMLAnchorElement;
          }
          return document.createElement(tagName);
        },
      );

      // 1. Setup test data: Player with photoBlob, Player without, Standalone Photo, Tactical Project, KeyVal
      const sampleBlob = new Blob(['sample-image-binary-data'], {
        type: 'image/png',
      });
      const standaloneBlob = new Blob(['standalone-image-bytes'], {
        type: 'image/webp',
      });

      await savePlayerMaster({
        id: '26-27_100',
        playerId: 100,
        name: 'Cole Palmer',
        season: '26-27',
        defaultShirtNo: 10,
        position: 'MID',
        photoBlob: sampleBlob,
        teamName: 'Chelsea',
      });

      await savePlayerMaster({
        id: '26-27_101',
        playerId: 101,
        name: 'Enzo Fernandez',
        season: '26-27',
        defaultShirtNo: 8,
        position: 'MID',
        teamName: 'Chelsea',
      });

      // Standalone photo not tied to a player record
      await savePlayerPhoto(9999, standaloneBlob);

      await saveCustomEvent({
        id: '11111111-1111-4111-8111-111111111111',
        match_id: 'match-1',
        period: 1,
        minute: 10,
        second: 0,
        labels: ['Goal'],
        memo: 'Super goal',
        created_at: 1000,
      });

      const mockProject = ensureTacticalProject({
        id: 'proj-1',
        title: 'Project 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        aspectRatio: '16:9',
        backgroundType: 'pitch',
        phases: [],
      });
      await db.tactical_projects.put(mockProject);
      await db.keyval.put({
        key: 'test-key',
        value: 'test-val',
        updatedAt: 1000,
      });

      // 2. Run export
      await exportAllDataZip();

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(generatedBlob).not.toBeNull();

      // 3. Inspect ZIP contents using fflate
      const buf = await (generatedBlob as unknown as Blob).arrayBuffer();
      const unzipped = unzipSync(new Uint8Array(buf));

      // manifest.json
      expect(unzipped['manifest.json']).toBeDefined();
      const manifest = JSON.parse(strFromU8(unzipped['manifest.json']));
      expect(manifest.version).toBe(5);
      expect(manifest.playerCount).toBe(2);
      expect(manifest.photoCount).toBe(2); // 100 and 9999
      expect(manifest.tacticalProjectCount).toBe(1);

      // tactical_projects.json & keyval.json
      expect(unzipped['tactical_projects.json']).toBeDefined();
      const tacticalProjects = JSON.parse(
        strFromU8(unzipped['tactical_projects.json']),
      );
      expect(tacticalProjects).toHaveLength(1);
      expect(tacticalProjects[0].id).toBe('proj-1');

      expect(unzipped['keyval.json']).toBeDefined();
      const keyvalEntries = JSON.parse(strFromU8(unzipped['keyval.json']));
      expect(keyvalEntries).toHaveLength(1);
      expect(keyvalEntries[0].key).toBe('test-key');

      // player_photos.json metadata
      expect(unzipped['player_photos.json']).toBeDefined();
      const playerPhotosMeta = JSON.parse(
        strFromU8(unzipped['player_photos.json']),
      );
      expect(playerPhotosMeta).toHaveLength(2);

      // players.json
      expect(unzipped['players.json']).toBeDefined();
      const players = JSON.parse(strFromU8(unzipped['players.json']));
      expect(players).toHaveLength(2);

      const palmer = players.find(
        (p: { playerId: number }) => p.playerId === 100,
      );
      expect(palmer.photoFileName).toBeDefined();
      expect(palmer.photoBlob).toBeUndefined(); // photoBlob should not be serialized to JSON

      const enzo = players.find(
        (p: { playerId: number }) => p.playerId === 101,
      );
      expect(enzo.photoFileName).toBeUndefined();

      // photos/ folder: both playerId=100 and standalone 9999 must exist
      expect(unzipped[`photos/${palmer.photoFileName}`]).toBeDefined();
      const photoBlobText = strFromU8(
        unzipped[`photos/${palmer.photoFileName}`],
      );
      expect(photoBlobText).toBe('sample-image-binary-data');

      // Standalone photo 9999
      const photo9999Entry = playerPhotosMeta.find(
        (p: { playerId: number }) => p.playerId === 9999,
      );
      expect(photo9999Entry).toBeDefined();
      expect(unzipped[`photos/${photo9999Entry.photoFileName}`]).toBeDefined();
      expect(
        strFromU8(unzipped[`photos/${photo9999Entry.photoFileName}`]),
      ).toBe('standalone-image-bytes');
    });
  });

  describe('importAllDataZip', () => {
    it('restores players and their photo blobs correctly from v5 ZIP', async () => {
      const files: Record<string, Uint8Array> = {
        'manifest.json': strToU8(
          JSON.stringify({
            version: 5,
            matchCount: 1,
            playerCount: 1,
            photoCount: 1,
          }),
        ),
        'memos.json': strToU8(
          JSON.stringify({
            event_memos: [],
            custom_events: [],
            match_memos: [],
            tactical_snapshots: [],
          }),
        ),
        'matches.json': strToU8(JSON.stringify([])),
        'events.json': strToU8(JSON.stringify([])),
        'players.json': strToU8(
          JSON.stringify([
            {
              id: '26-27_200',
              playerId: 200,
              name: 'Reece James',
              season: '26-27',
              defaultShirtNo: 24,
              position: 'DF',
              teamName: 'Chelsea',
              photoFileName: '200.png',
            },
          ]),
        ),
        'photos/200.png': new TextEncoder().encode('fake-image-bytes'),
      };

      const zipped = zipSync(files);
      const mockFile = new File([zipped as unknown as BlobPart], 'backup.zip', {
        type: 'application/zip',
      });

      const result = await importAllDataZip(mockFile);

      expect(result.playerCount).toBe(1);
      expect(result.photoCount).toBe(1);

      const allPlayers = await getAllPlayerMasters();
      expect(allPlayers).toHaveLength(1);
      expect(allPlayers[0].name).toBe('Reece James');
      expect(allPlayers[0].photoBlob).toBeDefined();

      const arrayBuffer = await (allPlayers[0].photoBlob as Blob).arrayBuffer();
      const blobText = new TextDecoder().decode(arrayBuffer);
      expect(blobText).toBe('fake-image-bytes');

      // Verify separation: db.players table has no photoBlob, db.player_photos has it
      const rawDbPlayer = await db.players.get('26-27_200');
      expect(rawDbPlayer?.photoBlob).toBeUndefined();
      const rawDbPhoto = await db.player_photos.get(200);
      expect(rawDbPhoto?.photoBlob).toBeDefined();
    });

    it('restores tactical_projects and keyval and standalone photos', async () => {
      const mockProject = ensureTacticalProject({
        id: 'proj-imported',
        title: 'Imported Tactical Plan',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        aspectRatio: '16:9',
        backgroundType: 'pitch',
        phases: [],
      });

      const files: Record<string, Uint8Array> = {
        'manifest.json': strToU8(
          JSON.stringify({
            version: 5,
            matchCount: 0,
            playerCount: 0,
            photoCount: 1,
            tacticalProjectCount: 1,
          }),
        ),
        'tactical_projects.json': strToU8(
          JSON.stringify([mockProject], null, 2),
        ),
        'keyval.json': strToU8(
          JSON.stringify(
            [{ key: 'active-theme', value: 'dark', updatedAt: 2000 }],
            null,
            2,
          ),
        ),
        'player_photos.json': strToU8(
          JSON.stringify(
            [
              {
                playerId: 5555,
                mimeType: 'image/png',
                photoFileName: '5555.png',
                updatedAt: 12345,
              },
            ],
            null,
            2,
          ),
        ),
        'photos/5555.png': new TextEncoder().encode('photo-5555-bytes'),
      };

      const zipped = zipSync(files);
      const mockFile = new File(
        [zipped as unknown as BlobPart],
        'full_backup.zip',
        {
          type: 'application/zip',
        },
      );

      const result = await importAllDataZip(mockFile);

      expect(result.tacticalProjectCount).toBe(1);
      expect(result.photoCount).toBe(1);

      // Verify db.tactical_projects
      const savedProject = await db.tactical_projects.get('proj-imported');
      expect(savedProject).toBeDefined();
      expect(savedProject?.title).toBe('Imported Tactical Plan');

      // Verify db.keyval
      const savedKeyval = await db.keyval.get('active-theme');
      expect(savedKeyval?.value).toBe('dark');

      // Verify db.player_photos standalone
      const savedPhoto = await db.player_photos.get(5555);
      expect(savedPhoto).toBeDefined();
      const photoBytes = await savedPhoto!.photoBlob.arrayBuffer();
      expect(new TextDecoder().decode(photoBytes)).toBe('photo-5555-bytes');
    });

    it('auto-merges temporary negative ID player with incoming official ID player', async () => {
      // 1. Existing manual player with temp ID (-777), photo, and shirtNo 41
      const manualPhoto = new Blob(['manual-photo-data'], {
        type: 'image/jpeg',
      });
      await savePlayerMaster({
        id: '26-27_-777',
        playerId: -777,
        name: 'Estêvão',
        season: '26-27',
        defaultShirtNo: 41,
        position: 'RW',
        teamName: 'Chelsea',
        photoBlob: manualPhoto,
      });

      // 2. Incoming backup has official player (playerId 777, name "Estevao", shirtNo undefined, Sub)
      const files: Record<string, Uint8Array> = {
        'manifest.json': strToU8(
          JSON.stringify({
            version: 5,
            playerCount: 1,
          }),
        ),
        'players.json': strToU8(
          JSON.stringify([
            {
              id: '26-27_777',
              playerId: 777,
              name: 'Estevao',
              season: '26-27',
              defaultShirtNo: undefined,
              position: 'Sub',
              teamName: 'Chelsea',
            },
          ]),
        ),
      };

      const zipped = zipSync(files);
      const mockFile = new File(
        [zipped as unknown as BlobPart],
        'merge_backup.zip',
        {
          type: 'application/zip',
        },
      );

      const result = await importAllDataZip(mockFile);
      expect(result.playerCount).toBe(1);

      // Verify temp player is deleted
      const tempRecord = await db.players.get('26-27_-777');
      expect(tempRecord).toBeUndefined();
      const tempPhoto = await db.player_photos.get(-777);
      expect(tempPhoto).toBeUndefined();

      // Verify official player has inherited manual shirtNo and photo
      const officialRecord = await db.players.get('26-27_777');
      expect(officialRecord).toBeDefined();
      expect(officialRecord?.defaultShirtNo).toBe(41);
      expect(officialRecord?.position).toBe('RW');

      const officialPhoto = await db.player_photos.get(777);
      expect(officialPhoto).toBeDefined();
      const photoBytes = await officialPhoto!.photoBlob.arrayBuffer();
      expect(new TextDecoder().decode(photoBytes)).toBe('manual-photo-data');
    });

    it('supports backward compatibility with older v4 backups without photos folder', async () => {
      const files: Record<string, Uint8Array> = {
        'manifest.json': strToU8(
          JSON.stringify({
            version: 4,
            matchCount: 1,
            playerCount: 1,
          }),
        ),
        'memos.json': strToU8(
          JSON.stringify({
            event_memos: [],
            custom_events: [],
            match_memos: [],
            tactical_snapshots: [],
          }),
        ),
        'matches.json': strToU8(JSON.stringify([])),
        'events.json': strToU8(JSON.stringify([])),
        'players.json': strToU8(
          JSON.stringify([
            {
              id: '26-27_300',
              playerId: 300,
              name: 'Moises Caicedo',
              season: '26-27',
              defaultShirtNo: 25,
              position: 'MID',
              teamName: 'Chelsea',
            },
          ]),
        ),
      };

      const zipped = zipSync(files);
      const mockFile = new File(
        [zipped as unknown as BlobPart],
        'legacy_backup.zip',
        {
          type: 'application/zip',
        },
      );

      const result = await importAllDataZip(mockFile);

      expect(result.playerCount).toBe(1);
      expect(result.photoCount).toBe(0);

      const allPlayers = await getAllPlayerMasters();
      expect(allPlayers).toHaveLength(1);
      expect(allPlayers[0].name).toBe('Moises Caicedo');
      expect(allPlayers[0].photoBlob).toBeUndefined();
    });
  });
});
