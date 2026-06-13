import type { 
  Commission, 
  Goods, 
  City, 
  Weather, 
  GameEvent, 
  Player,
  PlayerVehicle,
  Warehouse,
  SaveGame,
  Trip,
  OfficialDocument,
  StampCheckpoint
} from '../../shared/types';
import { calculateReputationGrade, calculateWarehouseCapacity, calculateWarehouseUpgradeCost } from './settlement';

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getCurrentDate = (day: number): string => {
  const baseDate = new Date('2024-01-01');
  baseDate.setDate(baseDate.getDate() + day - 1);
  return `${baseDate.getFullYear()}年${baseDate.getMonth() + 1}月${baseDate.getDate()}日`;
};

export const generateRandomCommissions = (
  goodsList: Goods[],
  cities: City[],
  reputationGrade: string,
  count: number = 6
): Commission[] => {
  const commissions: Commission[] = [];
  const destinations = cities.filter(c => c.id !== 'yuegang');
  
  let qualityMultiplier = 1;
  if (reputationGrade === '甲') qualityMultiplier = 1.5;
  else if (reputationGrade === '乙') qualityMultiplier = 1.2;
  else if (reputationGrade === '丁') qualityMultiplier = 0.8;
  
  for (let i = 0; i < count; i++) {
    const goods = goodsList[Math.floor(Math.random() * goodsList.length)];
    const destination = destinations[Math.floor(Math.random() * destinations.length)];
    
    const baseQuantity = Math.floor(Math.random() * 15) + 5;
    const quantity = Math.ceil(baseQuantity * qualityMultiplier);
    
    const baseReward = goods.basePrice * quantity;
    const rewardMultiplier = 1.2 + Math.random() * 0.6;
    const reward = Math.floor(baseReward * rewardMultiplier * qualityMultiplier);
    
    const deadlineBase = 12 + Math.floor(Math.random() * 36);
    const deadlineHours = Math.ceil(deadlineBase / qualityMultiplier);
    
    const isEmergency = Math.random() < 0.2;
    const finalReward = isEmergency ? Math.floor(reward * 1.5) : reward;
    const finalDeadline = isEmergency ? Math.ceil(deadlineHours * 0.7) : deadlineHours;
    
    commissions.push({
      id: generateId(),
      goodsId: goods.id,
      goodsName: goods.name,
      destinationId: destination.id,
      destinationName: destination.name,
      quantity,
      reward: finalReward,
      deadlineHours: finalDeadline,
      fragility: goods.fragility,
      isAccepted: false,
      createdAt: Date.now(),
    });
  }
  
  return commissions;
};

export const getRandomWeather = (weatherList: Weather[]): Weather => {
  const weights = [40, 25, 12, 5, 8, 4, 3, 3];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < weatherList.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return weatherList[i];
    }
  }
  
  return weatherList[0];
};

export const getRandomEvents = (
  eventsList: GameEvent[],
  routeType: 'land' | 'water',
  count: number = 2
): GameEvent[] => {
  const filteredEvents = eventsList.filter(e => {
    if (routeType === 'water' && e.id === 'bandit') return false;
    if (routeType === 'land' && e.id === 'pirate') return false;
    return true;
  });
  
  const selected: GameEvent[] = [];
  const shuffled = [...filteredEvents].sort(() => Math.random() - 0.5);
  
  for (const event of shuffled) {
    if (selected.length >= count) break;
    if (Math.random() < event.probability * 2) {
      selected.push(event);
    }
  }
  
  return selected;
};

export const createInitialPlayer = (): Player => {
  const officialRep = 0;
  return {
    id: generateId(),
    name: '月港邮差',
    gold: 1000,
    reputation: 600,
    reputationGrade: '丙',
    priceBonus: 0,
    currentDay: 1,
    timeOfDay: 'morning',
    officialReputation: officialRep,
    officialRank: calculateOfficialRank(officialRep),
  };
};

export const createInitialVehicles = (): PlayerVehicle[] => {
  return [
    {
      id: generateId(),
      vehicleId: 'donkey-cart',
      name: '驴车',
      type: 'land',
      capacity: 50,
      speed: 12,
      costPerHour: 5,
      icon: '🐴',
      isAvailable: true,
    },
    {
      id: generateId(),
      vehicleId: 'small-boat',
      name: '小渡船',
      type: 'water',
      capacity: 80,
      speed: 20,
      costPerHour: 15,
      icon: '⛵',
      isAvailable: true,
    },
  ];
};

