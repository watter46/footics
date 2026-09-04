import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
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

    expect(withPhoto?.style.insideContent).toBe('photo');
    expect(withPhoto?.style.photoUrl).toBe('https://example.com/player.png');

    expect(withoutPhoto?.style.insideContent).toBe('number');
    expect(withoutPhoto?.style.photoUrl).toBeUndefined();

    expect(subWithPhoto?.style.insideContent).toBe('photo');
    expect(subWithPhoto?.style.photoUrl).toBe('https://example.com/sub.png');

    expect(subWithoutPhoto?.style.insideContent).toBe('number');
    expect(subWithoutPhoto?.style.photoUrl).toBeUndefined();
  });
});
