import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportAllDataZip, importAllDataZip } from '../data-management';
import {
  getAllPlayerMasters,
  saveCustomEvent,
  savePlayerMaster,
} from '../db/queries';
import { db } from '../db/schema';

describe('src/lib/data-management', () => {
  beforeEach(async () => {
    await db.event_memos.clear();
    await db.custom_events.clear();
    await db.match_memos.clear();
    await db.tactical_snapshots.clear();
    await db.matches.clear();
    await db.events.clear();
    await db.keyval.clear();
    await db.players.clear();
    vi.restoreAllMocks();
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

      // 1. Setup test data: Player with photoBlob and Player without photoBlob
      const sampleBlob = new Blob(['sample-image-binary-data'], {
        type: 'image/png',
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

      // 2. Run export
      await exportAllDataZip();

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(generatedBlob).not.toBeNull();

      // 3. Inspect ZIP contents
      const zip = await JSZip.loadAsync(
        await (generatedBlob as unknown as Blob).arrayBuffer(),
      );

      // manifest.json
      const manifestFile = zip.file('manifest.json');
      expect(manifestFile).not.toBeNull();
      const manifestText = await manifestFile?.async('string');
      const manifest = JSON.parse(manifestText ?? '{}');
      expect(manifest.version).toBe(5);
      expect(manifest.playerCount).toBe(2);
      expect(manifest.photoCount).toBe(1);

      // players.json
      const playersFile = zip.file('players.json');
      expect(playersFile).not.toBeNull();
      const playersText = await playersFile?.async('string');
      const players = JSON.parse(playersText ?? '[]');
      expect(players).toHaveLength(2);

      const palmer = players.find((p: any) => p.playerId === 100);
      expect(palmer.photoFileName).toBeDefined();
      expect(palmer.photoBlob).toBeUndefined(); // photoBlob should not be serialized to JSON

      const enzo = players.find((p: any) => p.playerId === 101);
      expect(enzo.photoFileName).toBeUndefined();

      // photos/ folder
      const photoFile = zip.file(`photos/${palmer.photoFileName}`);
      expect(photoFile).not.toBeNull();
      const photoBlobText = await photoFile?.async('string');
      expect(photoBlobText).toBe('sample-image-binary-data');
    });
  });

  describe('importAllDataZip', () => {
    it('restores players and their photo blobs correctly from v5 ZIP', async () => {
      const zip = new JSZip();

      // manifest.json
      zip.file(
        'manifest.json',
        JSON.stringify({
          version: 5,
          matchCount: 1,
          playerCount: 1,
          photoCount: 1,
        }),
      );

      // memos.json
      zip.file(
        'memos.json',
        JSON.stringify({
          event_memos: [],
          custom_events: [],
          match_memos: [],
          tactical_snapshots: [],
        }),
      );

      // matches.json
      zip.file('matches.json', JSON.stringify([]));
      zip.file('events.json', JSON.stringify([]));

      // players.json & photos/
      zip.file(
        'players.json',
        JSON.stringify([
          {
            id: '26-27_200',
            playerId: 200,
            name: 'Reece James',
            season: '26-27',
            defaultShirtNo: 24,
            position: 'DF',
            teamName: 'Chelsea',
            photoFileName: '26-27_200.png',
          },
        ]),
      );
      zip.file(
        'photos/26-27_200.png',
        new TextEncoder().encode('fake-image-bytes'),
      );

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const mockFile = new File([zipBlob], 'backup.zip', {
        type: 'application/zip',
      });

      const result = await importAllDataZip(mockFile);

      expect(result.playerCount).toBe(1);
      expect(result.photoCount).toBe(1);

      const allPlayers = await getAllPlayerMasters();
      expect(allPlayers).toHaveLength(1);
      expect(allPlayers[0].name).toBe('Reece James');
      expect(allPlayers[0].photoBlob).toBeDefined();

      const arrayBuffer = await (allPlayers[0].photoBlob as any).arrayBuffer();
      const blobText = new TextDecoder().decode(arrayBuffer);
      expect(blobText).toBe('fake-image-bytes');
    });

    it('supports backward compatibility with older v4 backups without photos folder', async () => {
      const zip = new JSZip();

      zip.file(
        'manifest.json',
        JSON.stringify({
          version: 4,
          matchCount: 1,
          playerCount: 1,
        }),
      );

      zip.file(
        'memos.json',
        JSON.stringify({
          event_memos: [],
          custom_events: [],
          match_memos: [],
          tactical_snapshots: [],
        }),
      );

      zip.file('matches.json', JSON.stringify([]));
      zip.file('events.json', JSON.stringify([]));

      zip.file(
        'players.json',
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
      );

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const mockFile = new File([zipBlob], 'legacy_backup.zip', {
        type: 'application/zip',
      });

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