export const createInitialWarehouse = (): Warehouse => {
  const level = 1;
  return {
    id: generateId(),
    level,
    capacity: calculateWarehouseCapacity(level),
    usedSpace: 0,
    upgradeCost: calculateWarehouseUpgradeCost(level),
  };
};

export const createInitialSaveGame = (): SaveGame => {
  const player = createInitialPlayer();
  const repInfo = calculateReputationGrade(player.reputation);
  player.reputationGrade = repInfo.grade;
  player.priceBonus = repInfo.priceBonus;
  
  return {
    player,
    commissions: [],
    officialDocuments: [],
    trips: [],
    vehicles: createInitialVehicles(),
    warehouse: createInitialWarehouse(),
    ledger: [],
    currentWeatherId: 'sunny',
    savedAt: Date.now(),
  };
};

export const advanceTime = (player: Player): Player => {
  const timeOrder: Player['timeOfDay'][] = ['morning', 'afternoon', 'evening', 'night'];
  const currentIndex = timeOrder.indexOf(player.timeOfDay);
  
  let newTimeOfDay: Player['timeOfDay'];
  let newDay = player.currentDay;
  
  if (currentIndex === timeOrder.length - 1) {
    newTimeOfDay = 'morning';
    newDay += 1;
  } else {
    newTimeOfDay = timeOrder[currentIndex + 1];
  }
  
  return {
    ...player,
    timeOfDay: newTimeOfDay,
    currentDay: newDay,
  };
};

export const getTimeOfDayName = (timeOfDay: Player['timeOfDay']): string => {
  const names: Record<Player['timeOfDay'], string> = {
    morning: '清晨',
    afternoon: '午后',
    evening: '傍晚',
    night: '夜晚',
  };
  return names[timeOfDay];
};

export const canAcceptCommission = (
  commission: Commission,
  warehouse: Warehouse,
  goodsList: Goods[],
  acceptedCommissions: Commission[]
): { canAccept: boolean; reason?: string } => {
  const goods = goodsList.find(g => g.id === commission.goodsId);
  if (!goods) {
    return { canAccept: false, reason: '货物信息不存在' };
  }
  
  const newLoad = commission.quantity * goods.weight;
  const currentLoad = acceptedCommissions.reduce((total, c) => {
    const g = goodsList.find(good => good.id === c.goodsId);
    return total + (c.quantity * (g?.weight || 1));
  }, 0);
  
  if (currentLoad + newLoad > warehouse.capacity) {
    return { canAccept: false, reason: '仓库容量不足' };
  }
  
  return { canAccept: true };
};

export const calculateWarehouseUsedSpace = (
  commissions: Commission[],
  goodsList: Goods[],
  completedTrips: Trip[]
): number => {
  const activeCommissions = commissions.filter(c => c.isAccepted && !c.isCompleted);
  
  return activeCommissions.reduce((total, commission) => {
    const goods = goodsList.find(g => g.id === commission.goodsId);
    return total + (commission.quantity * (goods?.weight || 1));
  }, 0);
};

export const getTimeOfDayHours = (timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'): number => {
  const hoursMap: Record<'morning' | 'afternoon' | 'evening' | 'night', number> = {
    morning: 6,
    afternoon: 12,
    evening: 18,
    night: 24,
  };
  return hoursMap[timeOfDay];
};

export const calculateTotalGameHours = (day: number, timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'): number => {
  return (day - 1) * 24 + getTimeOfDayHours(timeOfDay);
};

export const calculateIsLateGameTime = (
  acceptedGameHours: number,
  deadlineHours: number,
  departedGameHours: number,
  totalTripHours: number,
  extraDelay: number
): boolean => {
  const deadlineGameTime = acceptedGameHours + deadlineHours;
  const arrivalGameTime = departedGameHours + totalTripHours + extraDelay;
  return arrivalGameTime > deadlineGameTime;
};

export const FORBIDDEN_CATEGORIES_WITH_DOCUMENTS = ['饮品', '奢侈品', '食品'];

export const canMixWithOfficialDocument = (
  goodsList: Goods[],
  commissionIds: string[],
  commissions: Commission[]
): boolean => {
  const civilianCommissions = commissions.filter(
    c => commissionIds.includes(c.id)
  );
  return civilianCommissions.every(c => {
    const goods = goodsList.find(g => g.id === c.goodsId);
    if (!goods) return false;
    return !FORBIDDEN_CATEGORIES_WITH_DOCUMENTS.includes(goods.category);
  });
};

