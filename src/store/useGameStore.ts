import { create } from 'zustand';
import type {
  Player,
  Commission,
  Trip,
  PlayerVehicle,
  Warehouse,
  LedgerEntry,
  SaveGame,
  City,
  Route,
  Goods,
  Vehicle,
  Weather,
  GameEvent,
  ReputationGrade,
  OfficialDocument,
  StampCheckpoint,
} from '../../shared/types';
import { api } from '../services/api';
import {
  createInitialSaveGame,
  generateRandomCommissions,
  getRandomWeather,
  getRandomEvents,
  generateId,
  advanceTime,
  getCurrentDate,
  calculateWarehouseUsedSpace,
  calculateTotalGameHours,
  generateOfficialDocuments,
  canMixWithOfficialDocument,
  calculateOfficialRank,
} from '../utils/gameLogic';
import {
  calculateReputationGrade,
  settleTrip,
  generateLedgerEntries,
  calculateWarehouseCapacity,
  calculateWarehouseUpgradeCost,
  type TripSettlement,
} from '../utils/settlement';
import {
  calculateRouteTime,
  calculateLoad,
  calculateTripCost,
} from '../utils/routeCalc';

interface GameState {
  player: Player;
  commissions: Commission[];
  officialDocuments: OfficialDocument[];
  trips: Trip[];
  vehicles: PlayerVehicle[];
  warehouse: Warehouse;
  ledger: LedgerEntry[];
  currentWeather: Weather | null;
  
  cities: City[];
  routes: Route[];
  goodsList: Goods[];
  vehicleTemplates: Vehicle[];
  weatherList: Weather[];
  eventsList: GameEvent[];
  stampCheckpoints: StampCheckpoint[];
  
  selectedCommissions: string[];
  selectedVehicle: string | null;
  selectedRoute: string | null;
  selectedOfficialDocument: string | null;
  currentSettlement: TripSettlement | null;
  showSettlement: boolean;
  currentEvent: GameEvent | null;
  showEvent: boolean;
  currentTripId: string | null;
  pendingEvents: GameEvent[];
  
  isLoading: boolean;
  isDispatching: boolean;
  error: string | null;
  
  loadGameData: () => Promise<void>;
  loadSaveGame: () => Promise<void>;
  saveGame: () => Promise<void>;
  newGame: () => void;
  
  generateDailyCommissions: () => void;
  generateDailyOfficialDocuments: () => void;
  acceptCommission: (commissionId: string) => boolean;
  acceptOfficialDocument: (documentId: string) => boolean;
  selectCommission: (commissionId: string) => void;
  selectVehicle: (vehicleId: string) => void;
  selectRoute: (routeId: string) => void;
  selectOfficialDocument: (documentId: string | null) => void;
  
  startTrip: () => Promise<boolean>;
  processTripEvents: (tripId: string) => void;
  _processNextEvent: () => void;
  handleEventChoice: (choiceIndex: number) => void;
  completeTrip: (tripId: string) => void;
  closeSettlement: () => void;
  
  upgradeWarehouse: () => boolean;
  advanceTimeOfDay: () => void;
  
  updatePlayerGold: (amount: number) => void;
  updatePlayerReputation: (amount: number) => void;
  
  getAvailableVehicles: () => PlayerVehicle[];
  getAvailableRoutes: (destinationId: string) => Route[];
  getCurrentDate: () => string;
}

