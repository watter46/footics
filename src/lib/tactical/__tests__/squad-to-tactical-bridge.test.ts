import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTacticalUnifiedStore,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  convertSquadToTacticalPlayers,
  injectTeamSquadToTactical,
  type SquadPlayerItem,
} from '../squad-to-tactical-bridge';

describe('squad-to-tactical-bridge', () => {
  const sampleSquad: SquadPlayerItem[] = [
    {
      playerId: 345001,
      name: 'Robert Sánchez',
      shirtNo: 1,
      position: 'GK',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 197,
      weight: 90,
      age: 27,
      isManOfTheMatch: false,
    },
    {
      playerId: 345004,
      name: 'Malo Gusto',
      shirtNo: 27,
      position: 'DR',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 179,
      weight: 74,
      age: 21,
      isManOfTheMatch: false,
    },
    {
      playerId: 345005,
      name: 'Wesley Fofana',
      shirtNo: 29,
      position: 'DC',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 190,
      weight: 84,
      age: 24,
      isManOfTheMatch: false,
    },
    {
      playerId: 345006,
      name: 'Levi Colwill',
      shirtNo: 6,
      position: 'DC',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 187,
      weight: 80,
      age: 22,
      isManOfTheMatch: false,
    },
    {
      playerId: 345007,
      name: 'Marc Cucurella',
      shirtNo: 3,
      position: 'DL',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 173,
      weight: 66,
      age: 26,
      isManOfTheMatch: false,
    },
    {
      playerId: 345010,
      name: 'Moisés Caicedo',
      shirtNo: 25,
      position: 'DMC',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 178,
      weight: 73,
      age: 23,
      isManOfTheMatch: false,
    },
    {
      playerId: 345011,
      name: 'Enzo Fernández',
      shirtNo: 8,
      position: 'MC',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 178,
      weight: 76,
      age: 24,
      isManOfTheMatch: false,
    },
    {
      playerId: 345012,
      name: 'Noni Madueke',
      shirtNo: 11,
      position: 'AMR',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 182,
      weight: 75,
      age: 23,
      isManOfTheMatch: false,
    },
    {
      playerId: 345014,
      name: 'Cole Palmer',
      shirtNo: 20,
      position: 'AMC',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 189,
      weight: 74,
      age: 22,
      isManOfTheMatch: false,
    },
    {
      playerId: 345015,
      name: 'Pedro Neto',
      shirtNo: 7,
      position: 'AML',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 173,
      weight: 68,
      age: 24,
      isManOfTheMatch: false,
    },
    {
      playerId: 345016,
      name: 'Nicolas Jackson',
      shirtNo: 15,
      position: 'FW',
      isFirstEleven: true,
      field: 'home',
      stats: {},
      height: 187,
      weight: 78,
      age: 23,
      isManOfTheMatch: false,
    },
    // Sub
    {
      playerId: 345002,
      name: 'Filip Jörgensen',
      shirtNo: 12,
      position: 'GK',
      isFirstEleven: false,
      field: 'home',
      stats: {},
      height: 190,
      weight: 82,
      age: 22,
      isManOfTheMatch: false,
    },
    {
      playerId: 345017,
      name: 'Christopher Nkunku',
      shirtNo: 18,
      position: 'FW',
      isFirstEleven: false,
      field: 'home',
      stats: {},
      height: 175,
      weight: 73,
      age: 27,
      isManOfTheMatch: false,
    },
  ];

  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('converts squad players into 11 pitch starters and bench substitutes', () => {
    const tacticalPlayers = convertSquadToTacticalPlayers(sampleSquad, {
      team: 'home',
      formation: '4-2-3-1',
      mode: 'half',
      primaryColor: '#034694',
    });

    const pitchPlayers = tacticalPlayers.filter((p) => p.area === 'pitch');
    const benchPlayers = tacticalPlayers.filter((p) => p.area === 'bench');

    expect(pitchPlayers.length).toBe(11);
    expect(benchPlayers.length).toBe(2);

    // 選手情報が正しくマッピングされていること
    const palmer = pitchPlayers.find((p) => p.name === 'Cole Palmer');
    expect(palmer).toBeDefined();
    expect(palmer?.shirtNo).toBe('20');
    expect(palmer?.team).toBe('home');

    // ベンチ選手
    const nkunku = benchPlayers.find((p) => p.name === 'Christopher Nkunku');
    expect(nkunku).toBeDefined();
    expect(nkunku?.shirtNo).toBe('18');
  });

  it('injects team squad directly into useTacticalUnifiedStore active slide', () => {
    const store = useTacticalUnifiedStore.getState();
    const activeSlideId = store.activeSlideId;

    injectTeamSquadToTactical({
      teamName: 'Chelsea FC',
      team: 'home',
      players: sampleSquad,
      formation: '4-2-3-1',
      mode: 'half',
    });

    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);

    expect(updatedSlide).toBeDefined();

    const homePitch =
      updatedSlide?.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      ) || [];
    const homeBench =
      updatedSlide?.players.filter(
        (p) => p.team === 'home' && p.area === 'bench',
      ) || [];
    const awayPlayers =
      updatedSlide?.players.filter((p) => p.team === 'away') || [];

    expect(homePitch.length).toBe(11);
    expect(homeBench.length).toBe(2);
    // 相手チーム選手が保持されていること
    expect(awayPlayers.length).toBeGreaterThan(0);
  });

  it('injects squad into custom storeApi without polluting default store', () => {
    const customStore = createTacticalUnifiedStore();
    const activeSlideId = customStore.getState().activeSlideId;

    injectTeamSquadToTactical({
      teamName: 'Chelsea FC',
      team: 'home',
      players: sampleSquad,
      formation: '4-2-3-1',
      mode: 'half',
      storeApi: customStore,
    });

    const updatedSlide = customStore
      .getState()
      .project.slides.find((s) => s.id === activeSlideId);
    expect(updatedSlide).toBeDefined();
    const homePitch =
      updatedSlide?.players.filter(
        (p) => p.team === 'home' && p.area === 'pitch',
      ) || [];
    expect(homePitch.length).toBe(11);

    const defaultSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find(
        (s) => s.id === useTacticalUnifiedStore.getState().activeSlideId,
      );
    expect(defaultSlide?.players.some((p) => p.name === 'Cole Palmer')).toBe(
      false,
    );
  });

  it('correctly sets photoUrl and insideContent for players with and without photos', () => {
    const squadWithPhotos: SquadPlayerItem[] = [
      {
        playerId: 101,
        name: 'Player With Photo',
        shirtNo: 10,
        isFirstEleven: true,
        photoUrl: 'https://example.com/player.png',
      },
      {
        playerId: 102,
        name: 'Player Without Photo',
        shirtNo: 7,
        isFirstEleven: true,
      },
      {
        playerId: 103,
        name: 'Sub With Photo',
        shirtNo: 12,
        isFirstEleven: false,
        photoUrl: 'https://example.com/sub.png',
      },
      {
        playerId: 104,
        name: 'Sub Without Photo',
        shirtNo: 14,
        isFirstEleven: false,
      },
      {
        playerId: 105,
        name: 'Player With Blob',
        shirtNo: 9,
        isFirstEleven: true,
        photoBlob: new Blob(['blob-data'], { type: 'image/webp' }),
      },
      {
        playerId: 106,
        name: 'Sub With Blob',
        shirtNo: 19,
        isFirstEleven: false,
        photoBlob: new Blob(['blob-data-sub'], { type: 'image/webp' }),
      },
      {
        playerId: 107,
        name: 'Player With Both Url And Blob',
        shirtNo: 11,
        isFirstEleven: true,
        photoUrl: 'https://example.com/both.png',
        photoBlob: new Blob(['blob-data-both'], { type: 'image/webp' }),
      },
    ];

    const tacticalPlayers = convertSquadToTacticalPlayers(squadWithPhotos, {
      team: 'home',
      primaryColor: '#034694',
    });

    const withPhoto = tacticalPlayers.find(
      (p) => p.name === 'Player With Photo',
    );
    const withoutPhoto = tacticalPlayers.find(
      (p) => p.name === 'Player Without Photo',
    );
    const subWithPhoto = tacticalPlayers.find(
      (p) => p.name === 'Sub With Photo',
    );
    const subWithoutPhoto = tacticalPlayers.find(
      (p) => p.name === 'Sub Without Photo',
    );
    const withBlob = tacticalPlayers.find((p) => p.name === 'Player With Blob');
    const subWithBlob = tacticalPlayers.find((p) => p.name === 'Sub With Blob');
    const withBoth = tacticalPlayers.find(
      (p) => p.name === 'Player With Both Url And Blob',
    );

    expect(withPhoto?.style.insideContent).toBe('photo');
    expect(withPhoto?.style.photoUrl).toBe('https://example.com/player.png');

    expect(withoutPhoto?.style.insideContent).toBe('photo');
    expect(withoutPhoto?.style.photoUrl).toBeUndefined();

    expect(subWithPhoto?.style.insideContent).toBe('photo');
    expect(subWithPhoto?.style.photoUrl).toBe('https://example.com/sub.png');

    expect(subWithoutPhoto?.style.insideContent).toBe('photo');
    expect(subWithoutPhoto?.style.photoUrl).toBeUndefined();

    // photoBlob only: insideContent is 'photo', but temporary blob URL is NOT set (undefined)
    expect(withBlob?.style.insideContent).toBe('photo');
    expect(withBlob?.style.photoUrl).toBeUndefined();

    expect(subWithBlob?.style.insideContent).toBe('photo');
    expect(subWithBlob?.style.photoUrl).toBeUndefined();

    // both photoUrl and photoBlob: insideContent is 'photo', photoUrl is retained
    expect(withBoth?.style.insideContent).toBe('photo');
    expect(withBoth?.style.photoUrl).toBe('https://example.com/both.png');
  });

  it('correctly maps squad positions using matchPlayersToFormationPositions and complements sub positions', () => {
    // Enzo の position を 'Sub' にして、マッチした枠の position が補完されることを検証
    const squadWithSub: SquadPlayerItem[] = sampleSquad.map((p) =>
      p.playerId === 345011 ? { ...p, position: 'Sub' } : p,
    );

    const tacticalPlayers = convertSquadToTacticalPlayers(squadWithSub, {
      team: 'home',
      formation: '4-2-3-1',
      mode: 'full',
      primaryColor: '#034694',
    });

    const cucurella = tacticalPlayers.find((p) => p.name === 'Marc Cucurella');
    const gusto = tacticalPlayers.find((p) => p.name === 'Malo Gusto');
    const neto = tacticalPlayers.find((p) => p.name === 'Pedro Neto');
    const madueke = tacticalPlayers.find((p) => p.name === 'Noni Madueke');
    const jackson = tacticalPlayers.find((p) => p.name === 'Nicolas Jackson');
    const enzo = tacticalPlayers.find((p) => p.name === 'Enzo Fernández');

    expect(cucurella).toBeDefined();
    expect(gusto).toBeDefined();
    expect(neto).toBeDefined();
    expect(madueke).toBeDefined();
    expect(jackson).toBeDefined();
    expect(enzo).toBeDefined();

    // Cucurella (DL, left) y < 30
    expect(cucurella?.y).toBeLessThan(30);
    expect(cucurella?.position).toBe('DL');

    // Gusto (DR, right) y > 70
    expect(gusto?.y).toBeGreaterThan(70);
    expect(gusto?.position).toBe('DR');

    // Neto (AML, left wing) y < 30
    expect(neto?.y).toBeLessThan(30);

    // Madueke (AMR, right wing) y > 70
    expect(madueke?.y).toBeGreaterThan(70);

    // Jackson (FW, striker) x は最前線（GK側より大きい）
    expect(jackson?.x).toBeGreaterThan(gusto?.x ?? 0);

    // 元の position が 'Sub' だった Enzo には割り当てられた枠の position が補完される（'Sub' ではなく 'CM' または 'DM' 等）
    expect(enzo?.position).not.toBe('Sub');
    expect(['CM', 'DM', 'MC']).toContain(enzo?.position);
  });

  describe('GK fixed position in full mode', () => {
    it('places GK at fixed coordinates in full mode for 16:9 (horizontal pitch)', () => {
      const homePlayers = convertSquadToTacticalPlayers(sampleSquad, {
        team: 'home',
        formation: '4-2-3-1',
        mode: 'full',
        primaryColor: '#034694',
        aspectRatio: '16:9',
      });
      const homeGk = homePlayers.find(
        (p) => p.position === 'GK' && p.area === 'pitch',
      );
      expect(homeGk).toBeDefined();
      expect(homeGk?.x).toBe(7);
      expect(homeGk?.y).toBe(50);

      const awayPlayers = convertSquadToTacticalPlayers(sampleSquad, {
        team: 'away',
        formation: '4-2-3-1',
        mode: 'full',
        primaryColor: '#d11243',
        aspectRatio: '16:9',
      });
      const awayGk = awayPlayers.find(
        (p) => p.position === 'GK' && p.area === 'pitch',
      );
      expect(awayGk).toBeDefined();
      expect(awayGk?.x).toBe(93);
      expect(awayGk?.y).toBe(50);
    });

    it('places GK at fixed coordinates in full mode for 9:16 (vertical pitch)', () => {
      const homePlayers = convertSquadToTacticalPlayers(sampleSquad, {
        team: 'home',
        formation: '4-2-3-1',
        mode: 'full',
        primaryColor: '#034694',
        aspectRatio: '9:16',
      });
      const homeGk = homePlayers.find(
        (p) => p.position === 'GK' && p.area === 'pitch',
      );
      expect(homeGk).toBeDefined();
      expect(homeGk?.x).toBe(50);
      expect(homeGk?.y).toBe(93);

      const awayPlayers = convertSquadToTacticalPlayers(sampleSquad, {
        team: 'away',
        formation: '4-2-3-1',
        mode: 'full',
        primaryColor: '#d11243',
        aspectRatio: '9:16',
      });
      const awayGk = awayPlayers.find(
        (p) => p.position === 'GK' && p.area === 'pitch',
      );
      expect(awayGk).toBeDefined();
      expect(awayGk?.x).toBe(50);
      expect(awayGk?.y).toBe(7);
    });
  });
});