export const calculateOfficialRank = (officialRep: number): string => {
  if (officialRep >= 500) return '金牌信使';
  if (officialRep >= 300) return '银牌信使';
  if (officialRep >= 100) return '铜牌信使';
  return '见习信使';
};

export const getAvailableDocumentGrade = (officialRep: number): ('ordinary' | 'urgent' | 'imperial')[] => {
  const grades: ('ordinary' | 'urgent' | 'imperial')[] = ['ordinary'];
  if (officialRep >= 100) grades.push('urgent');
  if (officialRep >= 300) grades.push('imperial');
  return grades;
};

export const generateOfficialDocuments = (
  cities: City[],
  stamps: StampCheckpoint[],
  officialRep: number,
  count: number = 2
): OfficialDocument[] => {
  const availableGrades = getAvailableDocumentGrade(officialRep);
  const documents: OfficialDocument[] = [];
  const destinations = cities.filter(c => c.id !== 'yuegang');

  const gradeConfig = {
    ordinary: { rewardBase: 800, deadlineBase: 16, stampCount: 2, titles: ['州府公文', '县衙令文', '户籍公文', '税赋清册'] },
    urgent: { rewardBase: 2000, deadlineBase: 10, stampCount: 3, titles: ['军情急报', '漕运急令', '缉捕通文', '赈灾公文'] },
    imperial: { rewardBase: 5000, deadlineBase: 8, stampCount: 4, titles: ['圣旨传谕', '御赐密函', '钦差令牌', '朝廷急递'] },
  };

  for (let i = 0; i < count; i++) {
    const grade = availableGrades[Math.floor(Math.random() * availableGrades.length)];
    const config = gradeConfig[grade];
    const destination = destinations[Math.floor(Math.random() * destinations.length)];
    const title = config.titles[Math.floor(Math.random() * config.titles.length)];

    const relevantStamps = stamps.filter(
      s => s.cityId === destination.id || 
           isStampOnRoute(s.cityId, destination.id, cities)
    );

    const selectedStamps = relevantStamps
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(config.stampCount, relevantStamps.length))
      .map(s => s.id);

    if (selectedStamps.length === 0) continue;

    const rewardMultiplier = 1.1 + Math.random() * 0.4;
    const reward = Math.floor(config.rewardBase * rewardMultiplier);
    const deadlineVariance = Math.floor(Math.random() * 6) - 2;
    const deadlineHours = Math.max(6, config.deadlineBase + deadlineVariance);

    documents.push({
      id: generateId(),
      title: `${title} → ${destination.name}`,
      destinationId: destination.id,
      destinationName: destination.name,
      reward,
      deadlineHours,
      requiredStamps: selectedStamps,
      isAccepted: false,
      obtainedStamps: [],
      grade,
      createdAt: Date.now(),
    });
  }

  return documents;
};

export const isStampOnRoute = (
  stampCityId: string,
  destinationId: string,
  cities: City[]
): boolean => {
  const importantCityIds = ['nanjing', 'wuhan', 'quanzhou', 'hangzhou'];
  return importantCityIds.includes(stampCityId) || stampCityId === destinationId;
};

export const getStampsForRoute = (
  route: { fromCityId: string; toCityId: string },
  stamps: StampCheckpoint[],
  requiredStampIds: string[]
): StampCheckpoint[] => {
  const routeCities = new Set<string>();
  routeCities.add(route.fromCityId);
  routeCities.add(route.toCityId);
  const importantHubs = ['wuhan', 'nanjing', 'quanzhou', 'hangzhou'];
  importantHubs.forEach(id => routeCities.add(id));

  return stamps.filter(
    s => requiredStampIds.includes(s.id) && routeCities.has(s.cityId)
  );
};

export const calculateStampPenalty = (
  requiredStamps: string[],
  obtainedStamps: string[],
  reward: number
): number => {
  const missingCount = requiredStamps.filter(
    id => !obtainedStamps.includes(id)
  ).length;
  return Math.floor(reward * 0.2 * missingCount);
};

export const calculateOfficialRepChange = (
  allStampsObtained: boolean,
  grade: 'ordinary' | 'urgent' | 'imperial',
  missingCount: number
): number => {
  const gradeBonus = { ordinary: 1, urgent: 2, imperial: 3 };
  if (allStampsObtained) {
    return 20 * gradeBonus[grade];
  }
  return -10 * missingCount;
};