export const useGameStore = create<GameState>((set, get) => ({
  player: createInitialSaveGame().player,
  commissions: [],
  officialDocuments: [],
  trips: [],
  vehicles: createInitialSaveGame().vehicles,
  warehouse: createInitialSaveGame().warehouse,
  ledger: [],
  currentWeather: null,
  
  cities: [],
  routes: [],
  goodsList: [],
  vehicleTemplates: [],
  weatherList: [],
  eventsList: [],
  stampCheckpoints: [],
  
  selectedCommissions: [],
  selectedVehicle: null,
  selectedRoute: null,
  selectedOfficialDocument: null,
  currentSettlement: null,
  showSettlement: false,
  currentEvent: null,
  showEvent: false,
  currentTripId: null,
  pendingEvents: [],
  
  isLoading: false,
  isDispatching: false,
  error: null,
  
  loadGameData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.data.getAll();
      if (response.success && response.data) {
        const data = response.data as {
          cities: City[];
          routes: Route[];
          goods: Goods[];
          vehicles: Vehicle[];
          weather: Weather[];
          events: GameEvent[];
          stamps: StampCheckpoint[];
        };
        set({
          cities: data.cities,
          routes: data.routes,
          goodsList: data.goods,
          vehicleTemplates: data.vehicles,
          weatherList: data.weather,
          eventsList: data.events,
          stampCheckpoints: data.stamps || [],
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadSaveGame: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.save.get();
      if (response.success && response.data) {
        const saveData = response.data as SaveGame;
        const player = saveData.player;
        if (player.officialReputation === undefined) {
          player.officialReputation = 0;
          player.officialRank = '见习信使';
        }
        set({
          player,
          commissions: saveData.commissions,
          officialDocuments: saveData.officialDocuments || [],
          trips: saveData.trips.map(t => ({
            ...t,
            obtainedStamps: t.obtainedStamps || [],
          })),
          vehicles: saveData.vehicles,
          warehouse: saveData.warehouse,
          ledger: saveData.ledger,
          currentWeather: saveData.currentWeatherId 
            ? get().weatherList.find(w => w.id === saveData.currentWeatherId) || null
            : null,
        });
      } else {
        get().newGame();
      }
    } catch (error) {
      set({ error: (error as Error).message });
      get().newGame();
    } finally {
      set({ isLoading: false });
    }
  },
  
  saveGame: async () => {
    const state = get();
    const saveData: SaveGame = {
      player: state.player,
      commissions: state.commissions,
      officialDocuments: state.officialDocuments,
      trips: state.trips,
      vehicles: state.vehicles,
      warehouse: state.warehouse,
      ledger: state.ledger,
      currentWeatherId: state.currentWeather?.id || 'sunny',
      savedAt: Date.now(),
    };
    
    try {
      await api.save.post(saveData);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  newGame: () => {
    const initial = createInitialSaveGame();
    const weatherList = get().weatherList;
    const weather = weatherList.length > 0 ? getRandomWeather(weatherList) : null;
    
    set({
      player: initial.player,
      commissions: [],
      officialDocuments: [],
      trips: [],
      vehicles: initial.vehicles,
      warehouse: initial.warehouse,
      ledger: [],
      currentWeather: weather,
      selectedCommissions: [],
      selectedVehicle: null,
      selectedRoute: null,
      selectedOfficialDocument: null,
      currentSettlement: null,
      showSettlement: false,
      currentEvent: null,
      showEvent: false,
      currentTripId: null,
      pendingEvents: [],
    });
    
    get().generateDailyCommissions();
    get().generateDailyOfficialDocuments();
  },
  
  generateDailyCommissions: () => {
    const state = get();
    const newCommissions = generateRandomCommissions(
      state.goodsList,
      state.cities,
      state.player.reputationGrade,
      6
    );
    
    const existingIds = state.commissions.filter(c => !c.isAccepted).map(c => c.id);
    const filteredCommissions = state.commissions.filter(c => c.isAccepted || c.isCompleted);
    
    set({
      commissions: [...filteredCommissions, ...newCommissions],
    });
  },
  
  generateDailyOfficialDocuments: () => {
    const state = get();
    const newDocuments = generateOfficialDocuments(
      state.cities,
      state.stampCheckpoints,
      state.player.officialReputation,
      2
    );
    
    const existingDocs = state.officialDocuments.filter(d => d.isAccepted && !d.isCompleted);
    const filteredDocs = state.officialDocuments.filter(d => d.isCompleted);
    
    set({
      officialDocuments: [...filteredDocs, ...existingDocs, ...newDocuments],
    });
  },
  
  acceptCommission: (commissionId: string) => {
    const state = get();
    const commission = state.commissions.find(c => c.id === commissionId);
    if (!commission) return false;
    
    const goods = state.goodsList.find(g => g.id === commission.goodsId);
    if (!goods) return false;
    
    const newLoad = commission.quantity * goods.weight;
    const currentLoad = calculateWarehouseUsedSpace(
      state.commissions,
      state.goodsList,
      state.trips
    );
    
    if (currentLoad + newLoad > state.warehouse.capacity) {
      set({ error: '仓库容量不足' });
      return false;
    }
    
    const acceptedGameHours = calculateTotalGameHours(state.player.currentDay, state.player.timeOfDay);
    
    const updatedCommissions = state.commissions.map(c =>
      c.id === commissionId ? {
        ...c,
        isAccepted: true,
        acceptedAt: Date.now(),
        acceptedGameHours,
      } : c
    );
    
    const usedSpace = currentLoad + newLoad;
    
    set({
      commissions: updatedCommissions,
      warehouse: { ...state.warehouse, usedSpace },
    });
    
    return true;
  },
  
  acceptOfficialDocument: (documentId: string) => {
    const state = get();
    const doc = state.officialDocuments.find(d => d.id === documentId);
    if (!doc) return false;
    
    const acceptedGameHours = calculateTotalGameHours(state.player.currentDay, state.player.timeOfDay);
    
    const updatedDocuments = state.officialDocuments.map(d =>
      d.id === documentId ? {
        ...d,
        isAccepted: true,
        acceptedAt: Date.now(),
        acceptedGameHours,
      } : d
    );
    
    set({
      officialDocuments: updatedDocuments,
    });
    
    return true;
  },
  
  selectOfficialDocument: (documentId: string | null) => {
    set({ selectedOfficialDocument: documentId });
  },
  
  selectCommission: (commissionId: string) => {
    const state = get();
    const commission = state.commissions.find(c => c.id === commissionId);
    if (!commission || commission.isShipped || commission.isCompleted) {
      return;
    }
    
    const selected = state.selectedCommissions;
    let newSelected: string[];
    
    if (selected.includes(commissionId)) {
      newSelected = selected.filter(id => id !== commissionId);
    } else {
      newSelected = [...selected, commissionId];
    }
    
    set({ selectedCommissions: newSelected });
  },
  
  selectVehicle: (vehicleId: string) => {
    set({ selectedVehicle: vehicleId });
  },
  
  selectRoute: (routeId: string) => {
    set({ selectedRoute: routeId });
  },
  
  startTrip: async () => {
    if (get().isDispatching) return false;
    set({ isDispatching: true });
    
    try {
      const state = get();
      const { selectedCommissions, selectedVehicle, selectedRoute, selectedOfficialDocument } = state;
      
      if (selectedCommissions.length === 0 && !selectedOfficialDocument) {
        set({ error: '请选择要运输的货物或公文' });
        return false;
      }
      if (!selectedVehicle) {
        set({ error: '请选择运输车辆' });
        return false;
      }
      if (!selectedRoute) {
        set({ error: '请选择运输路线' });
        return false;
      }
      
      const vehicle = state.vehicles.find(v => v.id === selectedVehicle);
      const route = state.routes.find(r => r.id === selectedRoute);
      const weather = state.currentWeather || state.weatherList[0];
      
      if (!vehicle || !route) return false;
      
      if (!vehicle.isAvailable) {
        set({ error: '该车辆已在使用中' });
        return false;
      }
      
      const commissions = state.commissions.filter(
        c => selectedCommissions.includes(c.id)
      );
      
      const officialDoc = selectedOfficialDocument
        ? state.officialDocuments.find(d => d.id === selectedOfficialDocument)
        : null;
      
      if (officialDoc && !officialDoc.isAccepted) {
        set({ error: '公文尚未承接' });
        return false;
      }
      
      if (officialDoc && selectedCommissions.length > 0) {
        const canMix = canMixWithOfficialDocument(
          state.goodsList,
          selectedCommissions,
          state.commissions
        );
        if (!canMix) {
          set({ error: '公文不可与饮品、奢侈品、食品类货物混装' });
          return false;
        }
      }
      
      const hasShipped = commissions.some(c => c.isShipped || c.isCompleted);
      if (hasShipped) {
        set({ error: '部分货物已派送，请重新选择' });
        return false;
      }
      
      const activeTrips = state.trips.filter(t => t.status === 'in_progress');
      const alreadyInOtherTrip = commissions.some(c =>
        activeTrips.some(t => t.commissionIds.includes(c.id))
      );
      if (alreadyInOtherTrip) {
        set({ error: '部分货物已在其他运输中，请重新选择' });
        return false;
      }
      
      if (officialDoc) {
        const docInOtherTrip = activeTrips.some(
          t => t.officialDocumentId === officialDoc.id
        );
        if (docInOtherTrip) {
          set({ error: '该公文已在其他运输中' });
          return false;
        }
      }
      
      const loadCalc = calculateLoad(vehicle, commissions, state.goodsList);
      if (loadCalc.isOverloaded) {
        set({ error: '车辆超载，请减少货物或更换更大的车辆' });
        return false;
      }
      
      const routeCalc = calculateRouteTime(route, vehicle, weather);
      const tripCost = calculateTripCost(route, vehicle, routeCalc.totalTime);
      
      if (state.player.gold < tripCost) {
        set({ error: '金币不足，无法支付运输费用' });
        return false;
      }
      
      const departureGameHours = calculateTotalGameHours(state.player.currentDay, state.player.timeOfDay);
      const etaGameHours = departureGameHours + routeCalc.totalTime;
      
      const trip: Trip = {
        id: generateId(),
        vehicleId: selectedVehicle,
        routeId: selectedRoute,
        commissionIds: selectedCommissions,
        status: 'in_progress',
        progress: 0,
        departureTime: Date.now(),
        departureGameHours,
        eta: Date.now() + routeCalc.totalTime * 3600 * 1000,
        etaGameHours,
        currentDamage: 0,
        weatherId: weather.id,
        events: [],
        eventEffects: [],
        totalCost: tripCost,
        officialDocumentId: selectedOfficialDocument || undefined,
        obtainedStamps: [],
      };
      
      const updatedVehicles = state.vehicles.map(v =>
        v.id === selectedVehicle ? { ...v, isAvailable: false } : v
      );
      
      const shippedGameHours = departureGameHours;
      const updatedCommissions = state.commissions.map(c =>
        selectedCommissions.includes(c.id) ? {
          ...c,
          isShipped: true,
          shippedAt: Date.now(),
          shippedGameHours,
        } : c
      );
      
      const updatedDocuments = officialDoc
        ? state.officialDocuments.map(d =>
            d.id === officialDoc.id ? {
              ...d,
              isShipped: true,
              shippedAt: Date.now(),
              shippedGameHours,
            } : d
          )
        : state.officialDocuments;
      
      set({
        trips: [...state.trips, trip],
        vehicles: updatedVehicles,
        commissions: updatedCommissions,
        officialDocuments: updatedDocuments,
        selectedCommissions: [],
        selectedVehicle: null,
        selectedRoute: null,
        selectedOfficialDocument: null,
      });
      
      await get().saveGame();
      return true;
    } finally {
      set({ isDispatching: false });
    }
  },
  
  processTripEvents: (tripId: string) => {
    const state = get();
    const trip = state.trips.find(t => t.id === tripId);
    if (!trip || trip.status !== 'in_progress') return;
    
    const route = state.routes.find(r => r.id === trip.routeId);
    if (!route) return;
    
    const allEvents = getRandomEvents(state.eventsList, route.type, 2);
    
    set({
      currentTripId: tripId,
      pendingEvents: allEvents,
    });
    
    get()._processNextEvent();
  },
  
  _processNextEvent: () => {
    const state = get();
    const { pendingEvents, currentTripId } = state;
    
    if (!currentTripId) return;
    
    if (pendingEvents.length > 0) {
      const [nextEvent, ...rest] = pendingEvents;
      set({
        currentEvent: nextEvent,
        showEvent: true,
        pendingEvents: rest,
      });
    } else {
      set({
        currentEvent: null,
        showEvent: false,
        pendingEvents: [],
      });
      setTimeout(() => {
        get().completeTrip(currentTripId);
      }, 300);
    }
  },
  
  handleEventChoice: (choiceIndex: number) => {
    const state = get();
    const event = state.currentEvent;
    const tripId = state.currentTripId;
    if (!event || !tripId) return;
    
    const effect = event.effects[choiceIndex];
    const trip = state.trips.find(t => t.id === tripId);
    
    if (!trip || !effect) {
      set({
        currentEvent: null,
        showEvent: false,
      });
      get()._processNextEvent();
      return;
    }
    
    const eventEffect = {
      title: event.title,
      effect: { ...effect },
    };
    
    const updatedTrips = state.trips.map(t => {
      if (t.id === tripId) {
        return {
          ...t,
          events: [...t.events, `${event.title}: ${effect.description}`],
          eventEffects: [...t.eventEffects, eventEffect],
        };
      }
      return t;
    });
    
    let updatedPlayer = { ...state.player };
    const newLedgerEntries: LedgerEntry[] = [...state.ledger];
    
    if (effect.type === 'gold') {
      const goldValue = effect.value as number;
      updatedPlayer.gold += goldValue;
      
      newLedgerEntries.push({
        id: generateId(),
        type: goldValue >= 0 ? 'income' : 'expense',
        description: `${event.title}: ${effect.description}`,
        amount: Math.abs(goldValue),
        date: getCurrentDate(state.player.currentDay),
        day: state.player.currentDay,
        category: '事件',
        createdAt: Date.now(),
      });
    }
    
    if (effect.type === 'reputation') {
      const repValue = effect.value as number;
      updatedPlayer.reputation = Math.max(0, Math.min(1000,
        updatedPlayer.reputation + repValue
      ));
      const repInfo = calculateReputationGrade(updatedPlayer.reputation);
      updatedPlayer.reputationGrade = repInfo.grade as ReputationGrade;
      updatedPlayer.priceBonus = repInfo.priceBonus;
    }
    
    set({
      trips: updatedTrips,
      player: updatedPlayer,
      ledger: newLedgerEntries,
      currentEvent: null,
      showEvent: false,
    });
    
    if (effect.type === 'gold') {
      const ledgerEntry = newLedgerEntries[newLedgerEntries.length - 1];
      api.ledger.post(ledgerEntry);
    }
    
    setTimeout(() => {
      get()._processNextEvent();
    }, 300);
  },
  
  completeTrip: (tripId: string) => {
    const state = get();
    const trip = state.trips.find(t => t.id === tripId);
    if (!trip) return;
    
    const vehicle = state.vehicles.find(v => v.id === trip.vehicleId);
    const route = state.routes.find(r => r.id === trip.routeId);
    const weather = state.weatherList.find(w => w.id === trip.weatherId) || state.weatherList[0];
    
    if (!vehicle || !route) return;
    
    const commissions = state.commissions.filter(
      c => trip.commissionIds.includes(c.id)
    );
    
    const officialDoc = trip.officialDocumentId
      ? state.officialDocuments.find(d => d.id === trip.officialDocumentId) || null
      : null;
    
    const loadCalc = calculateLoad(vehicle, commissions, state.goodsList);
    
    const routeCalc = calculateRouteTime(route, vehicle, weather);
    
    const settlement = settleTrip(
      trip,
      commissions,
      state.goodsList,
      weather,
      route.condition,
      loadCalc.isOverloaded,
      trip.eventEffects,
      state.player.priceBonus,
      routeCalc.totalTime,
      officialDoc,
      state.stampCheckpoints,
      route
    );
    
    const ledgerEntries = generateLedgerEntries(
      settlement,
      state.player.currentDay,
      getCurrentDate(state.player.currentDay)
    ).map(e => ({ ...e, id: generateId(), createdAt: Date.now() }));
    
    const arrivalGameHours = calculateTotalGameHours(state.player.currentDay, state.player.timeOfDay);
    const updatedCommissions = state.commissions.map(c => {
      if (trip.commissionIds.includes(c.id)) {
        return {
          ...c,
          isCompleted: true,
          completedAt: Date.now(),
        };
      }
      return c;
    });
    
    const updatedDocuments = officialDoc
      ? state.officialDocuments.map(d => {
          if (d.id === officialDoc.id) {
            const obtainedStamps = settlement.stampResult?.obtainedStamps || [];
            return {
              ...d,
              isCompleted: true,
              completedAt: Date.now(),
              obtainedStamps,
            };
          }
          return d;
        })
      : state.officialDocuments;
    
    const updatedVehicles = state.vehicles.map(v =>
      v.id === trip.vehicleId ? { ...v, isAvailable: true } : v
    );
    
    const updatedTrips = state.trips.map(t =>
      t.id === tripId ? {
        ...t,
        status: 'completed' as const,
        actualArrivalTime: Date.now(),
        actualArrivalGameHours: arrivalGameHours,
        obtainedStamps: settlement.stampResult?.obtainedStamps || [],
      } : t
    );
    
    const newReputation = Math.max(0, Math.min(1000, 
      state.player.reputation + settlement.reputationChange
    ));
    const repInfo = calculateReputationGrade(newReputation);
    
    let newOfficialRep = state.player.officialReputation;
    if (settlement.stampResult) {
      newOfficialRep = Math.max(0, Math.min(1000,
        newOfficialRep + settlement.stampResult.officialRepChange
      ));
    }
    const newOfficialRank = calculateOfficialRank(newOfficialRep);
    
    const usedSpace = calculateWarehouseUsedSpace(
      updatedCommissions,
      state.goodsList,
      updatedTrips
    );
    
    set({
      player: {
        ...state.player,
        gold: state.player.gold + settlement.totalProfit,
        reputation: newReputation,
        reputationGrade: repInfo.grade as ReputationGrade,
        priceBonus: repInfo.priceBonus,
        officialReputation: newOfficialRep,
        officialRank: newOfficialRank,
      },
      commissions: updatedCommissions,
      officialDocuments: updatedDocuments,
      vehicles: updatedVehicles,
      trips: updatedTrips,
      ledger: [...state.ledger, ...ledgerEntries],
      warehouse: { ...state.warehouse, usedSpace },
      currentSettlement: settlement,
      showSettlement: true,
      currentTripId: null,
      pendingEvents: [],
    });
    
    api.ledger.postBatch(ledgerEntries);
    get().saveGame();
  },
  
  closeSettlement: () => {
    set({ showSettlement: false, currentSettlement: null });
  },
  
  upgradeWarehouse: () => {
    const state = get();
    const { warehouse, player } = state;
    
    if (player.gold < warehouse.upgradeCost) {
      set({ error: '金币不足，无法升级仓库' });
      return false;
    }
    
    const newLevel = warehouse.level + 1;
    const newCapacity = calculateWarehouseCapacity(newLevel);
    const newUpgradeCost = calculateWarehouseUpgradeCost(newLevel);
    
    const ledgerEntry: LedgerEntry = {
      id: generateId(),
      type: 'expense',
      description: `仓库升级到 Lv.${newLevel}`,
      amount: warehouse.upgradeCost,
      date: getCurrentDate(player.currentDay),
      day: player.currentDay,
      category: '升级',
      createdAt: Date.now(),
    };
    
    set({
      warehouse: {
        ...warehouse,
        level: newLevel,
        capacity: newCapacity,
        upgradeCost: newUpgradeCost,
      },
      player: {
        ...player,
        gold: player.gold - warehouse.upgradeCost,
      },
      ledger: [...state.ledger, ledgerEntry],
    });
    
    api.ledger.post(ledgerEntry);
    get().saveGame();
    
    return true;
  },
  
  advanceTimeOfDay: () => {
    const state = get();
    const newPlayer = advanceTime(state.player);
    
    let weather = state.currentWeather;
    if (newPlayer.timeOfDay === 'morning') {
      weather = getRandomWeather(state.weatherList);
      get().generateDailyCommissions();
      get().generateDailyOfficialDocuments();
    }
    
    set({
      player: newPlayer,
      currentWeather: weather,
    });
    
    get().saveGame();
  },
  
  updatePlayerGold: (amount: number) => {
    set(state => ({
      player: { ...state.player, gold: state.player.gold + amount },
    }));
  },
  
  updatePlayerReputation: (amount: number) => {
    set(state => {
      const newRep = Math.max(0, Math.min(1000, state.player.reputation + amount));
      const repInfo = calculateReputationGrade(newRep);
      return {
        player: {
          ...state.player,
          reputation: newRep,
          reputationGrade: repInfo.grade as ReputationGrade,
          priceBonus: repInfo.priceBonus,
        },
      };
    });
  },
  
  getAvailableVehicles: () => {
    return get().vehicles.filter(v => v.isAvailable);
  },
  
  getAvailableRoutes: (destinationId: string) => {
    const state = get();
    return state.routes.filter(
      r => 
        (r.fromCityId === 'yuegang' && r.toCityId === destinationId) ||
        (r.fromCityId === destinationId && r.toCityId === 'yuegang')
    );
  },
  
  getCurrentDate: () => {
    return getCurrentDate(get().player.currentDay);
  },
}));
