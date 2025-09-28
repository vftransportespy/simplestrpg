import { GoogleGenAI } from "@google/genai";

// --- TYPE DEFINITIONS ---
interface PlayerStats {
  level: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  gold: number;
  baseAtk: number;
  baseDef: number;
  exp: number;
  expToNextLevel: number;
  learnedSkills: string[];
}

interface ItemInstance {
  id: string;
  instanceId: number;
  equipped: boolean;
  level: number;
  atk: number;
  def: number;
  type: string;
  name: string;
  [key: string]: any;
}

interface QuestProgress {
  [questId: string]: {
    currentAmount: number;
    completed: boolean;
  };
}

interface AutoHealSettings {
  enabled: boolean;
  threshold: number;
  costType: 'gold' | 'energy';
}

interface Buff {
  id: string;
  duration: number;
  effect: any;
  name?: string;
}

interface Debuff {
    stat: string;
    duration: number;
    multiplier: number;
    id?: string;
    name?: string;
}

interface CombatLogEntry {
    id: string;
    type: 'ai' | 'standard';
    content: string;
    icon?: string;
}

interface GameState {
  currentView: string;
  language: 'pt' | 'es' | 'en';
  playerStats: PlayerStats;
  inventory: ItemInstance[];
  materials: { [key: string]: number };
  questProgress: QuestProgress;
  inventoryView: 'items' | 'materials';
  soundOn: boolean;
  autoHealSettings: AutoHealSettings;
  selectedMonster: any | null;
  monsterHp: number;
  combatLog: CombatLogEntry[];
  isCombatOver: boolean;
  isAutoBattling: boolean;
  activeBuffs: Buff[];
  monsterDebuffs: Debuff[];
  showSkillSelection: boolean;
  notification: string | null;
  itemToBuy: string | null;
  itemToSell: ItemInstance | null;
  itemToUpgrade: ItemInstance | null;
  combatTurn: number;
  showBossIntro: boolean;
  aiStoryteller: boolean;
  shopFilter: string;
  shopSort: string;
}

interface AIEvent {
    action?: string;
    skillType?: string;
    result?: string;
    monsterName?: string;
    attackElement?: string;
    elementalEffect?: 'super effective' | 'not very effective' | 'resisted';
    damageDealt?: number;
    lifesteal?: number;
    debuffApplied?: string;
    buffApplied?: string;
    healed?: number;
}

// FIX: Added types for item database entries to allow for optional properties like 'set', 'element', and 'resistance'.
interface ItemData {
    name: string;
    type: string;
    atk: number;
    def: number;
    minLevel: number;
    price: number;
    rarity: string;
    description_key: string;
    set?: string;
    element?: string;
    resistance?: string[];
}

interface ItemDatabase {
    [key: string]: ItemData;
}

// --- DOM ELEMENT ---
const app = document.getElementById('app');

// --- GEMINI SETUP ---
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// --- CONSTANTS & DATA ---
const SAVE_GAME_KEY = 'simplest-rpg-save-vanilla';
const rarityData = { common: { key: 'common', color: '#6b6b65', priceMultiplier: 1, dropFactor: 1 }, uncommon: { key: 'uncommon', color: '#48944f', priceMultiplier: 1.5, dropFactor: 2 }, rare: { key: 'rare', color: '#869e9d', priceMultiplier: 2.5, dropFactor: 5 }, epic: { key: 'epic', color: '#97714d', priceMultiplier: 5, dropFactor: 10 }, legendary: { key: 'legendary', color: '#e19e4c', priceMultiplier: 10, dropFactor: 20 } };
const rarityGems = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
const itemTypeIcons = { weapon: '⚔️', shield: '🛡️', helmet: '👑', armor: '🎽', gloves: '🧤', boots: '👢' };
const skillTypeIcons = { attack: '💥', heal: '❤️‍🩹', buff: '💪', debuff: '🔽', lifesteal: '🩸' };
const itemDatabase: ItemDatabase = {'w1':{name:'Espada Curta',type:'weapon',atk:5,def:0,minLevel:1,price:50,rarity:'common',description_key:'desc_w1'},'s1':{name:'Escudo de Madeira',type:'shield',atk:0,def:5,minLevel:1,price:50,rarity:'common',description_key:'desc_s1'},'h1':{name:'Elmo de Couro',type:'helmet',atk:0,def:2,minLevel:2,price:40,rarity:'common',description_key:'desc_h1',set:'leather'},'a1':{name:'Peitoral de Couro',type:'armor',atk:0,def:4,minLevel:2,price:60,rarity:'common',description_key:'desc_a1',set:'leather'},'w2':{name:'Machado de Batalha',type:'weapon',atk:12,def:0,minLevel:3,price:200,rarity:'uncommon',description_key:'desc_w2'},'s2':{name:'Escudo de Ferro',type:'shield',atk:0,def:10,minLevel:3,price:220,rarity:'uncommon',description_key:'desc_s2',set:'iron'},'g1':{name:'Luvas de Couro',type:'gloves',atk:0,def:2,minLevel:4,price:80,rarity:'common',description_key:'desc_g1',set:'leather'},'b1':{name:'Botas de Couro',type:'boots',atk:0,def:2,minLevel:4,price:80,rarity:'common',description_key:'desc_b1',set:'leather'},'w3':{name:'Lâmina Élfica',type:'weapon',atk:20,def:0,minLevel:5,price:500,rarity:'uncommon',description_key:'desc_w3'},'h2':{name:'Elmo de Ferro',type:'helmet',atk:0,def:5,minLevel:5,price:250,rarity:'uncommon',description_key:'desc_h2',set:'iron'},'a2':{name:'Peitoral de Ferro',type:'armor',atk:0,def:8,minLevel:5,price:300,rarity:'uncommon',description_key:'desc_a2',set:'iron'},'w4':{name:'Espada de Fogo',type:'weapon',atk:18,def:0,minLevel:6,price:750,element:'Fire',rarity:'rare',description_key:'desc_w4'},'s3':{name:'Escudo de Água',type:'shield',atk:0,def:15,minLevel:6,price:750,resistance:['Fire'],rarity:'rare',description_key:'desc_s3'},'g2':{name:'Manoplas de Ferro',type:'gloves',atk:0,def:5,minLevel:7,price:280,rarity:'uncommon',description_key:'desc_g2',set:'iron'},'b2':{name:'Grevas de Ferro',type:'boots',atk:0,def:5,minLevel:7,price:280,rarity:'uncommon',description_key:'desc_b2',set:'iron'},'w5':{name:'Martelo de Pedra',type:'weapon',atk:25,def:0,minLevel:8,price:1200,element:'Earth',rarity:'rare',description_key:'desc_w5'},'s4':{name:'Escudo de Vento',type:'shield',atk:0,def:20,minLevel:8,price:1200,resistance:['Earth'],rarity:'rare',description_key:'desc_s4'},'w6':{name:'Adaga Ciclone',type:'weapon',atk:30,def:0,minLevel:10,price:2000,element:'Wind',rarity:'rare',description_key:'desc_w6'},'h3':{name:'Elmo de Aço',type:'helmet',atk:0,def:12,minLevel:12,price:1500,rarity:'rare',description_key:'desc_h3',set:'steel'},'a3':{name:'Peitoral de Aço',type:'armor',atk:0,def:18,minLevel:12,price:2000,rarity:'rare',description_key:'desc_a3',set:'steel'},'s5':{name:'Escudo de Aço',type:'shield',atk:0,def:25,minLevel:12,price:1800,rarity:'rare',description_key:'desc_s5',set:'steel'},'w7':{name:'Espada Longa de Aço',type:'weapon',atk:40,def:0,minLevel:12,price:2500,rarity:'rare',description_key:'desc_w7',set:'steel'},'w8':{name:'Cajado de Gelo',type:'weapon',atk:35,def:0,minLevel:14,price:3500,element:'Water',rarity:'epic',description_key:'desc_w8'},'s6':{name:'Escudo Rúnico',type:'shield',atk:0,def:30,minLevel:15,price:4000,resistance:['Fire','Water'],rarity:'epic',description_key:'desc_s6'},'w9':{name:'Lâmina da Tempestade',type:'weapon',atk:55,def:0,minLevel:18,price:6000,element:'Wind',rarity:'legendary',description_key:'desc_w9'},'w10':{name:'Quebra-Mundos',type:'weapon',atk:70,def:0,minLevel:15,price:15000,rarity:'legendary',element:'Earth',description_key:'desc_w10'},'w11':{name:'Tridente das Profundezas',type:'weapon',atk:85,def:0,minLevel:20,price:25000,rarity:'legendary',element:'Water',description_key:'desc_w11'},'a4':{name:'Peitoral Núcleo de Magma',type:'armor',atk:0,def:80,minLevel:25,price:30000,rarity:'legendary',resistance:['Fire'],description_key:'desc_a4'},'b3':{name:'Grevas Tufão',type:'boots',atk:0,def:40,minLevel:30,price:28000,rarity:'legendary',description_key:'desc_b3'},'s7':{name:'Baluarte dos Anciões',type:'shield',atk:0,def:100,minLevel:35,price:35000,rarity:'legendary',resistance:['Earth'],description_key:'desc_s7'},'w12':{name:'Adagas do Oculto',type:'weapon',atk:120,def:0,minLevel:40,price:40000,rarity:'legendary',description_key:'desc_w12'},'h4':{name:'Coroa do Lich Gélido',type:'helmet',atk:0,def:60,minLevel:45,price:42000,rarity:'legendary',resistance:['Water'],description_key:'desc_h4'},'g3':{name:'Manoplas do Rei do Deserto',type:'gloves',atk:15,def:50,minLevel:50,price:45000,rarity:'legendary',description_key:'desc_g3'},'a5':{name:'Armadura de Escama Prismática',type:'armor',atk:0,def:120,minLevel:55,price:50000,rarity:'legendary',resistance:['Fire','Water','Wind','Earth'],description_key:'desc_a5'},'w13':{name:'Lâmina Ceifadora do Vazio',type:'weapon',atk:180,def:0,minLevel:60,price:60000,rarity:'legendary',description_key:'desc_w13'},'s8':{name:'Égide Celestial',type:'shield',atk:0,def:150,minLevel:65,price:75000,rarity:'legendary',resistance:['Fire','Water','Wind','Earth'],description_key:'desc_s8'}};
const setBonuses = {leather:{'2':{def:5,name_key:'set_bonus_leather_2'},'4':{def:10,atk:5,name_key:'set_bonus_leather_4'}},iron:{'2':{def:10,name_key:'set_bonus_iron_2'},'4':{def:25,atk:10,name_key:'set_bonus_iron_4'}},steel:{'2':{atk:15,name_key:'set_bonus_steel_2'},'4':{atk:30,def:15,name_key:'set_bonus_steel_4'}}};
const materialDatabase = {'m1':{name:'Essência de Slime'},'m2':{name:'Orelha de Goblin'},'m3':{name:'Presa de Orc'},'m4':{name:'Núcleo Ígneo'},'m5':{name:'Coração de Pedra'},'m6':{name:'Escama Ventosa'}};
const skillDatabase = {'sk1':{id:'sk1',name:'Golpe Poderoso',description:'Um ataque focado que causa 150% do seu dano de ATK.',type:'attack',target:'enemy',energyCost:15,effect:{multiplier:1.5},minLevel:3,learnCost:500},'sk2':{id:'sk2',name:'Curar Feridas',description:'Recupera 30% do seu HP máximo.',type:'heal',target:'self',energyCost:20,effect:{percentage:0.3},minLevel:5,learnCost:1000},'sk3':{id:'sk3',name:'Grito de Guerra',description:'Aumenta seu ATK em 20% por 3 turnos.',type:'buff',target:'self',energyCost:10,effect:{stat:'atk',multiplier:1.2,duration:3},minLevel:8,learnCost:1500},'sk4':{id:'sk4',name:'Pele de Pedra',description:'Aumenta sua DEF em 30% por 3 turnos.',type:'buff',target:'self',energyCost:10,effect:{stat:'def',multiplier:1.3,duration:3},minLevel:6,learnCost:1200},'sk5':{id:'sk5',name:'Golpe Enfraquecedor',description:'Causa 120% de dano de ATK e reduz o ATK do inimigo em 20% por 2 turnos.',type:'debuff',target:'enemy',energyCost:20,effect:{multiplier:1.2,debuff:{stat:'atk',multiplier:0.8,duration:2}},minLevel:10,learnCost:2500},'sk6':{id:'sk6',name:'Vampirismo',description:'Causa 100% de dano de ATK e cura você em 50% do dano causado.',type:'lifesteal',target:'enemy',energyCost:25,effect:{multiplier:1.0,lifesteal:0.5},minLevel:12,learnCost:3500}};
const shopInventory = ['w1','s1','h1','a1','w2','s2','g1','b1','w3','h2','a2','w4','s3','g2','b2','w5','s4', 'w6', 'h3', 'a3', 's5', 'w7', 'w8', 's6', 'w9'];
const monsters = [{name:'Slime',level:1,hp:50,atk:5,def:2,questTargetName:'Slime',ai_behavior:'standard',lootTable:{items:[],materials:[{id:'m1',chance:0.6}]}},{name:'Goblin',level:3,hp:80,atk:12,def:5,questTargetName:'Goblin',ai_behavior:'standard',abilities:[{name_key:'ability_vicious_strike',chance:0.25,type:'heavy_attack',effect:{multiplier:1.5}}],lootTable:{items:[{id:'w1',chance:0.05}],materials:[{id:'m2',chance:0.5}]}},{name:'Orc',level:5,hp:150,atk:20,def:10,questTargetName:'Orc',ai_behavior:'debuffer',abilities:[{name_key:'ability_warcry',chance:0.3,type:'debuff',effect:{stat:'def',multiplier:0.8,duration:3}}],lootTable:{items:[{id:'s2',chance:0.05}],materials:[{id:'m3',chance:0.5}]}},{name:'Elemental de Fogo',level:6,hp:200,atk:25,def:12,questTargetName:'Elemental',ai_behavior:'standard',element:'Fire',weakness:'Water',resistance:'Wind',lootTable:{items:[{id:'w4',chance:0.03}],materials:[{id:'m4',chance:0.4}]}},{name:'Golem de Pedra',level:8,hp:300,atk:18,def:25,questTargetName:'Golem',ai_behavior:'healer',abilities:[{name_key:'ability_stone_regrowth',chance:0.2,type:'heal',effect:{percentage:0.25}}],element:'Earth',weakness:'Wind',resistance:'Fire',lootTable:{items:[{id:'h2',chance:0.05}],materials:[{id:'m5',chance:0.4}]}},{name:'Serpente do Vento',level:10,hp:250,atk:35,def:18,questTargetName:'Serpente',ai_behavior:'evasive',dodgeChance:0.2,element:'Wind',weakness:'Fire',resistance:'Earth',lootTable:{items:[{id:'w6',chance:0.03}],materials:[{id:'m6',chance:0.4}]}},{name:'Guardião Golem',race_key:'race_ancient_automaton',level:15,hp:1000,atk:50,def:40,questTargetName:'Guardião Golem',isBoss:true,unlockQuestId:'q3',ai_behavior:'boss_pattern',element:'Earth',weakness:'Wind',resistance:'Fire',abilities:[{id:'boss_ab1',name_key:'ability_earthen_ward',type:'buff',effect:{stat:'def',multiplier:2.5,duration:2}},{id:'boss_ab2',name_key:'ability_granite_slam',type:'heavy_attack',effect:{multiplier:2.0}}],lootTable:{items:[{id:'w10',chance:1.0}],materials:[{id:'m5',chance:1.0}]}},{name:'Serpente Abissal',race_key:'race_deep_sea_horror',level:20,hp:2500,atk:80,def:60,questTargetName:'Serpente Abissal',isBoss:true,unlockQuestId:'q5',ai_behavior:'boss_pattern',element:'Water',weakness:'Wind',resistance:'Fire',abilities:[{name_key:'ability_tidal_wave',type:'heavy_attack',effect:{multiplier:1.8}},{name_key:'ability_corrosive_spittle',type:'debuff',effect:{stat:'def',multiplier:0.7,duration:3}}],lootTable:{items:[{id:'w11',chance:1.0}],materials:[]}},{name:'Titã de Magma',race_key:'race_volcanic_behemoth',level:25,hp:3500,atk:100,def:80,questTargetName:'Titã de Magma',isBoss:true,unlockQuestId:'q6',ai_behavior:'boss_pattern',element:'Fire',weakness:'Water',resistance:'Earth',abilities:[{name_key:'ability_volcanic_eruption',type:'heavy_attack',effect:{multiplier:2.0}},{name_key:'ability_scorching_aura',type:'buff',effect:{stat:'atk',multiplier:1.5,duration:2}}],lootTable:{items:[{id:'a4',chance:1.0}],materials:[]}},{name:'Soberano da Tempestade',race_key:'race_tempest_incarnate',level:30,hp:3000,atk:120,def:70,questTargetName:'Soberano da Tempestade',isBoss:true,unlockQuestId:'q7',ai_behavior:'boss_pattern',element:'Wind',weakness:'Fire',resistance:'Earth',abilities:[{name_key:'ability_cyclone_burst',type:'heavy_attack',effect:{multiplier:1.8}},{name_key:'ability_static_field',type:'debuff',effect:{stat:'atk',multiplier:0.7,duration:3}}],lootTable:{items:[{id:'b3',chance:1.0}],materials:[]}},{name:'Treant Ancião',race_key:'race_forest_guardian',level:35,hp:5000,atk:90,def:120,questTargetName:'Treant Ancião',isBoss:true,unlockQuestId:'q8',ai_behavior:'healer',element:'Earth',weakness:'Wind',resistance:'Fire',abilities:[{name_key:'ability_root_slam',type:'heavy_attack',effect:{multiplier:1.5}},{name_key:'ability_bark_regrowth',type:'heal',effect:{percentage:0.4}}],lootTable:{items:[{id:'s7',chance:1.0}],materials:[]}},{name:'Espreitador das Sombras',race_key:'race_void_ambusher',level:40,hp:4000,atk:150,def:90,questTargetName:'Espreitador das Sombras',isBoss:true,unlockQuestId:'q9',ai_behavior:'evasive',dodgeChance:0.3,abilities:[{name_key:'ability_ambush',type:'heavy_attack',effect:{multiplier:2.2}}],lootTable:{items:[{id:'w12',chance:1.0}],materials:[]}},{name:'Lich Gélido',race_key:'race_frozen_tyrant',level:45,hp:6000,atk:140,def:130,questTargetName:'Lich Gélido',isBoss:true,unlockQuestId:'q10',ai_behavior:'boss_pattern',element:'Water',weakness:'Wind',resistance:'Fire',abilities:[{name_key:'ability_glacial_spike',type:'heavy_attack',effect:{multiplier:1.9}},{name_key:'ability_frozen_armor',type:'buff',effect:{stat:'def',multiplier:3.0,duration:2}}],lootTable:{items:[{id:'h4',chance:1.0}],materials:[]}},{name:'Beemote da Tempestade de Areia',race_key:'race_desert_fury',level:50,hp:7500,atk:160,def:150,questTargetName:'Beemote da Tempestade de Areia',isBoss:true,unlockQuestId:'q11',ai_behavior:'debuffer',element:'Earth',weakness:'Wind',resistance:'Fire',abilities:[{name_key:'ability_sandblast',type:'debuff',effect:{stat:'atk',multiplier:0.6,duration:3}},{name_key:'ability_earthen_hide',type:'buff',effect:{stat:'def',multiplier:2.0,duration:3}}],lootTable:{items:[{id:'g3',chance:1.0}],materials:[]}},{name:'Dragão Cristalino',race_key:'race_prismatic_wyrm',level:55,hp:9000,atk:180,def:180,questTargetName:'Dragão Cristalino',isBoss:true,unlockQuestId:'q12',ai_behavior:'boss_pattern',abilities:[{name_key:'ability_prismatic_breath',type:'heavy_attack',effect:{multiplier:2.5}},{name_key:'ability_crystallize',type:'buff',effect:{stat:'def',multiplier:5.0,duration:1}}],lootTable:{items:[{id:'a5',chance:1.0}],materials:[]}},{name:'Horror do Vazio',race_key:'race_extradimensional_terror',level:60,hp:10000,atk:220,def:160,questTargetName:'Horror do Vazio',isBoss:true,unlockQuestId:'q13',ai_behavior:'boss_pattern',abilities:[{name_key:'ability_mind_shatter',type:'debuff',effect:{stat:'atk',multiplier:0.5,duration:2}},{name_key:'ability_consume_light',type:'buff',effect:{stat:'atk',multiplier:2.0,duration:2}}],lootTable:{items:[{id:'w13',chance:1.0}],materials:[]}},{name:'Guardião Celestial',race_key:'race_divine_protector',level:65,hp:15000,atk:200,def:250,questTargetName:'Guardião Celestial',isBoss:true,unlockQuestId:'q14',ai_behavior:'boss_pattern',abilities:[{name_key:'ability_judgment',type:'heavy_attack',effect:{multiplier:3.0}},{name_key:'ability_divine_shield',type:'buff',effect:{stat:'def',multiplier:10.0,duration:1}},{name_key:'ability_heavenly_heal',type:'heal',effect:{percentage:0.5}}],lootTable:{items:[{id:'s8',chance:1.0}],materials:[]}}];
const questsData = [{id:'q1',title:'Caça aos Slimes',type:'kill',target:'Slime',requiredAmount:5,reward:{gold:100,exp:50}},{id:'q2',title:'Infestação de Goblins',type:'kill',target:'Goblin',requiredAmount:3,reward:{gold:250,exp:120}},{id:'q3',title:'Caminho para o Guardião',type:'kill',target:'Golem',requiredAmount:5,reward:{gold:1000,exp:500}},{id:'q4',title:'O Guardião Ancião',type:'kill',target:'Guardião Golem',requiredAmount:1,reward:{gold:5000,exp:2000}},{id:'q5',title:'Supressão de Serpentes',type:'kill',target:'Serpente',requiredAmount:10,reward:{gold:1500,exp:800}},{id:'q6',title:'Fúria Ígnea',type:'kill',target:'Elemental',requiredAmount:10,reward:{gold:2000,exp:1000}},{id:'q7',title:'Horda Orc',type:'kill',target:'Orc',requiredAmount:15,reward:{gold:2500,exp:1200}},{id:'q8',title:'Purificação da Pedreira',type:'kill',target:'Golem',requiredAmount:10,reward:{gold:3000,exp:1500}},{id:'q9',title:'Derrote o Guardião',type:'kill',target:'Guardião Golem',requiredAmount:1,reward:{gold:4000,exp:2000}},{id:'q10',title:'Derrote o Titã',type:'kill',target:'Titã de Magma',requiredAmount:1,reward:{gold:5000,exp:2500}},{id:'q11',title:'Derrote o Soberano',type:'kill',target:'Soberano da Tempestade',requiredAmount:1,reward:{gold:6000,exp:3000}},{id:'q12',title:'Derrote o Treant',type:'kill',target:'Treant Ancião',requiredAmount:1,reward:{gold:7000,exp:3500}},{id:'q13',title:'Cace o Espreitador e o Lich',type:'kill',target:'Espreitador das Sombras',requiredAmount:1,reward:{gold:8000,exp:4000}},{id:'q14',title:'Derrote o Dragão e o Horror',type:'kill',target:'Dragão Cristalino',requiredAmount:1,reward:{gold:10000,exp:5000}},{id:'q15',title:'A Serpente Abissal',type:'kill',target:'Serpente Abissal',requiredAmount:1,reward:{gold:8000,exp:3000}},{id:'q16',title:'O Titã de Magma',type:'kill',target:'Titã de Magma',requiredAmount:1,reward:{gold:9000,exp:3500}},{id:'q17',title:'O Soberano da Tempestade',type:'kill',target:'Soberano da Tempestade',requiredAmount:1,reward:{gold:10000,exp:4000}},{id:'q18',title:'O Treant Ancião',type:'kill',target:'Treant Ancião',requiredAmount:1,reward:{gold:11000,exp:4500}},{id:'q19',title:'O Espreitador das Sombras',type:'kill',target:'Espreitador das Sombras',requiredAmount:1,reward:{gold:12000,exp:5000}},{id:'q20',title:'O Lich Gélido',type:'kill',target:'Lich Gélido',requiredAmount:1,reward:{gold:13000,exp:5500}},{id:'q21',title:'O Beemote da Tempestade de Areia',type:'kill',target:'Beemote da Tempestade de Areia',requiredAmount:1,reward:{gold:14000,exp:6000}},{id:'q22',title:'O Dragão Cristalino',type:'kill',target:'Dragão Cristalino',requiredAmount:1,reward:{gold:15000,exp:6500}},{id:'q23',title:'O Horror do Vazio',type:'kill',target:'Horror do Vazio',requiredAmount:1,reward:{gold:20000,exp:8000}},{id:'q24',title:'O Guardião Celestial',type:'kill',target:'Guardião Celestial',requiredAmount:1,reward:{gold:30000,exp:10000}}];
const translations = {pt:{header_title:"Simplest RPG",menu_hunt:"Caçar",menu_inventory:"Inventário",menu_status:"Status",menu_shop:"Loja",menu_upgrade:"Aprimorar",menu_skills:"Habilidades",menu_quests:"Missões",menu_settings:"Opções",common_level:"Nível",common_gold:"Ouro",common_hp:"HP",common_exp:"EXP",common_energy:"Energia",common_atk:"ATK",common_def:"DEF",common_back:"Voltar",common_type:"Tipo",common_min_level:"Nível Mín",common_element:"Elemento",common_resistance:"Resistência",common_price:"Preço",common_unarmed:"Desarmado",common_empty:"Vazio",common_set:"Conjunto",rarity_common:"Comum",rarity_uncommon:"Incomum",rarity_rare:"Raro",rarity_epic:"Épico",rarity_legendary:"Lendário",hunt_title:"Escolha sua Caça",hunt_weakness:"Fraqueza",hunt_boss_locked:"Complete a missão '{quest_title}' para desbloquear.",combat_you:"Você",combat_attack:"Atacar",combat_skills:"Habilidades",combat_auto_battle:"Auto Batalha",combat_cancel_auto:"Cancelar Auto",combat_flee:"Fugir",combat_return_to_hunt:"Voltar para Caça",combat_choose_skill:"Escolha uma Habilidade",combat_no_skills:"Nenhuma habilidade aprendida.",combat_close:"Fechar",combat_boss_encounter:"ENCONTRO DE CHEFE",inventory_title:"Inventário",inventory_equipment:"Equipamento",inventory_equip:"Equipar",inventory_unequip:"Desequipar",inventory_sell:"Vender",inventory_sell_confirm:"Tem certeza que quer vender {name} por {price} de ouro?",inventory_status_equipped:"Equipado",inventory_items:"Itens",inventory_no_items:"Nenhum item no inventário.",inventory_materials:"Materiais",inventory_no_materials:"Nenhum material.",inventory_slot_weapon:"Arma",inventory_slot_shield:"Escudo",inventory_slot_helmet:"Elmo",inventory_slot_armor:"Armadura",inventory_slot_gloves:"Luvas",inventory_slot_boots:"Botas",shop_title:"Loja",shop_buy_confirm:"Comprar {name}?",shop_cost:"Custo",shop_confirm:"Confirmar",shop_cancel:"Cancelar",shop_filter_all:"Todos",shop_sort_by:"Ordenar por:",shop_sort_default:"Padrão",shop_sort_price_asc:"Preço: Menor ao Maior",shop_sort_price_desc:"Preço: Maior ao Menor",shop_sort_level_asc:"Nível: Menor ao Maior",shop_sort_level_desc:"Nível: Maior ao Menor",upgrade_title:"Aprimorar Itens",upgrade_select_item:"Selecione um item para aprimorar:",upgrade_button:"Aprimorar",skills_title:"Habilidades",skills_learn:"Aprender Habilidades",skills_energy_cost:"Custo de Energia",skills_learn_cost:"Custo para Aprender",skills_learn_button:"Aprender",quests_title:"Missões",quests_objective:"Objetivo",quests_progress:"Progresso",quests_reward:"Recompensa",quests_claim:"Resgatar Recompensa",settings_title:"Opções",settings_sound:"Som",settings_sound_on:"Ligar Som",settings_sound_off:"Desligar Som",settings_autoheal:"AutoHeal",settings_autoheal_enable:"Ativar AutoHeal",settings_autoheal_threshold:"Curar quando HP < {threshold}%",settings_autoheal_resource:"Usar para curar:",settings_autoheal_gold:"Ouro (100)",settings_autoheal_energy:"Energia (20)",settings_language:"Idioma",story_mode_title:"Modo História",story_mode_enable:"Ativar Modo História",story_mode_disable:"Desativar Modo História",status_title:"Status do Jogador",status_primary_stats:"Atributos Primários",status_combat_stats:"Atributos de Combate",status_base:"Base",status_equipment:"Equipamento",status_total:"Total",status_elemental_properties:"Propriedades Elementais",status_attack_element:"Elemento de Ataque",status_resistances:"Resistências",status_active_effects:"Efeitos Ativos",status_no_effects:"Nenhum efeito ativo.",status_none:"Nenhum",status_set_bonuses:"Bônus de Conjunto",notification_save_auto:"Jogo salvo automaticamente!",notification_save_error:"Erro ao salvar o jogo!",notification_levelup:"Você subiu para o nível {level}!",notification_too_weak:"Você é muito fraco para este monstro!",notification_fled:"Você fugiu da batalha!",notification_equip_level:"Nível insuficiente para equipar este item.",notification_equipped:"{name} equipado.",notification_unequipped:"{name} desequipado.",notification_sold:"Você vendeu {name} por {price} de ouro.",notification_bought:"Você comprou {name}!",notification_no_gold:"Ouro insuficiente!",notification_skill_already_known:"Você já conhece esta habilidade.",notification_skill_no_level:"Nível insuficiente para aprender.",notification_skill_learned:"Você aprendeu: {name}!",notification_quest_reward:"Recompensa da missão '{title}' resgatada!",notification_upgrade_max:"Nível de aprimoramento máximo atingido.",notification_no_resources:"Recursos insuficientes para aprimorar.",notification_autoheal_gold:"AutoHeal: HP restaurado por {cost} Ouro!",notification_autoheal_energy:"AutoHeal: HP restaurado por {cost} Energia!",notification_upgrade_success:"Item aprimorado para +{level}!",log_your_turn:"--- Seu Turno ---",log_base_damage:"Dano base: {atk}(ATK) - {def}(DEF) = {damage}",log_super_effective:"Super Efetivo! (Dano x1.5)",log_not_very_effective:"Pouco Efetivo. (Dano x0.5)",log_you_dealt:"Você causou {damage} de dano!",log_monster_defeated:"{name} foi derrotado!",log_gained_gold_exp:"Você ganhou {gold} de ouro e {exp} de EXP!",log_found_item:"Você encontrou: {name}!",log_quest_complete:"Missão '{title}' completa!",log_hp_low_autobattle_off:"HP baixo! Auto-batalha cancelada.",log_next_monster:"Próximo monstro em breve...",log_new_monster:"Um novo {name} apareceu!",log_monster_turn:"--- Turno do {name} ---",log_monster_attacks_with:"{name} ataca com {atk} de ATK base.",log_your_def_reduced:"Sua defesa de {def} reduziu o dano.",log_elemental_resistance:"Você resistiu ao ataque elemental! (Dano x0.5)",log_monster_dealt:"{name} causou {damage} de dano!",log_you_were_defeated:"Você foi derrotado!",log_buff_expired:"O efeito de {name} acabou.",log_skill_turn:"--- Seu Turno (Habilidade: {name}) ---",log_skill_damage_mult:"{name} multiplicou o dano por {mult}!",log_skill_dealt_damage:"Causou {damage} de dano com a habilidade!",log_skill_heal:"Você se curou em {amount} HP!",log_skill_buff:"Seu {stat} aumentou!",log_skill_lifesteal:"Você drenou {amount} de HP!",log_skill_debuff:"O ATK de {name} foi reduzido!",log_monster_uses_ability:"{name} usa {ability}!",log_monster_heals:"{name} recupera {amount} de HP!",log_player_stat_reduced:"Sua {stat} foi reduzida!",log_monster_dodged:"{name} se esquivou do ataque!",log_monster_focus_heal:"{name} foca em se curar!",log_monster_focus_debuff:"{name} tenta te enfraquecer!",ability_vicious_strike:"Golpe Feroz",ability_warcry:"Grito de Guerra",ability_stone_regrowth:"Regeneração Rochosa",ability_earthen_ward:"Proteção Terrena",ability_granite_slam:"Golpe de Granito",ability_tidal_wave:"Onda de Maré",ability_corrosive_spittle:"Cuspe Corrosivo",ability_volcanic_eruption:"Erupção Vulcânica",ability_scorching_aura:"Aura Ardente",ability_cyclone_burst:"Explosão Ciclone",ability_static_field:"Campo Estático",ability_root_slam:"Golpe de Raiz",ability_bark_regrowth:"Recrescimento de Casca",ability_ambush:"Emboscada",ability_glacial_spike:"Espinho Glacial",ability_frozen_armor:"Armadura Congelada",ability_sandblast:"Tempestade de Areia",ability_earthen_hide:"Pele Terrena",ability_prismatic_breath:"Sopro Prismático",ability_crystallize:"Cristalizar",ability_mind_shatter:"Estilhaçar Mente",ability_consume_light:"Consumir Luz",ability_judgment:"Julgamento",ability_divine_shield:"Escudo Divino",ability_heavenly_heal:"Cura Celestial",race_ancient_automaton:"Autômato Antigo",race_deep_sea_horror:"Horror do Mar Profundo",race_volcanic_behemoth:"Beemote Vulcânico",race_tempest_incarnate:"Tempestade Encarnada",race_forest_guardian:"Guardião da Floresta",race_void_ambusher:"Emboscador do Vazio",race_frozen_tyrant:"Tirano Congelado",race_desert_fury:"Fúria do Deserto",race_prismatic_wyrm:"Serpe Prismática",race_extradimensional_terror:"Terror Extradimensional",race_divine_protector:"Protetor Divino",desc_w1:"Uma espada simples e confiável para iniciantes.",desc_s1:"Um pedaço de madeira amarrado. É melhor que nada.",desc_h1:"Protege a cabeça de galhos baixos e pequenos goblins.",desc_a1:"Feito de couro endurecido, oferece proteção modesta.",desc_w2:"Pesado e brutal, este machado pode abrir armaduras leves.",desc_s2:"Um escudo de ferro sólido que pode parar um golpe sério.",desc_g1:"Luvas simples para uma melhor aderência à sua arma.",desc_b1:"Botas resistentes para longas caminhadas e pisar em slimes.",desc_w3:"Leve e afiada, criada com a perícia élfica.",desc_h2:"Um elmo de ferro que cobre totalmente a cabeça.",desc_a2:"Placas de ferro que oferecem boa proteção para o torso.",desc_w4:"Uma lâmina encantada que queima ao toque.",desc_s3:"Um escudo que ondula com a magia da água, apagando chamas.",desc_g2:"Manoplas de ferro que adicionam peso aos seus socos.",desc_b2:"Botas de ferro pesado para uma postura firme.",desc_w5:"Um martelo de guerra tão pesado que pode rachar o chão.",desc_s4:"Um escudo leve que desvia golpes com rajadas de vento.",desc_w6:"Uma adaga que ataca com a velocidade de um furacão.",desc_h3:"Um elmo de aço polido, um sinal de um guerreiro veterano.",desc_a3:"Uma armadura de placas de aço, pesada, mas muito protetora.",desc_s5:"Um escudo grande feito de aço reforçado.",desc_w7:"Uma espada de duas mãos bem equilibrada para poder e precisão.",desc_w8:"Um cajado que congela o ar ao seu redor.",desc_s6:"Gravado com runas que anulam magias elementais.",desc_w9:"Dizem que esta lâmina contém o poder de uma tempestade.",desc_w10:"Um martelo tão pesado que dizem poder quebrar o próprio mundo.",desc_w11:"Uma arma real de uma civilização subaquática perdida.",desc_a4:"Forjado no coração de um vulcão. Irradia calor.",desc_b3:"Botas encantadas que se movem com a força de um furacão.",desc_s7:"Um escudo impenetrável que se manteve firme por eras.",desc_w12:"Adagas que atacam das sombras, invisíveis e mortais.",desc_h4:"A coroa gelada de um rei morto-vivo há muito esquecido.",'desc_g3':"Manoplas usadas por um campeão de um império desértico.",'desc_a5':"Escamas que mudam de cor, oferecendo proteção contra todos os elementos.",'desc_w13':"Uma lâmina que corta a própria realidade, deixando o vazio em seu rastro.",'desc_s8':"Um escudo abençoado pelos céus, oferecendo proteção divina.",set_name_leather:"Conjunto de Couro",set_name_iron:"Conjunto de Ferro",set_name_steel:"Conjunto de Aço",set_bonus_leather_2:"Bônus (2 Peças): +5 DEF",set_bonus_leather_4:"Bônus (4 Peças): +10 DEF, +5 ATK",set_bonus_iron_2:"Bônus (2 Peças): +10 DEF",set_bonus_iron_4:"Bônus (4 Peças): +25 DEF, +10 ATK",set_bonus_steel_2:"Bônus (2 Peças): +15 ATK",set_bonus_steel_4:"Bônus (4 Peças): +30 ATK, +15 DEF"},es:{header_title:"Simplest RPG",menu_hunt:"Cazar",menu_inventory:"Inventario",menu_status:"Estado",menu_shop:"Tienda",menu_upgrade:"Mejorar",menu_skills:"Habilidades",menu_quests:"Misiones",menu_settings:"Opciones",common_level:"Nivel",common_gold:"Oro",common_hp:"PS",common_exp:"EXP",common_energy:"Energía",common_atk:"ATQ",common_def:"DEF",common_back:"Volver",common_type:"Tipo",common_min_level:"Nivel Mín",common_element:"Elemento",common_resistance:"Resistencia",common_price:"Precio",common_unarmed:"Desarmado",common_empty:"Vacío",common_set:"Conjunto",rarity_common:"Común",rarity_uncommon:"Poco Común",rarity_rare:"Raro",rarity_epic:"Épico",rarity_legendary:"Legendario",hunt_title:"Elige tu Presa",hunt_weakness:"Debilidad",hunt_boss_locked:"Completa la misión '{quest_title}' para desbloquear.",combat_you:"Tú",combat_attack:"Atacar",combat_skills:"Habilidades",combat_auto_battle:"Auto Batalla",combat_cancel_auto:"Cancelar Auto",combat_flee:"Huir",combat_return_to_hunt:"Volver a Cazar",combat_choose_skill:"Elige una Habilidad",combat_no_skills:"No has aprendido habilidades.",combat_close:"Cerrar",combat_boss_encounter:"ENCUENTRO CON JEFE",inventory_title:"Inventario",inventory_equipment:"Equipo",inventory_equip:"Equipar",inventory_unequip:"Desequipar",inventory_sell:"Vender",inventory_sell_confirm:"¿Estás seguro de que quieres vender {name} por {price} de oro?",inventory_status_equipped:"Equipado",inventory_items:"Objetos",inventory_no_items:"No hay objetos en el inventario.",inventory_materials:"Materiales",inventory_no_materials:"No hay materiales.",inventory_slot_weapon:"Arma",inventory_slot_shield:"Escudo",inventory_slot_helmet:"Yelmo",inventory_slot_armor:"Armadura",inventory_slot_gloves:"Guantes",inventory_slot_boots:"Botas",shop_title:"Tienda",shop_buy_confirm:"¿Comprar {name}?",shop_cost:"Coste",shop_confirm:"Confirmar",shop_cancel:"Cancelar",shop_filter_all:"Todos",shop_sort_by:"Ordenar por:",shop_sort_default:"Por defecto",shop_sort_price_asc:"Precio: Bajo a Alto",shop_sort_price_desc:"Precio: Alto a Bajo",shop_sort_level_asc:"Nivel: Bajo a Alto",shop_sort_level_desc:"Nivel: Alto a Bajo",upgrade_title:"Mejorar Objetos",upgrade_select_item:"Selecciona un objeto para mejorar:",upgrade_button:"Mejorar",skills_title:"Habilidades",skills_learn:"Aprender Habilidades",skills_energy_cost:"Coste de Energía",skills_learn_cost:"Coste de Aprendizaje",skills_learn_button:"Aprender",quests_title:"Misiones",quests_objective:"Objetivo",quests_progress:"Progreso",quests_reward:"Recompensa",quests_claim:"Reclamar Recompensa",settings_title:"Opciones",settings_sound:"Sonido",settings_sound_on:"Activar Sonido",settings_sound_off:"Desactivar Sonido",settings_autoheal:"AutoCurar",settings_autoheal_enable:"Activar AutoCurar",settings_autoheal_threshold:"Curar si PS < {threshold}%",settings_autoheal_resource:"Usar para curar:",settings_autoheal_gold:"Oro (100)",settings_autoheal_energy:"Energía (20)",settings_language:"Idioma",story_mode_title:"Modo Historia",story_mode_enable:"Activar Modo Historia",story_mode_disable:"Desactivar Modo Historia",status_title:"Estado del Jugador",status_primary_stats:"Estadísticas Primarias",status_combat_stats:"Estadísticas de Combate",status_base:"Base",status_equipment:"Equipo",status_total:"Total",status_elemental_properties:"Propiedades Elementales",status_attack_element:"Elemento de Ataque",status_resistances:"Resistencias",status_active_effects:"Efectos Activos",status_no_effects:"Sin efectos activos.",status_none:"Ninguno",status_set_bonuses:"Bonos de Conjunto",notification_save_auto:"Juego guardado automáticamente.",notification_save_error:"Error al guardar el juego.",notification_levelup:"¡Has subido al nivel {level}!",notification_too_weak:"¡Eres demasiado débil para este monstruo!",notification_fled:"¡Has huido de la batalla!",notification_equip_level:"Nivel insuficiente para equipar este objeto.",notification_equipped:"{name} equipado.",notification_unequipped:"{name} desequipado.",notification_sold:"Has vendido {name} por {price} de oro.",notification_bought:"¡Has comprado {name}!",notification_no_gold:"¡Oro insuficiente!",notification_skill_already_known:"Ya conoces esta habilidad.",notification_skill_no_level:"Nivel insuficiente para aprender.",notification_skill_learned:"¡Has aprendido: {name}!",notification_quest_reward:"¡Recompensa de la misión '{title}' reclamada!",notification_upgrade_max:"Nivel de mejora máximo alcanzado.",notification_no_resources:"Recursos insuficientes para mejorar.",notification_autoheal_gold:"AutoCurar: ¡PS restaurados por {cost} de Oro!",notification_autoheal_energy:"AutoCurar: ¡PS restaurados por {cost} de Energía!",notification_upgrade_success:"¡Objeto mejorado a +{level}!",log_your_turn:"--- Tu Turno ---",log_base_damage:"Daño base: {atk}(ATQ) - {def}(DEF) = {damage}",log_super_effective:"¡Súper Efectivo! (Daño x1.5)",log_not_very_effective:"Poco Efectivo. (Daño x0.5)",log_you_dealt:"¡Has infligido {damage} de daño!",log_monster_defeated:"¡{name} ha sido derrotado!",log_gained_gold_exp:"¡Has ganado {gold} de oro y {exp} de EXP!",log_found_item:"Has encontrado: ¡{name}!",log_quest_complete:"¡Misión '{title}' completada!",log_hp_low_autobattle_off:"¡PS bajos! Auto-batalla cancelada.",log_next_monster:"Próximo monstruo en breve...",log_new_monster:"¡Ha aparecido un nuevo {name}!",log_monster_turn:"--- Turno de {name} ---",log_monster_attacks_with:"{name} ataca con {atk} de ATQ base.",log_your_def_reduced:"Tu defensa de {def} ha reducido el daño.",log_elemental_resistance:"¡Has resistido el ataque elemental! (Daño x0.5)",log_monster_dealt:"¡{name} te ha infligido {damage} de daño!",log_you_were_defeated:"¡Has sido derrotado!",log_buff_expired:"El efecto de {name} ha terminado.",log_skill_turn:"--- Tu Turno (Habilidad: {name}) ---",log_skill_damage_mult:"¡{name} multiplicó el daño por {mult}!",log_skill_dealt_damage:"¡Has infligigido {damage} de daño con la habilidad!",log_skill_heal:"¡Te has curado {amount} PS!",log_skill_buff:"¡Tu {stat} ha aumentado!",log_skill_lifesteal:"¡Has drenado {amount} PS!",log_skill_debuff:"¡El ATQ de {name} ha sido reducido!",log_monster_uses_ability:"¡{name} usa {ability}!",log_monster_heals:"¡{name} recupera {amount} PS!",log_player_stat_reduced:"¡Tu {stat} se ha reducido!",log_monster_dodged:"¡{name} esquivó el ataque!",log_monster_focus_heal:"¡{name} se concentra en curarse!",log_monster_focus_debuff:"¡{name} intenta debilitarte!",ability_vicious_strike:"Golpe Feroz",ability_warcry:"Grito de Guerra",ability_stone_regrowth:"Regeneración Pétrea",ability_earthen_ward:"Resguardo Terrenal",ability_granite_slam:"Golpe de Granito",ability_tidal_wave:"Maremoto",ability_corrosive_spittle:"Escupitajo Corrosivo",ability_volcanic_eruption:"Erupción Volcánica",ability_scorching_aura:"Aura Abrasadora",ability_cyclone_burst:"Ráfaga Ciclónica",ability_static_field:"Campo Estático",ability_root_slam:"Golpe de Raíz",ability_bark_regrowth:"Recrecimiento de Corteza",ability_ambush:"Emboscada",ability_glacial_spike:"Pico Glacial",ability_frozen_armor:"Armadura Congelada",ability_sandblast:"Chorro de Arena",ability_earthen_hide:"Piel Terrosa",ability_prismatic_breath:"Aliento Prismático",ability_crystallize:"Cristalizar",ability_mind_shatter:"Romper Mente",ability_consume_light:"Consumir Luz",ability_judgment:"Juicio Final",ability_divine_shield:"Escudo Divino",ability_heavenly_heal:"Curación Celestial",race_ancient_automaton:"Autómata Antiguo",race_deep_sea_horror:"Horror de las Profundidades",race_volcanic_behemoth:"Behemot Volcánico",race_tempest_incarnate:"Tempestad Encarnada",race_forest_guardian:"Guardián del Bosque",race_void_ambusher:"Acechador del Vacío",race_frozen_tyrant:"Tirano Congelado",race_desert_fury:"Furia del Desierto",race_prismatic_wyrm:"Wyrm Prismático",race_extradimensional_terror:"Terror Extradimensional",race_divine_protector:"Protector Divino",desc_w1:"Una espada simple y fiable para principiantes.",desc_s1:"Un trozo de madera atado. Es mejor que nada.",desc_h1:"Protege la cabeza de ramas bajas y pequeños goblins.",desc_a1:"Hecho de cuero endurecido, ofrece una protección modesta.",desc_w2:"Pesada y brutal, esta hacha puede abrir armaduras ligeras.",desc_s2:"Un sólido escudo de hierro que puede detener un golpe serio.",desc_g1:"Guantes sencillos para un mejor agarre de tu arma.",desc_b1:"Botas resistentes para largas caminatas y para pisar slimes.",desc_w3:"Ligera y afilada, fabricada con la pericia élfica.",desc_h2:"Un yelmo de hierro que cubre completamente la cabeza.",desc_a2:"Placas de hierro que ofrecen buena protección para el torso.",desc_w4:"Una hoja encantada que arde al tacto.",desc_s3:"Un escudo que ondula con magia de agua, apagando llamas.",desc_g2:"Guanteletes de hierro que añaden peso a tus puñetazos.",desc_b2:"Grebas de hierro pesado para una postura firme.",desc_w5:"Un martillo de guerra tan pesado que puede agrietar el suelo.",desc_s4:"Un escudo ligero que desvía los golpes con ráfagas de viento.",desc_w6:"Una daga que golpea con la velocidad de un huracán.",desc_h3:"Un yelmo de acero pulido, señal de un guerrero veterano.",desc_a3:"Una armadura de placas de acero, pesada pero muy protectora.",desc_s5:"Un gran escudo hecho de acero reforzado.",desc_w7:"Una espada de dos manos bien equilibrada para poder y precisión.",desc_w8:"Un bastón que congela el aire a su alrededor.",desc_s6:"Grabado con runas que anulan magias elementales.",desc_w9:"Se dice que esta hoja contiene el poder de una tormenta.",desc_w10:"Un martillo tan pesado que se dice que puede romper el mundo.",desc_w11:"Un arma real de una civilización submarina perdida.",desc_a4:"Forjado en el corazón de un volcán. Irradia calor.",desc_b3:"Botas encantadas que se mueven con la fuerza de un huracán.",desc_s7:"Un escudo impenetrable que ha permanecido firme por eones.",desc_w12:"Dagas que golpean desde las sombras, invisibles y mortales.",desc_h4:"La corona helada de un rey no-muerto olvidado hace mucho tiempo.",desc_g3:"Guanteletes usados por un campeón de un imperio del desierto.",desc_a5:"Escamas que cambian de color, ofreciendo protección contra todos los elementos.",desc_w13:"Una hoja que corta la propia realidad, dejando el vacío tras de sí.",desc_s8:"Un escudo bendecido por los cielos, que ofrece protección divina.",set_name_leather:"Conjunto de Cuero",set_name_iron:"Conjunto de Hierro",set_name_steel:"Conjunto de Acero",set_bonus_leather_2:"Bono (2 Piezas): +5 DEF",set_bonus_leather_4:"Bono (4 Piezas): +10 DEF, +5 ATQ",set_bonus_iron_2:"Bono (2 Piezas): +10 DEF",set_bonus_iron_4:"Bono (4 Piezas): +25 DEF, +10 ATQ",set_bonus_steel_2:"Bono (2 Piezas): +15 ATQ",set_bonus_steel_4:"Bono (4 Piezas): +30 ATQ, +15 DEF"},en:{header_title:"Simplest RPG",menu_hunt:"Hunt",menu_inventory:"Inventory",menu_status:"Status",menu_shop:"Shop",menu_upgrade:"Upgrade",menu_skills:"Skills",menu_quests:"Quests",menu_settings:"Settings",common_level:"Level",common_gold:"Gold",common_hp:"HP",common_exp:"EXP",common_energy:"Energy",common_atk:"ATK",common_def:"DEF",common_back:"Back",common_type:"Type",common_min_level:"Min Level",common_element:"Element",common_resistance:"Resistance",common_price:"Price",common_unarmed:"Unarmed",common_empty:"Empty",common_set:"Set",rarity_common:"Common",rarity_uncommon:"Uncommon",rarity_rare:"Rare",rarity_epic:"Epic",rarity_legendary:"Legendary",hunt_title:"Choose your Hunt",hunt_weakness:"Weakness",hunt_boss_locked:"Complete the '{quest_title}' quest to unlock.",combat_you:"You",combat_attack:"Attack",combat_skills:"Skills",combat_auto_battle:"Auto Battle",combat_cancel_auto:"Cancel Auto",combat_flee:"Flee",combat_return_to_hunt:"Back to Hunt",combat_choose_skill:"Choose a Skill",combat_no_skills:"No skills learned.",combat_close:"Close",combat_boss_encounter:"BOSS ENCOUNTER",inventory_title:"Inventory",inventory_equipment:"Equipment",inventory_equip:"Equip",inventory_unequip:"Unequip",inventory_sell:"Sell",inventory_sell_confirm:"Are you sure you want to sell {name} for {price} gold?",inventory_status_equipped:"Equipped",inventory_items:"Items",inventory_no_items:"No items in inventory.",inventory_materials:"Materials",inventory_no_materials:"No materials.",inventory_slot_weapon:"Weapon",inventory_slot_shield:"Shield",inventory_slot_helmet:"Helmet",inventory_slot_armor:"Armor",inventory_slot_gloves:"Gloves",inventory_slot_boots:"Boots",shop_title:"Shop",shop_buy_confirm:"Buy {name}?",shop_cost:"Cost",shop_confirm:"Confirm",shop_cancel:"Cancel",shop_filter_all:"All",shop_sort_by:"Sort by:",shop_sort_default:"Default",shop_sort_price_asc:"Price: Low to High",shop_sort_price_desc:"Price: High to Low",shop_sort_level_asc:"Level: Low to High",shop_sort_level_desc:"Level: High to Low",upgrade_title:"Upgrade Items",upgrade_select_item:"Select an item to upgrade:",upgrade_button:"Upgrade",skills_title:"Skills",skills_learn:"Learn Skills",skills_energy_cost:"Energy Cost",skills_learn_cost:"Learn Cost",skills_learn_button:"Learn",quests_title:"Quests",quests_objective:"Objective",quests_progress:"Progress",quests_reward:"Reward",quests_claim:"Claim Reward",settings_title:"Settings",settings_sound:"Sound",settings_sound_on:"Turn Sound On",settings_sound_off:"Turn Sound Off",settings_autoheal:"AutoHeal",settings_autoheal_enable:"Enable AutoHeal",settings_autoheal_threshold:"Heal when HP < {threshold}%",settings_autoheal_resource:"Use to heal:",settings_autoheal_gold:"Gold (100)",settings_autoheal_energy:"Energy (20)",settings_language:"Language",story_mode_title:"Story Mode",story_mode_enable:"Enable Story Mode",story_mode_disable:"Disable Story Mode",status_title:"Player Status",status_primary_stats:"Primary Stats",status_combat_stats:"Combat Stats",status_base:"Base",status_equipment:"Equipment",status_total:"Total",status_elemental_properties:"Elemental Properties",status_attack_element:"Attack Element",status_resistances:"Resistances",status_active_effects:"Active Effects",status_no_effects:"No active effects.",status_none:"None",status_set_bonuses:"Set Bonuses",notification_save_auto:"Game saved automatically.",notification_save_error:"Error saving game.",notification_levelup:"You leveled up to level {level}!",notification_too_weak:"You are too weak for this monster!",notification_fled:"You fled from battle!",notification_equip_level:"Insufficient level to equip this item.",notification_equipped:"{name} equipped.",notification_unequipped:"{name} unequipped.",notification_sold:"You sold {name} for {price} gold.",notification_bought:"You bought {name}!",notification_no_gold:"Insufficient gold!",notification_skill_already_known:"You already know this skill.",notification_skill_no_level:"Insufficient level to learn.",notification_skill_learned:"You learned: {name}!",notification_quest_reward:"Reward for quest '{title}' claimed!",notification_upgrade_max:"Maximum upgrade level reached.",notification_no_resources:"Insufficient resources to upgrade.",notification_autoheal_gold:"AutoHeal: HP restored for {cost} Gold!",notification_autoheal_energy:"AutoHeal: HP restored for {cost} Energy!",notification_upgrade_success:"Item upgraded to +{level}!",log_your_turn:"--- Your Turn ---",log_base_damage:"Base damage: {atk}(ATK) - {def}(DEF) = {damage}",log_super_effective:"Super Effective! (Damage x1.5)",log_not_very_effective:"Not Very Effective. (Damage x0.5)",log_you_dealt:"You dealt {damage} damage!",log_monster_defeated:"{name} was defeated!",log_gained_gold_exp:"You gained {gold} gold and {exp} EXP!",log_found_item:"You found: {name}!",log_quest_complete:"Quest '{title}' complete!",log_hp_low_autobattle_off:"Low HP! Auto-battle canceled.",log_next_monster:"Next monster coming soon...",log_new_monster:"A new {name} appeared!",log_monster_turn:"--- {name}'s Turn ---",log_monster_attacks_with:"{name} attacks with {atk} base ATK.",log_your_def_reduced:"Your defense of {def} reduced the damage.",log_elemental_resistance:"You resisted the elemental attack! (Damage x0.5)",log_monster_dealt:"{name} dealt {damage} damage!",log_you_were_defeated:"You were defeated!",log_buff_expired:"The effect of {name} wore off.",log_skill_turn:"--- Your Turn (Skill: {name}) ---",log_skill_damage_mult:"{name} multiplied the damage by {mult}!",log_skill_dealt_damage:"Dealt {damage} damage with the skill!",log_skill_heal:"You healed for {amount} HP!",log_skill_buff:"Your {stat} increased!",log_skill_lifesteal:"You drained {amount} HP!",log_skill_debuff:"{name}'s ATK was reduced!",log_monster_uses_ability:"{name} uses {ability}!",log_monster_heals:"{name} recovers {amount} HP!",log_player_stat_reduced:"Your {stat} was reduced!",log_monster_dodged:"{name} dodged the attack!",log_monster_focus_heal:"{name} focuses on healing itself!",log_monster_focus_debuff:"{name} tries to weaken you!",ability_vicious_strike:"Vicious Strike",ability_warcry:"War Cry",ability_stone_regrowth:"Stone Regrowth",ability_earthen_ward:"Earthen Ward",ability_granite_slam:"Granite Slam",ability_tidal_wave:"Tidal Wave",ability_corrosive_spittle:"Corrosive Spittle",ability_volcanic_eruption:"Volcanic Eruption",ability_scorching_aura:"Scoring Aura",ability_cyclone_burst:"Cyclone Burst",ability_static_field:"Static Field",ability_root_slam:"Root Slam",ability_bark_regrowth:"Bark Regrowth",ability_ambush:"Ambush",ability_glacial_spike:"Glacial Spike",ability_frozen_armor:"Frozen Armor",ability_sandblast:"Sandblast",ability_earthen_hide:"Earthen Hide",ability_prismatic_breath:"Prismatic Breath",ability_crystallize:"Crystallize",ability_mind_shatter:"Mind Shatter",ability_consume_light:"Consume Light",ability_judgment:"Judgment",ability_divine_shield:"Divine Shield",ability_heavenly_heal:"Heavenly Heal",race_ancient_automaton:"Ancient Automaton",race_deep_sea_horror:"Deep Sea Horror",race_volcanic_behemoth:"Volcanic Behemoth",race_tempest_incarnate:"Tempest Incarnate",race_forest_guardian:"Forest Guardian",race_void_ambusher:"Void Ambusher",race_frozen_tyrant:"Frozen Tyrant",race_desert_fury:"Desert Fury",race_prismatic_wyrm:"Prismatic Wyrm",race_extradimensional_terror:"Extradimensional Terror",race_divine_protector:"Divine Protector",desc_w1:"A simple and reliable sword for beginners.",desc_s1:"A strapped piece of wood. It's better than nothing.",desc_h1:"Protects the head from low-hanging branches and small goblins.",desc_a1:"Made of hardened leather, it offers modest protection.",desc_w2:"Heavy and brutal, this axe can cleave through light armor.",desc_s2:"A solid iron shield that can stop a serious blow.",desc_g1:"Simple gloves for a better grip on your weapon.",desc_b1:"Sturdy boots for long walks and stomping on slimes.",desc_w3:"Light and sharp, crafted with elven skill.",desc_h2:"An iron helm that fully encases the head.",desc_a2:"Iron plates that offer good protection for the torso.",desc_w4:"An enchanted blade that burns to the touch.",desc_s3:"A shield that ripples with water magic, dousing flames.",desc_g2:"Iron gauntlets that add weight to your punches.",desc_b2:"Heavy iron greaves for a firm stance.",desc_w5:"A warhammer so heavy it can crack the ground.",desc_s4:"A light shield that deflects blows with gusts of wind.",desc_w6:"A dagger that strikes with the speed of a hurricane.",desc_h3:"A polished steel helm, a sign of a veteran warrior.",desc_a3:"A suit of steel plate, heavy but very protective.",desc_s5:"A large shield made of reinforced steel.",desc_s6:"Engraved with runes that nullify elemental magics.",desc_w9:"This blade is said to contain the power of a storm.",desc_w10:"A hammer so heavy it is said to be able to break the world.",desc_w11:"A royal weapon from a lost underwater civilization.",desc_a4:"Forged in the heart of a volcano. It radiates heat.",desc_b3:"Enchanted boots that move with the force of a hurricane.",desc_s7:"An unbreakable shield that has stood firm for eons.",desc_w12:"Daggers that strike from the shadows, unseen and deadly.",desc_h4:"The frozen crown of a long-forgotten undead king.",desc_g3:"Gauntlets worn by a champion of a desert empire.",desc_a5:"Scales that shift in color, providing protection against all elements.",desc_w13:"A blade that cuts reality itself, leaving void in its wake.",desc_s8:"A shield blessed by the heavens, offering divine protection.",set_name_leather:"Leather Set",set_name_iron:"Iron Set",set_name_steel:"Steel Set",set_bonus_leather_2:"Bonus (2 Pieces): +5 DEF",set_bonus_leather_4:"Bonus (4 Pieces): +10 DEF, +5 ATK",set_bonus_iron_2:"Bonus (2 Pieces): +10 DEF",set_bonus_iron_4:"Bonus (4 Pieces): +25 DEF, +10 ATK",set_bonus_steel_2:"Bonus (2 Pieces): +15 ATK",set_bonus_steel_4:"Bonus (4 Pieces): +30 ATK, +15 DEF"}}

// --- GAME STATE ---
// FIX: Changed state from {} to a typed GameState object to resolve numerous property access errors.
let state: GameState = {} as GameState;
let notificationTimeout: number;
let saveStatusTimeout: number;

// --- HELPER FUNCTIONS ---
const t = (key: string, replacements = {}) => {
  let text = translations[state.language]?.[key] || translations['en']?.[key] || key;
  for (const placeholder in replacements) {
      text = text.replace(`{${placeholder}}`, replacements[placeholder]);
  }
  return text;
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
};

const getItemPrice = (itemData: any) => {
  const rarity = itemData.rarity || 'common';
  return Math.floor(itemData.price * (rarityData[rarity]?.priceMultiplier || 1));
};

const getSkillTier = (minLevel: number) => {
  if (minLevel >= 12) return { ...rarityData.epic, key: 'epic' };
  if (minLevel >= 8) return { ...rarityData.rare, key: 'rare' };
  if (minLevel >= 5) return { ...rarityData.uncommon, key: 'uncommon' };
  return { ...rarityData.common, key: 'common' };
};

const showNotification = (message: string) => {
  clearTimeout(notificationTimeout);
  state.notification = message;
  render(); // Render immediately to show notification
  notificationTimeout = setTimeout(() => {
      state.notification = null;
      render(); // Render again to hide it
  }, 2900); // Slightly less than animation duration
};

// --- ANIMATION HELPERS ---
const showDamagePopup = (targetCard: HTMLElement, damage: number) => {
    if (!targetCard) return;
    const popup = document.createElement('div');
    popup.textContent = String(damage);
    popup.className = 'damage-popup';
    targetCard.appendChild(popup);
    popup.addEventListener('animationend', () => {
        popup.remove();
    });
};

const triggerAnimation = (element: HTMLElement | null, animationClass: string) => {
    if (!element) return;
    element.classList.remove(animationClass); // Remove first to allow re-triggering
    void element.offsetWidth; // Trigger reflow
    element.classList.add(animationClass);
    element.addEventListener('animationend', () => {
        element.classList.remove(animationClass);
    }, { once: true });
};

// --- AI Storyteller ---
const getAITurnDescription = async (turnEvents: AIEvent, isPlayerTurn: boolean) => {
    const { playerStats } = state;
    const monster = state.selectedMonster;

    const playerHpPercent = (playerStats.hp / playerStats.maxHp) * 100;
    const monsterHpPercent = (state.monsterHp / monster.hp) * 100;

    // Helper to describe player's status effects
    const getPlayerEffectsString = (): string => {
        if (!state.activeBuffs || state.activeBuffs.length === 0) return '';
        const buffs = state.activeBuffs.filter(b => b.effect.multiplier > 1);
        const debuffs = state.activeBuffs.filter(b => b.effect.multiplier < 1);
        let effects: string[] = [];
        if (buffs.length > 0) {
            effects.push(`empowered by ${buffs.map(b => `'${b.name || 'a buff'}'`).join(', ')}`);
        }
        if (debuffs.length > 0) {
            effects.push(`weakened by ${debuffs.map(d => `'${d.name || 'a debuff'}'`).join(', ')}`);
        }
        return effects.length > 0 ? `The warrior is currently ${effects.join(' and ')}.` : '';
    };

    // Helper to describe monster's status effects
    const getMonsterEffectsString = (): string => {
        if (!state.monsterDebuffs || state.monsterDebuffs.length === 0) return '';
        const buffs = state.monsterDebuffs.filter(d => d.multiplier > 1);
        const debuffs = state.monsterDebuffs.filter(d => d.multiplier < 1);
        
        let effects: string[] = [];
        if (buffs.length > 0) {
            effects.push(`bolstered by ${buffs.map(b => `'${b.name || 'a buff'}'`).join(', ')}`);
        }
        if (debuffs.length > 0) {
            effects.push(`hindered by ${debuffs.map(d => `'${d.name || 'a debuff'}'`).join(', ')}`);
        }
        return effects.length > 0 ? `The monster is currently ${effects.join(' and ')}.` : '';
    };

    // Helper to describe the general battle situation
    const getBattleSituation = (): string => {
        if (playerHpPercent < 25) return "The warrior is gravely wounded, fighting for survival.";
        if (monsterHpPercent < 25) return "The monster is on its last legs, roaring in defiance.";
        if (playerHpPercent < 50) return "The warrior is taking heavy damage but presses on.";
        if (monsterHpPercent < 50) return "The monster is visibly wounded and enraged.";
        return "The battle is fiercely contested.";
    };

    const context = `
- Player Status: A Level ${playerStats.level} warrior with ${playerStats.hp}/${playerStats.maxHp} HP. ${getPlayerEffectsString()}
- Monster Status: A ${monster.name} with ${state.monsterHp}/${monster.hp} HP. ${getMonsterEffectsString()}
- Battle Situation: ${getBattleSituation()}`;

    const actionDescription = isPlayerTurn 
        ? `The player's action was: ${JSON.stringify(turnEvents)}.` 
        : `The monster's action was: ${JSON.stringify(turnEvents)}.`;

    const prompt = `You are a master storyteller for a fantasy RPG, tasked with writing a single, vivid sentence to describe a combat action.

INSTRUCTIONS:
1.  **Be Dramatic & Concise:** Write one powerful sentence.
2.  **Incorporate Status Effects:** Directly mention any active buffs (like 'empowered by...') or debuffs (like 'hindered by...') by name from the context.
3.  **Describe Elemental Effects Vividly:** If the action involves an element (e.g., 'Fire', 'Water'), describe its impact, not just the result.
    *   Fire: "a fiery blade sizzles," "embers trail the attack."
    *   Water/Ice: "icy shards pierce the air," "a torrent of water crashes down."
    *   Wind: "a gale-force slash," "the wind howls around the blade."
    *   Earth: "a stone-shattering blow," "the ground trembles from the impact."
4.  **Reflect the Battle's State:** Use the context about HP levels and the overall situation to set the tone (e.g., desperate, confident, overwhelming).
5.  **Plain Text Only:** Do NOT use markdown or any special formatting.

CONTEXT:
${context.trim().replace(/\n-/g, ' |')}

ACTION TO DESCRIBE:
${actionDescription}

EXAMPLE OUTPUT: Empowered by 'War Cry', the warrior langes, their fiery sword carving a sizzling gash across the wounded, stumbling monster!`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.85, topP: 0.9 }
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API call failed:", error);
        return "The storyteller's voice fades, lost to the chaos of battle...";
    }
};

const logCombat = (logData: { standardLogs?: (string | {content: string, icon: string})[], aiEvents?: AIEvent, isPlayerTurn?: boolean }) => {
    const { standardLogs, aiEvents, isPlayerTurn } = logData;

    if (state.aiStoryteller && aiEvents && isPlayerTurn !== undefined) {
        const logId = `log-${Date.now()}-${Math.random()}`;
        state.combatLog.push({ id: logId, type: 'ai', content: 'thinking' });
        
        getAITurnDescription(aiEvents, isPlayerTurn).then(story => {
            const logEntry = state.combatLog.find(l => l.id === logId);
            if (logEntry) {
                logEntry.content = story;
                render();
            }
        });

    } else if (standardLogs && standardLogs.length > 0) {
        standardLogs.forEach(log => {
            const isObject = typeof log === 'object';
            const content = isObject ? log.content : log;
            const icon = isObject ? log.icon : undefined;
            state.combatLog.push({ id: `log-${Date.now()}-${Math.random()}`, type: 'standard', content, icon });
        });
    }
    render();
};


// --- STATE MANAGEMENT ---
// Note: This function uses the browser's localStorage API to save game progress.
// This allows the game to run without a server or Node.js backend.
const saveGame = (isPeriodic = false) => {
  try {
      const saveEl = document.getElementById('save-status');
      if (isPeriodic && saveEl) {
          clearTimeout(saveStatusTimeout);
          saveEl.textContent = 'Saving...';
          saveEl.classList.add('visible');
      }

      const stateToSave = { ...state };
      // Don't save transient UI state
      delete stateToSave.notification;
      delete stateToSave.itemToBuy;
      delete stateToSave.itemToSell;
      delete stateToSave.showBossIntro;

      localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(stateToSave));
      
      if (isPeriodic && saveEl) {
          saveEl.textContent = 'Saved ✓';
          saveStatusTimeout = setTimeout(() => {
              saveEl.classList.remove('visible');
          }, 2000);
      }
  } catch (error) {
      console.error("Failed to save game:", error);
      showNotification(t('notification_save_error'));
      if (isPeriodic) {
          const saveEl = document.getElementById('save-status');
          if (saveEl) saveEl.classList.remove('visible');
      }
  }
};

const loadGame = () => {
  try {
      const savedGame = localStorage.getItem(SAVE_GAME_KEY);
      if (savedGame) {
          const parsed = JSON.parse(savedGame);
          if (parsed.playerStats && parsed.inventory && parsed.questProgress) {
              state = {
                  ...parsed,
                  currentView: 'menu',
                  selectedMonster: null, combatLog: [], isCombatOver: false, isAutoBattling: false,
                  activeBuffs: parsed.activeBuffs || [], monsterDebuffs: parsed.monsterDebuffs || [], showSkillSelection: false, itemToBuy: null, itemToSell: null, itemToUpgrade: null, combatTurn: 0, showBossIntro: false,
                  inventoryView: parsed.inventoryView || 'items',
                  aiStoryteller: parsed.aiStoryteller || false,
                  shopFilter: parsed.shopFilter || 'all',
                  shopSort: parsed.shopSort || 'default',
              };
              // Ensure new quests are added to old saves
              questsData.forEach(q => {
                  if (!state.questProgress[q.id]) {
                     state.questProgress[q.id] = { currentAmount: 0, completed: false };
                  }
              });
              return;
          }
      }
  } catch (error) {
      console.error("Failed to parse saved game data:", error);
  }
  
  const initialQuestProgress: QuestProgress = {};
  questsData.forEach(q => { initialQuestProgress[q.id] = { currentAmount: 0, completed: false }; });
  state = {
      currentView: 'menu', language: navigator.language.startsWith('es') ? 'es' : (navigator.language.startsWith('pt') ? 'pt' : 'en'),
      playerStats: { level: 1, hp: 100, maxHp: 100, energy: 50, maxEnergy: 50, gold: 100,
          baseAtk: 10, baseDef: 5, exp: 0, expToNextLevel: 100, learnedSkills: [],
      },
      inventory: [], materials: {}, questProgress: initialQuestProgress,
      inventoryView: 'items',
      soundOn: true, autoHealSettings: { enabled: false, threshold: 40, costType: 'gold' },
      selectedMonster: null, monsterHp: 0, combatLog: [], isCombatOver: false, isAutoBattling: false,
      activeBuffs: [], monsterDebuffs: [], showSkillSelection: false, notification: null, itemToBuy: null, itemToSell: null, itemToUpgrade: null, combatTurn: 0, showBossIntro: false,
      aiStoryteller: false,
      shopFilter: 'all',
      shopSort: 'default',
  };
};

// --- DERIVED STATE GETTERS ---
const getEquipment = () => {
  const equipped: {[key: string]: ItemInstance | null} = { weapon: null, shield: null, helmet: null, armor: null, gloves: null, boots: null };
  state.inventory.forEach(item => {
      if (item.equipped && item.type in equipped) {
          equipped[item.type] = item;
      }
  });
  return equipped;
};

const getTotalStats = () => {
  let totalAtk = state.playerStats.baseAtk;
  let totalDef = state.playerStats.baseDef;
  let equipmentAtk = 0;
  let equipmentDef = 0;
  let setBonusAtk = 0;
  let setBonusDef = 0;
  let attackElement = null;
  let resistances: string[] = [];
  let activeSetBonuses: any[] = [];
  
  const equipment = getEquipment();
  const setCounts: {[key: string]: number} = {};
  
  // First pass: get equipment stats and count set pieces
  Object.values(equipment).forEach(item => {
      if (item) {
          const itemData = itemDatabase[item.id];
          equipmentAtk += item.atk;
          equipmentDef += item.def;
          if (item.type === 'weapon' && itemData.element) attackElement = itemData.element;
          if (itemData.resistance) resistances.push(...itemData.resistance);
          if (itemData.set) {
              setCounts[itemData.set] = (setCounts[itemData.set] || 0) + 1;
          }
      }
  });

  // Second pass: calculate set bonuses
  for (const setName in setCounts) {
      const count = setCounts[setName];
      const bonusesForSet = setBonuses[setName];
      const fullSetSize = Object.values(itemDatabase).filter(i => i.set === setName).length;
      let appliedBonus = null;

      // Find the highest applicable bonus by checking from highest requirement to lowest
      Object.keys(bonusesForSet).map(Number).sort((a,b) => b - a).forEach(pieceRequirement => {
          if (!appliedBonus && count >= pieceRequirement) {
              appliedBonus = bonusesForSet[pieceRequirement];
              const bonusDef = appliedBonus.def || 0;
              const bonusAtk = appliedBonus.atk || 0;
              setBonusAtk += bonusAtk;
              setBonusDef += bonusDef;
              
              activeSetBonuses.push({
                  setName: t(`set_name_${setName}`),
                  pieces: `${count}/${fullSetSize}`,
                  description: t(appliedBonus.name_key)
              });
          }
      });
  }
  
  totalAtk += equipmentAtk + setBonusAtk;
  totalDef += equipmentDef + setBonusDef;
  
  state.activeBuffs.forEach(buff => {
      if (buff.effect.stat === 'atk') totalAtk = Math.floor(totalAtk * buff.effect.multiplier);
      if (buff.effect.stat === 'def') totalDef = Math.floor(totalDef * buff.effect.multiplier);
  });
  
  return { 
      totalAtk, 
      totalDef, 
      attackElement, 
      resistances: [...new Set(resistances)],
      equipmentAtk,
      equipmentDef,
      setBonusAtk,
      setBonusDef,
      activeSetBonuses
  };
};


// --- GAME LOGIC ---
const regenerateStats = () => {
  if (state.currentView === 'combat') return;

  const { playerStats } = state;
  const oldHp = playerStats.hp;
  const oldEnergy = playerStats.energy;

  if (playerStats.hp < playerStats.maxHp) {
      playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + Math.ceil(playerStats.maxHp * 0.01));
  }
  if (playerStats.energy < playerStats.maxEnergy) {
      playerStats.energy = Math.min(playerStats.maxEnergy, playerStats.energy + Math.ceil(playerStats.maxEnergy * 0.02));
  }

  // Only re-render if stats actually changed
  if (oldHp !== playerStats.hp || oldEnergy !== playerStats.energy) {
      render();
  }
};

const changeView = (view: string) => {
  state.currentView = view;
  if (view !== 'combat') {
    state.selectedMonster = null;
    state.isAutoBattling = false;
  }
  if (view !== 'upgrade') {
    state.itemToUpgrade = null;
  }
  if (view === 'inventory') {
    state.inventoryView = 'items'; // Reset to items tab when opening inventory
  }
  render();
}

const addExpAndGold = (exp: number, gold: number) => {
  state.playerStats.exp += exp;
  state.playerStats.gold += gold;
  while (state.playerStats.exp >= state.playerStats.expToNextLevel) {
    levelUp();
  }
};

const levelUp = () => {
  const { playerStats } = state;
  playerStats.exp -= playerStats.expToNextLevel;
  playerStats.level++;
  playerStats.expToNextLevel = Math.floor(playerStats.expToNextLevel * 1.5);
  playerStats.maxHp = Math.floor(playerStats.maxHp * 1.1);
  playerStats.maxEnergy = Math.floor(playerStats.maxEnergy * 1.05);
  playerStats.baseAtk += 2;
  playerStats.baseDef += 1;
  playerStats.hp = playerStats.maxHp;
  playerStats.energy = playerStats.maxEnergy;
  showNotification(t('notification_levelup', { level: playerStats.level }));
};

const handleSelectMonster = (monsterIndex: number) => {
  const monster = monsters[monsterIndex];
  if (state.playerStats.level < monster.level - 2) {
      showNotification(t('notification_too_weak'));
      return;
  }
  state.selectedMonster = { ...monster, index: monsterIndex };
  state.monsterHp = monster.hp;
  state.combatLog = [];
  state.isCombatOver = false;
  state.activeBuffs = [];
  state.monsterDebuffs = [];
  state.playerStats.hp = Math.max(1, state.playerStats.hp); // Ensure player isn't defeated before starting
  if(monster.isBoss) {
      state.combatTurn = 0;
      state.showBossIntro = true;
      setTimeout(() => {
          state.showBossIntro = false;
          render();
      }, 2000);
  }
  changeView('combat');
};

const updateBuffs = () => {
  const expiredBuffs: Buff[] = [];
  state.activeBuffs = state.activeBuffs.map(buff => {
      const newDuration = buff.duration - 1;
      if (newDuration <= 0) {
          expiredBuffs.push(buff);
          return null;
      }
      return { ...buff, duration: newDuration };
  }).filter(Boolean) as Buff[];

  if (expiredBuffs.length > 0) {
      const standardLogs = expiredBuffs.map(buff => ({
          content: t('log_buff_expired', { name: buff.name || skillDatabase[buff.id]?.name || t(buff.id) || buff.id }),
          icon: 'ℹ️'
      }));
      logCombat({ standardLogs });
  }
};

const updateDebuffs = () => {
  state.monsterDebuffs = (state.monsterDebuffs || []).map(debuff => {
      const newDuration = debuff.duration - 1;
      if (newDuration <= 0) {
          return null;
      }
      return { ...debuff, duration: newDuration };
  }).filter(Boolean) as Debuff[];
};

const handleAttack = (skill: any = null) => {
  if (state.isCombatOver) return;

  const playerCard = document.getElementById('player-combatant-card');
  const monsterCard = document.getElementById('monster-combatant-card');
  const monsterHpBar = document.getElementById('monster-hp-bar');
  triggerAnimation(playerCard, 'player-attack-animation');

  const totalStats = getTotalStats();
  const monster = state.selectedMonster;
  let standardLogs: {content: string, icon: string}[] = [];
  let aiEvents: AIEvent = { action: skill ? `skill (${skill.name})` : 'basic attack' };
  
  if (skill) aiEvents.skillType = skill.type;

  if (!skill && monster.ai_behavior === 'evasive' && Math.random() < monster.dodgeChance) {
      standardLogs.push({ content: t('log_your_turn'), icon: '🤺' });
      standardLogs.push({ content: `<span class="log-dodge">${t('log_monster_dodged', { name: monster.name })}</span>`, icon: '💨' });
      aiEvents.result = 'monster dodge';
      logCombat({ standardLogs, aiEvents, isPlayerTurn: true });
      setTimeout(processMonsterAttack, 1000);
      return;
  }

  const skillName = skill ? skill.name : null;
  const skillMultiplier = skill && skill.effect ? skill.effect.multiplier || 1 : 1;

  standardLogs.push({ content: skillName ? t('log_skill_turn', {name: skillName}) : t('log_your_turn'), icon: '🤺' });
  
  let isSuperEffective = false;
  let isNotVeryEffective = false;
  let damageMultiplier = skillMultiplier;
  
  if (totalStats.attackElement && monster.weakness === totalStats.attackElement) {
      damageMultiplier *= 1.5;
      isSuperEffective = true;
  } else if (totalStats.attackElement && monster.resistance === totalStats.attackElement) {
      damageMultiplier *= 0.5;
      isNotVeryEffective = true;
  }
  if (totalStats.attackElement) aiEvents.attackElement = totalStats.attackElement;
  if (isSuperEffective) aiEvents.elementalEffect = 'super effective';
  if (isNotVeryEffective) aiEvents.elementalEffect = 'not very effective';


  const baseDamage = Math.max(1, totalStats.totalAtk - monster.def);

  if (isSuperEffective) standardLogs.push({ content: `<span class="log-super-effective">${t('log_super_effective')}</span>`, icon: '💥'});
  if (isNotVeryEffective) standardLogs.push({ content: `<span class="log-not-very-effective">${t('log_not_very_effective')}</span>`, icon: '🛡️'});

  const finalDamage = Math.floor(baseDamage * damageMultiplier);
  state.monsterHp = Math.max(0, state.monsterHp - finalDamage);
  aiEvents.damageDealt = finalDamage;

  if (monsterCard) showDamagePopup(monsterCard, finalDamage);
  triggerAnimation(monsterHpBar, 'hp-pulse-animation');
  
  if(skillName) standardLogs.push({ content: t('log_skill_dealt_damage', {damage: finalDamage}), icon: '⚔️'});
  else standardLogs.push({ content: t('log_you_dealt', {damage: finalDamage}), icon: '⚔️'});
  
  if (skill && skill.effect) {
      if (skill.effect.lifesteal) {
          const healAmount = Math.floor(finalDamage * skill.effect.lifesteal);
          state.playerStats.hp = Math.min(state.playerStats.maxHp, state.playerStats.hp + healAmount);
          standardLogs.push({ content: t('log_skill_lifesteal', {amount: healAmount}), icon: '🩸' });
          aiEvents.lifesteal = healAmount;
      }
      if (skill.effect.debuff) {
          const debuffEffect = skill.effect.debuff;
          const newDebuff = { ...debuffEffect, name: skill.name };
          const existingDebuffIndex = (state.monsterDebuffs || []).findIndex(d => d.stat === debuffEffect.stat);
          if (existingDebuffIndex > -1) {
              state.monsterDebuffs[existingDebuffIndex] = newDebuff;
          } else {
              state.monsterDebuffs.push(newDebuff);
          }
          standardLogs.push({ content: t('log_skill_debuff', { name: monster.name }), icon: '🔽' });
          aiEvents.debuffApplied = `monster ${debuffEffect.stat} reduced`;
      }
  }

  logCombat({ standardLogs, aiEvents, isPlayerTurn: true });

  if (state.monsterHp <= 0) {
      handleVictory();
  } else {
      setTimeout(processMonsterAttack, 1000);
  }
};

const handleUseSkill = (skillId: string) => {
  const skill = skillDatabase[skillId];
  if (state.isCombatOver || state.playerStats.energy < skill.energyCost) return;

  state.playerStats.energy -= skill.energyCost;
  state.showSkillSelection = false;
  let standardLogs: {content: string, icon: string}[] = [];
  let aiEvents: AIEvent = { action: `skill (${skill.name})`, skillType: skill.type };

  switch(skill.type) {
    case 'attack':
    case 'debuff':
    case 'lifesteal':
      handleAttack(skill);
      break;
    case 'heal':
      const healAmount = Math.floor(state.playerStats.maxHp * skill.effect.percentage);
      state.playerStats.hp = Math.min(state.playerStats.maxHp, state.playerStats.hp + healAmount);
      standardLogs.push({ content: t('log_your_turn'), icon: '🤺' });
      standardLogs.push({ content: t('log_skill_heal', {amount: healAmount}), icon: '❤️‍🩹' });
      aiEvents.healed = healAmount;
      logCombat({ standardLogs, aiEvents, isPlayerTurn: true });
      setTimeout(processMonsterAttack, 1000);
      break;
    case 'buff':
      standardLogs.push({ content: t('log_your_turn'), icon: '🤺' });
      standardLogs.push({ content: t('log_skill_buff', {stat: t(`common_${skill.effect.stat.toUpperCase()}`)}), icon: '💪' });
      const existingBuffIndex = state.activeBuffs.findIndex(b => b.id === skillId);
      if (existingBuffIndex > -1) {
        state.activeBuffs[existingBuffIndex].duration = skill.effect.duration;
      } else {
        state.activeBuffs.push({ id: skillId, name: skill.name, duration: skill.effect.duration, effect: skill.effect });
      }
      aiEvents.buffApplied = `player ${skill.effect.stat} increased`;
      logCombat({ standardLogs, aiEvents, isPlayerTurn: true });
      setTimeout(processMonsterAttack, 1000);
      break;
  }
};

const processMonsterAttack = () => {
    if (state.isCombatOver) return;

    updateBuffs();
    updateDebuffs();
    
    const playerCard = document.getElementById('player-combatant-card');
    const monsterCard = document.getElementById('monster-combatant-card');
    const playerHpBar = document.getElementById('player-hp-bar');
    triggerAnimation(monsterCard, 'monster-attack-animation');

    const monster = { ...state.selectedMonster };
    const totalStats = getTotalStats();
    let standardLogs: {content: string, icon: string}[] = [];
    let aiEvents: AIEvent = {};
    
    standardLogs.push({ content: t('log_monster_turn', { name: monster.name }), icon: '👹' });
    
    let monsterAtk = monster.atk;
    (state.monsterDebuffs || []).forEach(debuff => {
        if (debuff.stat === 'atk') monsterAtk = Math.floor(monsterAtk * debuff.multiplier);
    });

    let actionToPerform: any = null;
    let aiHintLog: {content: string, icon: string} | null = null;
    
    if (monster.isBoss) {
        state.combatTurn = (state.combatTurn || 0) + 1;
    }

    if (monster.ai_behavior === 'boss_pattern') {
        const turnMod = state.combatTurn % 3;
        if (turnMod === 2) {
            actionToPerform = monster.abilities.find(a => a.type === 'buff');
        } else if (turnMod === 0) {
            actionToPerform = monster.abilities.find(a => a.type === 'heavy_attack');
        }
    } else {
         switch (monster.ai_behavior) {
            case 'healer':
                if (state.monsterHp < monster.hp * 0.5) {
                    const healAbility = monster.abilities?.find(a => a.type === 'heal');
                    if (healAbility) {
                        actionToPerform = healAbility;
                        aiHintLog = { content: t('log_monster_focus_heal', { name: monster.name }), icon: '🧠' };
                    }
                }
                break;
            case 'debuffer':
                const debuffAbility = monster.abilities?.find(a => a.type === 'debuff');
                if (debuffAbility && Math.random() < 0.5) {
                    actionToPerform = debuffAbility;
                    aiHintLog = { content: t('log_monster_focus_debuff', { name: monster.name }), icon: '🧠' };
                }
                break;
        }

        if (!actionToPerform && monster.abilities) {
            for (const ability of monster.abilities) {
                if (Math.random() < ability.chance) {
                    actionToPerform = ability;
                    break;
                }
            }
        }
    }
    
    if (aiHintLog) {
        standardLogs.push(aiHintLog);
    }
    
    if (actionToPerform) {
        const abilityName = t(actionToPerform.name_key);
        standardLogs.push({ content: `<span class="log-ability">${t('log_monster_uses_ability', { name: monster.name, ability: abilityName })}</span>`, icon: '✨' });
        aiEvents.action = `skill (${abilityName})`;
        aiEvents.skillType = actionToPerform.type;
        
        switch(actionToPerform.type) {
            case 'heavy_attack': {
                let damageMultiplier = actionToPerform.effect.multiplier;
                const hasResistance = monster.element && totalStats.resistances.includes(monster.element);
                if (hasResistance) damageMultiplier *= 0.5;
                const baseDamage = Math.max(1, monsterAtk - totalStats.totalDef);
                if (hasResistance) {
                    standardLogs.push({ content: `<span class="log-resistance">${t('log_elemental_resistance')}</span>`, icon: '🛡️'});
                    aiEvents.elementalEffect = 'resisted';
                }
                const finalDamage = Math.floor(baseDamage * damageMultiplier);
                state.playerStats.hp = Math.max(0, state.playerStats.hp - finalDamage);
                if (playerCard) showDamagePopup(playerCard, finalDamage);
                triggerAnimation(playerHpBar, 'hp-pulse-animation');
                standardLogs.push({ content: t('log_monster_dealt', { name: monster.name, damage: finalDamage }), icon: '⚔️'});
                aiEvents.damageDealt = finalDamage;
                break;
            }
            case 'debuff':
            case 'buff': {
                const effect = actionToPerform.effect;
                const id = actionToPerform.id || `monster_debuff_${effect.stat}`;
                if (actionToPerform.type === 'debuff') {
                    const existingBuffIndex = state.activeBuffs.findIndex(b => b.id === id);
                    if (existingBuffIndex > -1) {
                        state.activeBuffs[existingBuffIndex].duration = effect.duration;
                    } else {
                        state.activeBuffs.push({ id: id, name: t(actionToPerform.name_key), duration: effect.duration, effect: effect });
                    }
                    standardLogs.push({ content: t('log_player_stat_reduced', { stat: t(`common_${effect.stat.toUpperCase()}`) }), icon: '🔽' });
                    aiEvents.debuffApplied = `player ${effect.stat} reduced`;
                } else { // It's a buff on the monster itself
                   const monsterDebuffId = `monster_buff_${effect.stat}`;
                   const buffName = t(actionToPerform.name_key);
                   const newBuff: Debuff = { id: monsterDebuffId, stat: effect.stat, multiplier: effect.multiplier, duration: effect.duration, name: buffName };
                   const existingMonsterBuffIndex = (state.monsterDebuffs || []).findIndex(d => d.id === monsterDebuffId);
                    if (existingMonsterBuffIndex > -1) {
                       state.monsterDebuffs[existingMonsterBuffIndex] = newBuff;
                    } else {
                       state.monsterDebuffs.push(newBuff);
                    }
                    standardLogs.push({ content: `${monster.name}'s ${t(`common_${effect.stat.toUpperCase()}`)} increased!`, icon: '💪' });
                    aiEvents.buffApplied = `monster ${effect.stat} increased`;
                }
                break;
            }
            case 'heal': {
                const healAmount = Math.floor(monster.hp * actionToPerform.effect.percentage);
                state.monsterHp = Math.min(monster.hp, state.monsterHp + healAmount);
                standardLogs.push({ content: t('log_monster_heals', { name: monster.name, amount: healAmount }), icon: '❤️‍🩹' });
                aiEvents.healed = healAmount;
                break;
            }
        }
    } else {
        aiEvents.action = 'basic attack';
        let damageMultiplier = 1;
        const hasResistance = monster.element && totalStats.resistances.includes(monster.element);
        if (hasResistance) damageMultiplier = 0.5;
        const baseDamage = Math.max(1, monsterAtk - totalStats.totalDef);
        if (hasResistance) {
            standardLogs.push({ content: `<span class="log-resistance">${t('log_elemental_resistance')}</span>`, icon: '🛡️'});
            aiEvents.elementalEffect = 'resisted';
        }
        const finalDamage = Math.floor(baseDamage * damageMultiplier);
        state.playerStats.hp = Math.max(0, state.playerStats.hp - finalDamage);
        if (playerCard) showDamagePopup(playerCard, finalDamage);
        triggerAnimation(playerHpBar, 'hp-pulse-animation');
        standardLogs.push({ content: t('log_monster_dealt', { name: monster.name, damage: finalDamage }), icon: '⚔️'});
        aiEvents.damageDealt = finalDamage;
    }
    
    logCombat({ standardLogs, aiEvents, isPlayerTurn: false });
    
    if (state.playerStats.hp <= 0) {
        handleDefeat();
    } else {
        const hpPercentage = (state.playerStats.hp / state.playerStats.maxHp) * 100;
        const settings = state.autoHealSettings;
        if (settings.enabled && hpPercentage < settings.threshold) {
            if (settings.costType === 'gold' && state.playerStats.gold >= 100) {
                state.playerStats.gold -= 100;
                state.playerStats.hp = state.playerStats.maxHp;
                showNotification(t('notification_autoheal_gold', { cost: 100 }));
            } else if (settings.costType === 'energy' && state.playerStats.energy >= 20) {
                state.playerStats.energy -= 20;
                state.playerStats.hp = state.playerStats.maxHp;
                showNotification(t('notification_autoheal_energy', { cost: 20 }));
            }
        }

        if (state.isAutoBattling) {
            setTimeout(handleAttack, 1000);
        }
    }
};

const handleVictory = () => {
    state.isCombatOver = true;
    const monster = state.selectedMonster;
    let standardLogs: { content: string, icon: string }[] = [];

    standardLogs.push({ content: t('log_monster_defeated', { name: monster.name }), icon: '🎉' });
    logCombat({ standardLogs, aiEvents: { result: 'victory', monsterName: monster.name }, isPlayerTurn: true });

    const goldGained = Math.floor(monster.level * 10 * (1 + Math.random()));
    const expGained = Math.floor(monster.level * 15 * (1 + Math.random()));
    addExpAndGold(expGained, goldGained);
    
    let victoryLogs: { content: string, icon: string }[] = [{ content: t('log_gained_gold_exp', { gold: goldGained, exp: expGained }), icon: '💰' }];

    // Loot
    monster.lootTable.items.forEach(loot => {
        const itemData = itemDatabase[loot.id];
        const rarityInfo = rarityData[itemData.rarity || 'common'];
        if (Math.random() < (loot.chance / (monster.isBoss ? 1 : rarityInfo.dropFactor))) {
            const newItem = { ...itemDatabase[loot.id], id: loot.id, instanceId: Date.now() + Math.random(), equipped: false, level: 0, atk: itemDatabase[loot.id].atk, def: itemDatabase[loot.id].def, type: itemDatabase[loot.id].type };
            state.inventory.push(newItem);
            victoryLogs.push({ content: t('log_found_item', { name: newItem.name }), icon: '🎁'});
        }
    });
    monster.lootTable.materials.forEach(loot => {
        if (Math.random() < loot.chance) {
            state.materials[loot.id] = (state.materials[loot.id] || 0) + 1;
            victoryLogs.push({ content: t('log_found_item', { name: materialDatabase[loot.id].name }), icon: '💎' });
        }
    });

    // Quest Progress
    Object.keys(state.questProgress).forEach(questId => {
        const quest = questsData.find(q => q.id === questId);
        const progress = state.questProgress[questId];
        if (quest.type === 'kill' && quest.target === monster.questTargetName && !progress.completed) {
            progress.currentAmount++;
            if (progress.currentAmount >= quest.requiredAmount) {
                victoryLogs.push({ content: t('log_quest_complete', { title: t(quest.title) }), icon: '📜' });
            }
        }
    });
    
    logCombat({ standardLogs: victoryLogs });

    if (state.isAutoBattling && !monster.isBoss) {
        const hpPercentage = (state.playerStats.hp / state.playerStats.maxHp) * 100;
        if (hpPercentage < 40 && !state.autoHealSettings.enabled) {
            state.isAutoBattling = false;
            logCombat({ standardLogs: [{ content: t('log_hp_low_autobattle_off'), icon: 'ℹ️' }] });
        } else {
            logCombat({ standardLogs: [{ content: t('log_next_monster'), icon: '⏳' }] });
            setTimeout(() => {
                const nextMonster = { ...monster };
                state.selectedMonster = nextMonster;
                state.monsterHp = nextMonster.hp;
                state.combatLog = [];
                state.isCombatOver = false;
                logCombat({ standardLogs: [{ content: t('log_new_monster', { name: nextMonster.name }), icon: '👹' }] });
                setTimeout(handleAttack, 1000);
            }, 1500);
        }
    } else {
        state.isAutoBattling = false;
    }
    saveGame();
};

const handleDefeat = () => {
  state.isCombatOver = true;
  state.isAutoBattling = false;
  logCombat({
      standardLogs: [{ content: t('log_you_were_defeated'), icon: '💀' }],
      aiEvents: { result: 'defeat' },
      isPlayerTurn: true
  });
};

const handleFlee = () => {
  state.isAutoBattling = false;
  showNotification(t('notification_fled'));
  changeView('hunt');
};

const equipItem = (itemInstanceId: number) => {
  const itemToEquip = state.inventory.find(i => i.instanceId === itemInstanceId);
  if (!itemToEquip) return;

  if (state.playerStats.level < itemDatabase[itemToEquip.id].minLevel) {
      showNotification(t('notification_equip_level'));
      return;
  }

  state.inventory.forEach(item => {
      if (item.type === itemToEquip.type && item.equipped) {
          item.equipped = false;
      }
  });
  itemToEquip.equipped = true;
  showNotification(t('notification_equipped', { name: itemToEquip.name }));
  render();
};

const unequipItem = (itemInstanceId: number) => {
    const itemToUnequip = state.inventory.find(i => i.instanceId === itemInstanceId);
    if (itemToUnequip) {
        itemToUnequip.equipped = false;
        showNotification(t('notification_unequipped', { name: itemToUnequip.name }));
        render();
    }
};

const sellItem = (itemInstanceId: number) => {
    const itemIndex = state.inventory.findIndex(i => i.instanceId === itemInstanceId);
    if (itemIndex > -1) {
        const item = state.inventory[itemIndex];
        const itemData = itemDatabase[item.id];
        const fullPrice = getItemPrice(itemData);
        const sellPrice = Math.floor(fullPrice / 2) + item.level * 10;
        state.playerStats.gold += sellPrice;
        state.inventory.splice(itemIndex, 1);
        showNotification(t('notification_sold', { name: item.name, price: sellPrice }));
        render();
    }
};

const buyItem = (itemId: string) => {
    const itemData = itemDatabase[itemId];
    const price = getItemPrice(itemData);
    if (state.playerStats.gold >= price) {
        state.playerStats.gold -= price;
        const newItem: ItemInstance = { ...itemData, id: itemId, instanceId: Date.now() + Math.random(), equipped: false, level: 0, atk: itemData.atk, def: itemData.def };
        state.inventory.push(newItem);
        showNotification(t('notification_bought', { name: newItem.name }));
        state.itemToBuy = null;
        saveGame();
        render();
    } else {
        showNotification(t('notification_no_gold'));
    }
};

const learnSkill = (skillId: string) => {
  const skill = skillDatabase[skillId];
  if (state.playerStats.learnedSkills.includes(skillId)) {
    showNotification(t('notification_skill_already_known')); return;
  }
  if (state.playerStats.level < skill.minLevel) {
    showNotification(t('notification_skill_no_level')); return;
  }
  if (state.playerStats.gold < skill.learnCost) {
    showNotification(t('notification_no_gold')); return;
  }

  state.playerStats.gold -= skill.learnCost;
  state.playerStats.learnedSkills.push(skillId);
  showNotification(t('notification_skill_learned', { name: skill.name }));
  saveGame();
  render();
};

const claimQuestReward = (questId: string) => {
  const quest = questsData.find(q => q.id === questId);
  const progress = state.questProgress[questId];
  if (quest && progress.currentAmount >= quest.requiredAmount && !progress.completed) {
      progress.completed = true;
      state.playerStats.gold += quest.reward.gold;
      addExpAndGold(quest.reward.exp, 0); // addExpAndGold handles exp and leveling
      // FIX: Removed invalid third argument from t() function call.
      showNotification(t('notification_quest_reward', { title: t(quest.title) }));
      saveGame();
      render();
  }
};

const upgradeItem = (itemInstanceId: number) => {
  const item = state.inventory.find(i => i.instanceId === itemInstanceId);
  if (!item) return;

  if (item.level >= 10) {
      showNotification(t('notification_upgrade_max'));
      return;
  }

  const upgradeCost = (item.level + 1) * 100;
  const materialId = `m${Math.min(6, Math.floor(item.level / 2) + 1)}`;
  const materialCost = item.level + 1;

  if (state.playerStats.gold < upgradeCost || (state.materials[materialId] || 0) < materialCost) {
      showNotification(t('notification_no_resources'));
      return;
  }

  state.playerStats.gold -= upgradeCost;
  state.materials[materialId] -= materialCost;

  item.level++;
  const baseItem = itemDatabase[item.id];
  if (baseItem.atk > 0) item.atk = baseItem.atk + Math.floor(baseItem.atk * 0.1 * item.level);
  if (baseItem.def > 0) item.def = baseItem.def + Math.floor(baseItem.def * 0.1 * item.level);
  
  showNotification(t('notification_upgrade_success', { level: item.level }));
  
  saveGame();
  render();
};


// --- EVENT HANDLER ---
app.addEventListener('click', e => {
  // FIX: Cast e.target to HTMLElement to access DOM methods like closest.
  const target = (e.target as HTMLElement).closest('[data-action]');
  if (!target) {
      // Handle checkbox clicks for the toggle switch
      // FIX: Cast e.target to HTMLElement to access DOM methods like matches.
      if ((e.target as HTMLElement).matches('input[type="checkbox"][data-action="toggle-ai-storyteller"]')) {
          state.aiStoryteller = !state.aiStoryteller;
          render();
      }
      return;
  }
  
  const { action, value, value2 } = (target as HTMLElement).dataset;

  switch (action) {
      case 'change-view': changeView(value); break;
      case 'select-monster': handleSelectMonster(parseInt(value)); break;
      case 'attack': handleAttack(); break;
      case 'toggle-auto-battle': state.isAutoBattling = !state.isAutoBattling; if(state.isAutoBattling) { handleAttack(); } render(); break;
      case 'flee': handleFlee(); break;
      case 'return-to-hunt': changeView('hunt'); break;
      case 'toggle-skills': state.showSkillSelection = !state.showSkillSelection; render(); break;
      case 'use-skill': handleUseSkill(value); break;
      case 'equip-item': equipItem(parseFloat(value)); break;
      case 'unequip-item': unequipItem(parseFloat(value)); break;
      case 'sell-item': state.itemToSell = state.inventory.find(i => i.instanceId === parseFloat(value)); render(); break;
      case 'confirm-sell': {
          if (state.itemToSell) {
            const itemToSellInstanceId = state.itemToSell.instanceId;
            state.itemToSell = null;
            sellItem(itemToSellInstanceId);
          }
          break;
      }
      case 'cancel-sell': state.itemToSell = null; render(); break;
      case 'confirm-buy': state.itemToBuy = value; render(); break;
      case 'cancel-buy': state.itemToBuy = null; render(); break;
      case 'buy-item': buyItem(value); break;
      case 'select-upgrade-item': state.itemToUpgrade = state.inventory.find(i => i.instanceId === parseFloat(value)) || null; render(); break;
      case 'upgrade-item': upgradeItem(parseFloat(value)); break;
      case 'learn-skill': learnSkill(value); break;
      case 'claim-quest': claimQuestReward(value); break;
      case 'set-language': state.language = value as 'pt' | 'es' | 'en'; saveGame(); render(); break;
      case 'toggle-sound': state.soundOn = !state.soundOn; render(); break;
      case 'toggle-autoheal': state.autoHealSettings.enabled = !state.autoHealSettings.enabled; render(); break;
      case 'set-autoheal-resource': state.autoHealSettings.costType = value as 'gold' | 'energy'; render(); break;
      case 'set-inventory-view': state.inventoryView = value as 'items' | 'materials'; render(); break;
      case 'set-shop-filter': state.shopFilter = value; render(); break;
      case 'toggle-ai-storyteller': state.aiStoryteller = !state.aiStoryteller; render(); break;
  }
});

// --- RENDER FUNCTIONS ---
const render = () => {
  const { currentView } = state;
  const totalStats = getTotalStats();

  let mainContent = '';
  switch(currentView) {
      case 'menu': mainContent = renderMenu(); break;
      case 'hunt': mainContent = renderHunt(); break;
      case 'combat': mainContent = renderCombat(); break;
      case 'inventory': mainContent = renderInventory(); break;
      case 'player_stats': mainContent = renderPlayerStats(); break;
      case 'shop': mainContent = renderShop(); break;
      case 'upgrade': mainContent = renderUpgrade(); break;
      case 'skills': mainContent = renderSkills(); break;
      case 'quests': mainContent = renderQuests(); break;
      case 'settings': mainContent = renderSettings(); break;
  }
  
  let statsHtml = (currentView !== 'combat' && currentView !== 'menu') ? renderStats(totalStats) : '';
  let modalHtml = state.itemToBuy ? renderBuyModal() : '';
  modalHtml += state.itemToSell ? renderSellModal() : '';
  let notificationHtml = state.notification ? `<div class="notification">${state.notification}</div>` : '';
  
  app.innerHTML = `
      ${currentView === 'menu' ? `<h1 class="header">${t('header_title')}</h1>` : ''}
      ${currentView === 'menu' ? renderStats(totalStats) : ''}
      ${statsHtml}
      ${mainContent}
      ${notificationHtml}
      ${modalHtml}
  `;

  // Manually scroll combat log
  if (currentView === 'combat') {
    const logContainer = document.querySelector('.combat-log-container');
    if (logContainer) logContainer.scrollTop = 0; // because of flex-direction: column-reverse
  }
};

const renderStats = (totalStats: { totalAtk: number; totalDef: number; }) => {
  const { playerStats } = state;
  const progressBar = (value: number, max: number, color: string, label: string) => `
      <div>
          <div class="stat-item" style="font-size: 0.9rem; margin-bottom: 5px;">
              <span>${label}</span>
              <span>${formatNumber(value)} / ${formatNumber(max)}</span>
          </div>
          <div class="hp-bar-container" style="height: 20px;">
              <div class="hp-bar" style="background-color: ${color}; width: ${Math.min(100, (value / max) * 100)}%;"></div>
          </div>
      </div>`;

  return `
      <div class="stats-container">
          <div class="stat-item">
              <span>${t('common_level')}: ${playerStats.level}</span>
              <span>${t('common_gold')}: ${formatNumber(playerStats.gold)}</span>
          </div>
          ${progressBar(playerStats.hp, playerStats.maxHp, '#cc0505', t('common_hp'))}
          ${progressBar(playerStats.exp, playerStats.expToNextLevel, '#84d2a9', t('common_exp'))}
          ${progressBar(playerStats.energy, playerStats.maxEnergy, '#e19e4c', t('common_energy'))}
          <div class="stat-item" style="margin-top: 10px;">
              <span>${t('common_atk')}: ${totalStats.totalAtk}</span>
              <span>${t('common_def')}: ${totalStats.totalDef}</span>
          </div>
      </div>
  `;
};

const renderMenu = () => {
  return `
      <div class="nav-container">
          <button class="button" data-action="change-view" data-value="hunt">${t('menu_hunt')}</button>
          <button class="button" data-action="change-view" data-value="inventory">${t('menu_inventory')}</button>
          <button class="button" data-action="change-view" data-value="player_stats">${t('menu_status')}</button>
          <button class="button" data-action="change-view" data-value="shop">${t('menu_shop')}</button>
          <button class="button" data-action="change-view" data-value="upgrade">${t('menu_upgrade')}</button>
          <button class="button" data-action="change-view" data-value="skills">${t('menu_skills')}</button>
          <button class="button" data-action="change-view" data-value="quests">${t('menu_quests')}</button>
          <button class="button" data-action="change-view" data-value="settings">${t('menu_settings')}</button>
      </div>
  `;
};

const renderHunt = () => {
  const regularMonsters = monsters.filter(m => !m.isBoss);
  const bossMonsters = monsters.filter(m => m.isBoss).sort((a,b) => a.level - b.level);

  const renderMonsterCard = (monster: any, index: number) => `
      <div class="monster-card" data-action="select-monster" data-value="${index}">
          <div class="monster-header">
              <span class="monster-name">${monster.name}</span>
              <span>${t('common_level')}: ${monster.level}</span>
          </div>
          <div class="monster-stats-container">
              <div class="monster-stat"><span>❤️ ${t('common_hp')}:</span> <span>${monster.hp}</span></div>
              <div class="monster-stat"><span>⚔️ ${t('common_atk')}:</span> <span>${monster.atk}</span></div>
              <div class="monster-stat"><span>🛡️ ${t('common_def')}:</span> <span>${monster.def}</span></div>
              ${monster.element ? `<div class="monster-stat"><span>${t('common_element')}:</span> <span class="elemental-attack">${monster.element}</span></div>` : ''}
              ${monster.weakness ? `<div class="monster-stat"><span>${t('hunt_weakness')}:</span> <span class="elemental-weakness">${monster.weakness}</span></div>` : ''}
              ${monster.resistance ? `<div class="monster-stat"><span>${t('common_resistance')}:</span> <span class="elemental-resistance">${monster.resistance}</span></div>` : ''}
          </div>
      </div>`;
  
  const renderBossCard = (monster: any, index: number) => {
      const unlockQuest = questsData.find(q => q.id === monster.unlockQuestId);
      const isBossUnlocked = unlockQuest && state.questProgress[unlockQuest.id]?.completed;
      const lockedClass = isBossUnlocked ? '' : 'locked';
      const action = isBossUnlocked ? `data-action="select-monster" data-value="${index}"` : '';
      // FIX: Removed invalid third argument from t() function call.
      const lockedText = unlockQuest ? t('hunt_boss_locked', { quest_title: t(unlockQuest.title) }) : '';

      return `
      <div class="monster-card boss-card ${lockedClass}" ${action}>
          <div class="monster-header">
              <span class="monster-name">${monster.name}</span>
              <span>${t('common_level')}: ${monster.level}</span>
          </div>
          ${monster.race_key ? `<p class="monster-race">${t(monster.race_key)}</p>` : ''}
          <div class="monster-stats-container">
              <div class="monster-stat"><span>❤️ ${t('common_hp')}:</span> <span>${formatNumber(monster.hp)}</span></div>
              <div class="monster-stat"><span>⚔️ ${t('common_atk')}:</span> <span>${formatNumber(monster.atk)}</span></div>
              <div class="monster-stat"><span>🛡️ ${t('common_def')}:</span> <span>${formatNumber(monster.def)}</span></div>
          </div>
          ${!isBossUnlocked ? `<p class="locked-text">${lockedText}</p>` : ''}
      </div>
      `
  };

  const regularMonsterCards = regularMonsters.map((m, i) => renderMonsterCard(m, monsters.indexOf(m))).join('');
  const bossMonsterCards = bossMonsters.map((m, i) => renderBossCard(m, monsters.indexOf(m))).join('');


  return `
      <h2>${t('hunt_title')}</h2>
      <div class="nav-container">
          <div class="scrollable-list">
              ${regularMonsterCards}
              ${bossMonsterCards}
          </div>
          <button class="button back-button" data-action="change-view" data-value="menu">${t('common_back')}</button>
      </div>
  `;
};

const renderCombat = () => {
  const { playerStats, selectedMonster, monsterHp, combatLog, isCombatOver, isAutoBattling, showSkillSelection, activeBuffs, monsterDebuffs, showBossIntro } = state;
  const playerHpPercent = (playerStats.hp / playerStats.maxHp) * 100;
  const monsterHpPercent = (monsterHp / selectedMonster.hp) * 100;
  const isBossFight = selectedMonster.isBoss;
  
  const logEntries = combatLog.map(entry => {
      const iconHtml = entry.icon ? `<span class="log-icon">${entry.icon}</span>` : `<span class="log-icon"></span>`; // Add empty span to keep alignment
      
      if (entry.type === 'ai') {
          if (entry.content === 'thinking') {
              return `<p class="log-entry log-entry-thinking"><span class="log-icon">⏳</span>The storyteller observes the battlefield...</p>`;
          }
          return `<div class="log-entry log-entry-ai"><span class="log-icon">📜</span><div>${entry.content}</div></div>`;
      }
      return `<p class="log-entry">${iconHtml}<div>${entry.content}</div></p>`;
  }).join('');

  const buffIcons = activeBuffs.map(buff => {
      const buffName = buff.name || skillDatabase[buff.id]?.name || buff.id;
      const buffColor = buff.effect.multiplier > 1 ? '#e19e4c' : '#cc0505'; // Gold for buff, Red for debuff
      return `<div class="buff-icon" style="background-color: ${buffColor};" title="${buffName}">${buff.duration}</div>`
  }).join('');
  const debuffIcons = (monsterDebuffs || []).map(debuff => `<div class="buff-icon" style="background-color: #cc0505;" title="${debuff.stat.toUpperCase()} Down">${debuff.duration}</div>`).join('');
  
  let skillSelectionModal = '';
  if (showSkillSelection) {
      const learnedSkills = playerStats.learnedSkills.map(id => skillDatabase[id]);
      const skillButtons = learnedSkills.length > 0 ? learnedSkills.map(skill => `
          <button class="button" data-action="use-skill" data-value="${skill.id}" ${playerStats.energy < skill.energyCost ? 'disabled' : ''}>
              ${skill.name} (${skill.energyCost} ${t('common_energy')})
          </button>
      `).join('') : `<p>${t('combat_no_skills')}</p>`;

      skillSelectionModal = `
          <div class="modal-backdrop" data-action="toggle-skills">
              <div class="modal-content" onclick="event.stopPropagation();">
                  <h2>${t('combat_choose_skill')}</h2>
                  <div class="button-group" style="flex-direction: column;">
                     ${skillButtons}
                  </div>
                   <button class="button back-button" data-action="toggle-skills" style="margin-top: 20px;">${t('combat_close')}</button>
              </div>
          </div>
      `;
  }

  return `
      <div class="combat-container ${isBossFight ? 'boss-encounter' : ''}">
          ${showBossIntro ? `<div class="boss-intro-text">${t('combat_boss_encounter')}</div>` : ''}
          <div class="combatants-container">
              <div class="combatant-card" id="player-combatant-card">
                  <div class="buff-container">${buffIcons}</div>
                  <h3 class="combatant-name">${t('combat_you')}</h3>
                  <div class="hp-bar-container">
                      <div id="player-hp-bar" class="hp-bar" style="width: ${playerHpPercent}%;"></div>
                  </div>
                  <p class="hp-text">${playerStats.hp} / ${playerStats.maxHp}</p>
              </div>
              <div class="combatant-card" id="monster-combatant-card">
                  <div class="buff-container">${debuffIcons}</div>
                  <h3 class="combatant-name">${selectedMonster.name}</h3>
                  <div class="hp-bar-container">
                      <div id="monster-hp-bar" class="hp-bar" style="width: ${monsterHpPercent}%;"></div>
                  </div>
                  <p class="hp-text">${monsterHp} / ${selectedMonster.hp}</p>
              </div>
          </div>
          <div class="ai-toggle-container">
              <span>📜 ${t('story_mode_title')}</span>
              <label class="switch">
                  <input type="checkbox" data-action="toggle-ai-storyteller" ${state.aiStoryteller ? 'checked' : ''}>
                  <span class="slider"></span>
              </label>
          </div>
          <div class="combat-log-container">${logEntries}</div>
          ${!isCombatOver ? `
              <div class="combat-actions">
                  <button class="button" data-action="attack" ${isAutoBattling ? 'disabled' : ''}>${t('combat_attack')}</button>
                  <button class="button" data-action="toggle-skills" ${isAutoBattling ? 'disabled' : ''}>${t('combat_skills')}</button>
                  <button class="button" data-action="toggle-auto-battle" style="background-color: ${isAutoBattling ? '#869e9d' : '#4e5f3f'}" ${isBossFight ? 'disabled' : ''}>
                      ${isAutoBattling ? t('combat_cancel_auto') : t('combat_auto_battle')}
                  </button>
                  <button class="button back-button" data-action="flee" ${isAutoBattling ? 'disabled' : ''}>${t('combat_flee')}</button>
              </div>
          ` : `
              <div class="combat-actions">
                  <button class="button" data-action="return-to-hunt">${t('combat_return_to_hunt')}</button>
              </div>
          `}
      </div>
      ${skillSelectionModal}
  `;
};

const renderTooltip = (item: ItemInstance, itemData: any) => {
  const rarityInfo = rarityData[itemData.rarity || 'common'];
  const upgradeText = (val: number) => val > 0 ? `<span class="upgrade-bonus"> (+${val})</span>` : '';
  const atkBonus = item.atk - itemData.atk;
  const defBonus = item.def - itemData.def;
  
  return `
      <div class="tooltip">
          <h3 style="color: ${rarityInfo.color};">${itemTypeIcons[itemData.type] || ''} ${item.name} ${item.level > 0 ? `+${item.level}`: ''}</h3>
          <p><strong>${t('common_type')}:</strong> ${t(`inventory_slot_${itemData.type}`)}</p>
          <p style="color: ${rarityInfo.color};"><strong>${t(`rarity_${rarityInfo.key}`)}</strong></p>
          ${itemData.set ? `<p><strong>${t('common_set')}:</strong> ${t(`set_name_${itemData.set}`)}</p>` : ''}
          <hr style="border-color: #97714d; border-style: solid; margin: 5px 0; border-width: 0.5px;">
          <p><strong>${t('common_atk')}:</strong> ${item.atk}${upgradeText(atkBonus)}</p>
          <p><strong>${t('common_def')}:</strong> ${item.def}${upgradeText(defBonus)}</p>
          <p><strong>${t('common_min_level')}:</strong> ${itemData.minLevel}</p>
          ${itemData.element ? `<p><strong>${t('common_element')}:</strong> <span class="elemental-attack">${itemData.element}</span></p>` : ''}
          ${itemData.resistance ? `<p><strong>${t('common_resistance')}:</strong> <span class="elemental-resistance">${itemData.resistance.join(', ')}</span></p>` : ''}
          <p style="margin-top: 10px; font-style: italic; color: #ccc;">${t(itemData.description_key)}</p>
      </div>
  `;
};

const renderInventory = () => {
  const { inventory, materials, inventoryView } = state;
  const equipment = getEquipment();

  const renderItemCard = (item: ItemInstance) => {
      const itemData = itemDatabase[item.id];
      const rarityInfo = rarityData[itemData.rarity || 'common'];
      
      let gemsHtml = '';
      const gemCount = rarityGems[rarityInfo.key] || 0;
      for (let i = 0; i < gemCount; i++) {
          gemsHtml += `<div class="rarity-gem" style="background-color: ${rarityInfo.color};"></div>`;
      }

      return `
          <div class="tooltip-container item-card-wrapper">
              <div class="item-card" style="border-left: 5px solid ${rarityInfo.color}; margin-bottom: 0;">
                  ${item.equipped ? `<div class="equipped-icon" title="${t('inventory_status_equipped')}">✓</div>` : ''}
                  <div class="rarity-indicator">${gemsHtml}</div>
                  <div class="item-card-header">
                      <span class="item-icon">${itemTypeIcons[item.type] || '❓'}</span>
                      <div>
                          <p style="font-weight: 700; color: ${rarityInfo.color};">${item.name} ${item.level > 0 ? `+${item.level}`: ''}</p>
                          <p style="font-size: 0.8rem; color: ${rarityInfo.color}; margin-bottom: 5px;">${t(`rarity_${rarityInfo.key}`)}</p>
                      </div>
                  </div>
                  <p style="font-size: 0.9rem;">
                      ${t('common_atk')}: ${item.atk} | ${t('common_def')}: ${item.def}
                  </p>
                  <p style="font-size: 0.8rem; color: #6b6b65;">${t('common_type')}: ${t(`inventory_slot_${item.type}`)} | ${t('common_min_level')}: ${itemData.minLevel}${itemData.set ? ` | ${t('common_set')}: ${t(`set_name_${itemData.set}`)}` : ''}</p>
                  <div class="button-group">
                      ${item.equipped ? 
                          `<button class="button" style="background-color:#4e5f3f;" data-action="unequip-item" data-value="${item.instanceId}">${t('inventory_unequip')}</button>` :
                          `<button class="button" data-action="equip-item" data-value="${item.instanceId}">${t('inventory_equip')}</button>`
                      }
                      <button class="button back-button" data-action="sell-item" data-value="${item.instanceId}">${t('inventory_sell')}</button>
                  </div>
              </div>
              ${renderTooltip(item, itemData)}
          </div>
      `;
  };
  
  const renderEquipmentSlot = (type: string) => {
    const item = equipment[type];
    const rarityInfo = item ? rarityData[itemDatabase[item.id].rarity || 'common'] : null;
    const slotStyle = item 
      ? `border: 2px solid ${rarityInfo.color};` 
      : 'border: 2px dashed #d3d3d3;';
      
    return `
      <div class="equipment-slot" style="${slotStyle}">
        <p style="font-weight: 700; font-size: 0.9rem; margin-bottom: 5px;">${t(`inventory_slot_${type}`)}</p>
        ${item ? `
          <span class="item-icon">${itemTypeIcons[item.type] || '❓'}</span>
          <p style="color: ${rarityInfo.color}; font-weight: 700; font-size: 0.9rem;">${item.name} ${item.level > 0 ? `+${item.level}` : ''}</p>
          <p style="font-size: 0.8rem;">${t('common_atk')}: ${item.atk} | ${t('common_def')}: ${item.def}</p>
        ` : `
          <p style="color: #6b6b65; font-style: italic;">${t('common_empty')}</p>
        `}
      </div>
    `;
  };

  const tabButtons = `
      <div class="tab-container">
          <button class="tab-button ${inventoryView === 'items' ? 'active' : ''}" data-action="set-inventory-view" data-value="items">${t('inventory_items')}</button>
          <button class="tab-button ${inventoryView === 'materials' ? 'active' : ''}" data-action="set-inventory-view" data-value="materials">${t('inventory_materials')}</button>
      </div>
  `;

  let contentHtml = '';
  if (inventoryView === 'items') {
      const itemsHtml = inventory.length > 0 ? inventory.map(item => `<div class="item-card-wrapper">${renderItemCard(item)}</div>`).join('') : `<p>${t('inventory_no_items')}</p>`;
      contentHtml = `
          <h3>${t('inventory_equipment')}</h3>
          <div class="equipment-grid">
              ${renderEquipmentSlot('weapon')}
              ${renderEquipmentSlot('shield')}
              ${renderEquipmentSlot('helmet')}
              ${renderEquipmentSlot('armor')}
              ${renderEquipmentSlot('gloves')}
              ${renderEquipmentSlot('boots')}
          </div>
          <h3>${t('inventory_items')}</h3>
          ${itemsHtml}
      `;
  } else { // 'materials' view
      const materialsHtml = Object.keys(materials).length > 0 ?
          Object.entries(materials).map(([id, count]) => `
              <div class="item-card">
                  <p style="font-weight: 700;">${materialDatabase[id].name}</p>
                  <p style="font-size: 1.2rem; text-align: right;">x ${count}</p>
              </div>
          `).join('') :
          `<p style="text-align:center; margin-top: 20px;">${t('inventory_no_materials')}</p>`;
      contentHtml = `
          <h3>${t('inventory_materials')}</h3>
          ${materialsHtml}
      `;
  }

  return `
      <h2>${t('inventory_title')}</h2>
      <div style="width: 90%; max-width: 700px;">
          ${tabButtons}
          ${contentHtml}
          <button class="button back-button" data-action="change-view" data-value="menu" style="margin-top: 20px;">${t('common_back')}</button>
      </div>
  `;
};

const renderPlayerStats = () => {
  const { playerStats, activeBuffs } = state;
  const { 
    totalAtk, totalDef, attackElement, resistances, 
    equipmentAtk, equipmentDef, setBonusAtk, setBonusDef, activeSetBonuses 
  } = getTotalStats();

  const activeEffectsHtml = activeBuffs.length > 0 ? activeBuffs.map(buff => {
      const buffName = buff.name || skillDatabase[buff.id]?.name || buff.id;
      const isBuff = buff.effect.multiplier > 1;
      const effectText = isBuff 
          ? `${t(`common_${buff.effect.stat.toUpperCase()}`)} +${Math.round((buff.effect.multiplier - 1) * 100)}%`
          : `${t(`common_${buff.effect.stat.toUpperCase()}`)} -${Math.round((1 - buff.effect.multiplier) * 100)}%`;
      return `
          <div class="effect-list-item">
              <span>${buffName} (${effectText})</span>
              <span style="float: right;">${buff.duration} turn(s) left</span>
          </div>
      `;
  }).join('') : `<p style="text-align: center; padding: 10px;">${t('status_no_effects')}</p>`;

  const activeSetsHtml = activeSetBonuses.length > 0 ? activeSetBonuses.map(bonus => `
    <div class="effect-list-item">
        <span><strong>${bonus.setName} (${bonus.pieces})</strong>: ${bonus.description}</span>
    </div>
  `).join('') : `<p style="text-align: center; padding: 10px;">${t('status_no_effects')}</p>`;

  return `
      <h2>${t('status_title')}</h2>
      <div class="stats-breakdown-container">
          <div class="stats-section">
              <h3>${t('status_primary_stats')}</h3>
              <div class="stat-breakdown-row"><span>${t('common_level')}</span> <span>${playerStats.level}</span></div>
              <div class="stat-breakdown-row"><span>${t('common_hp')}</span> <span>${playerStats.hp} / ${playerStats.maxHp}</span></div>
              <div class="stat-breakdown-row"><span>${t('common_energy')}</span> <span>${playerStats.energy} / ${playerStats.maxEnergy}</span></div>
              <div class="stat-breakdown-row"><span>${t('common_exp')}</span> <span>${playerStats.exp} / ${playerStats.expToNextLevel}</span></div>
              <div class="stat-breakdown-row"><span>${t('common_gold')}</span> <span>${playerStats.gold}</span></div>
          </div>

          <div class="stats-section">
              <h3>${t('status_combat_stats')}</h3>
              <strong>${t('common_atk')}</strong>
              <div class="stat-breakdown-row"><span>${t('status_base')}</span> <span>${playerStats.baseAtk}</span></div>
              <div class="stat-breakdown-row"><span>${t('status_equipment')}</span> <span>+ ${equipmentAtk}</span></div>
              <div class="stat-breakdown-row"><span>${t('status_set_bonuses')}</span> <span>+ ${setBonusAtk}</span></div>
              <div class="stat-breakdown-row total"><span>${t('status_total')}</span> <span>${totalAtk}</span></div>
              <br>
              <strong>${t('common_def')}</strong>
              <div class="stat-breakdown-row"><span>${t('status_base')}</span> <span>${playerStats.baseDef}</span></div>
              <div class="stat-breakdown-row"><span>${t('status_equipment')}</span> <span>+ ${equipmentDef}</span></div>
              <div class="stat-breakdown-row"><span>${t('status_set_bonuses')}</span> <span>+ ${setBonusDef}</span></div>
              <div class="stat-breakdown-row total"><span>${t('status_total')}</span> <span>${totalDef}</span></div>
          </div>
          
          <div class="stats-section">
              <h3>${t('status_elemental_properties')}</h3>
              <div class="stat-breakdown-row">
                <span>${t('status_attack_element')}</span> 
                <span>${attackElement ? `<span class="elemental-attack">${attackElement}</span>` : t('status_none')}</span>
              </div>
               <div class="stat-breakdown-row">
                <span>${t('status_resistances')}</span>
                  <ul class="resistance-list">
                  ${resistances.length > 0 
                      ? resistances.map(r => `<li><span class="elemental-resistance">${r}</span></li>`).join('')
                      : `<li>${t('status_none')}</li>`
                  }
                  </ul>
              </div>
          </div>

          <div class="stats-section">
              <h3>${t('status_set_bonuses')}</h3>
              ${activeSetsHtml}
          </div>

          <div class="stats-section">
              <h3>${t('status_active_effects')}</h3>
              ${activeEffectsHtml}
          </div>

          <button class="button back-button" data-action="change-view" data-value="menu" style="margin-top: 10px;">${t('common_back')}</button>
      </div>
  `;
};

const renderShop = () => {
    const { shopFilter, shopSort } = state;
    
    // 1. Filter
    let filteredItems = shopInventory;
    if (shopFilter !== 'all') {
        filteredItems = shopInventory.filter(itemId => itemDatabase[itemId].type === shopFilter);
    }
    
    // 2. Sort
    let sortedAndFilteredItems = [...filteredItems]; // Create a copy to sort
    switch (shopSort) {
        case 'price_asc':
            sortedAndFilteredItems.sort((a, b) => getItemPrice(itemDatabase[a]) - getItemPrice(itemDatabase[b]));
            break;
        case 'price_desc':
            sortedAndFilteredItems.sort((a, b) => getItemPrice(itemDatabase[b]) - getItemPrice(itemDatabase[a]));
            break;
        case 'level_asc':
            sortedAndFilteredItems.sort((a, b) => itemDatabase[a].minLevel - itemDatabase[b].minLevel);
            break;
        case 'level_desc':
            sortedAndFilteredItems.sort((a, b) => itemDatabase[b].minLevel - itemDatabase[a].minLevel);
            break;
    }

    // 3. Render cards from the processed list
    const itemCards = sortedAndFilteredItems.map(itemId => {
        const itemData = itemDatabase[itemId];
        const itemForTooltip: ItemInstance = { ...itemData, id: itemId, level: 0, atk: itemData.atk, def: itemData.def, instanceId: 0, equipped: false, name: itemData.name, type: itemData.type };
        const rarityInfo = rarityData[itemData.rarity || 'common'];
        const price = getItemPrice(itemData);

        let gemsHtml = '';
        const gemCount = rarityGems[rarityInfo.key] || 0;
        for (let i = 0; i < gemCount; i++) {
            gemsHtml += `<div class="rarity-gem" style="background-color: ${rarityInfo.color};"></div>`;
        }
        
        return `
          <div class="tooltip-container item-card-wrapper">
              <div class="item-card" style="border-left: 5px solid ${rarityInfo.color}; margin-bottom: 0;">
                <div class="rarity-indicator">${gemsHtml}</div>
                <div class="item-card-header">
                      <span class="item-icon">${itemTypeIcons[itemData.type] || '❓'}</span>
                      <div>
                         <p style="font-weight: 700; color: ${rarityInfo.color};">${itemData.name}</p>
                         <p style="font-size: 0.8rem; color: ${rarityInfo.color}; margin-bottom: 5px;">${t(`rarity_${rarityInfo.key}`)}</p>
                      </div>
                </div>
                <p style="font-size: 0.9rem;">${t('common_atk')}: ${itemData.atk} | ${t('common_def')}: ${itemData.def}</p>
                <p style="font-size: 0.8rem; color: #6b6b65;">${t('common_min_level')}: ${itemData.minLevel} | ${t('common_price')}: ${price}${itemData.set ? ` | ${t('common_set')}: ${t(`set_name_${itemData.set}`)}` : ''}</p>
                <div class="button-group">
                    <button class="button" data-action="confirm-buy" data-value="${itemId}">${t('shop_buy_confirm', {name:''}).replace('?', '')}</button>
                </div>
              </div>
              ${renderTooltip(itemForTooltip, itemData)}
          </div>
        `;
    }).join('');
    
    // 4. Render filter and sort controls
    const filterButtons = ['all', 'weapon', 'shield', 'helmet', 'armor', 'gloves', 'boots'].map(type => `
      <button class="shop-filter-button ${shopFilter === type ? 'active' : ''}" data-action="set-shop-filter" data-value="${type}">
        ${type === 'all' ? t('shop_filter_all') : itemTypeIcons[type]}
      </button>
    `).join('');

    const sortOptions = [
        { value: 'default', label: t('shop_sort_default') },
        { value: 'price_asc', label: t('shop_sort_price_asc') },
        { value: 'price_desc', label: t('shop_sort_price_desc') },
        { value: 'level_asc', label: t('shop_sort_level_asc') },
        { value: 'level_desc', label: t('shop_sort_level_desc') },
    ].map(opt => `<option value="${opt.value}" ${shopSort === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('');

    return `
        <h2>${t('shop_title')}</h2>
        <div style="width: 90%; max-width: 700px;">
            <div class="shop-controls">
                <div class="shop-filter-container">
                    ${filterButtons}
                </div>
                <div class="shop-sort-container">
                    <label for="shop-sort-select">${t('shop_sort_by')}</label>
                    <select id="shop-sort-select">
                        ${sortOptions}
                    </select>
                </div>
            </div>
            <div class="scrollable-list">
              ${itemCards.length > 0 ? itemCards : `<p style="text-align:center; margin-top: 20px;">${t('inventory_no_items')}</p>`}
            </div>
            <button class="button back-button" data-action="change-view" data-value="menu" style="margin-top: 20px;">${t('common_back')}</button>
        </div>
    `;
};

const renderBuyModal = () => {
  if (!state.itemToBuy) return '';
  const item = itemDatabase[state.itemToBuy];
  const price = getItemPrice(item);
  return `
      <div class="modal-backdrop">
          <div class="modal-content">
              <p>${t('shop_buy_confirm', { name: item.name })}</p>
              <p style="margin: 10px 0; font-weight: 700;">${t('shop_cost')}: ${price} ${t('common_gold')}</p>
              <div class="button-group">
                  <button class="button" data-action="buy-item" data-value="${state.itemToBuy}">${t('shop_confirm')}</button>
                  <button class="button back-button" data-action="cancel-buy">${t('shop_cancel')}</button>
              </div>
          </div>
      </div>
  `;
};

const renderSellModal = () => {
  const item = state.itemToSell;
  if (!item) return '';
  const itemData = itemDatabase[item.id];
  const fullPrice = getItemPrice(itemData);
  const sellPrice = Math.floor(fullPrice / 2) + item.level * 10;
  
  return `
      <div class="modal-backdrop">
          <div class="modal-content">
              <p>${t('inventory_sell_confirm', { name: item.name, price: sellPrice })}</p>
              <div class="button-group">
                  <button class="button" data-action="confirm-sell">${t('shop_confirm')}</button>
                  <button class="button back-button" data-action="cancel-sell">${t('shop_cancel')}</button>
              </div>
          </div>
      </div>
  `;
};

const renderUpgrade = () => {
  const { itemToUpgrade } = state;
  const itemsToUpgrade = state.inventory.filter(i => ['weapon', 'shield', 'helmet', 'armor', 'gloves', 'boots'].includes(i.type));

  const itemOptions = itemsToUpgrade.map(item => `<option value="${item.instanceId}" ${itemToUpgrade?.instanceId === item.instanceId ? 'selected' : ''}>${item.name} +${item.level}</option>`).join('');
  
  let detailsHtml = '';
  if(itemToUpgrade) {
      const itemData = itemDatabase[itemToUpgrade.id];
      const rarityInfo = rarityData[itemData.rarity || 'common'];
      const isMaxLevel = itemToUpgrade.level >= 10;
      
      if (isMaxLevel) {
           detailsHtml = `<div class="item-card"><h3 style="text-align: center;">${t('notification_upgrade_max')}</h3></div>`;
      } else {
          const upgradeCost = (itemToUpgrade.level + 1) * 100;
          const materialId = `m${Math.min(6, Math.floor(itemToUpgrade.level / 2) + 1)}`;
          const materialCost = itemToUpgrade.level + 1;
          const hasGold = state.playerStats.gold >= upgradeCost;
          const hasMats = (state.materials[materialId] || 0) >= materialCost;

          detailsHtml = `
              <div class="item-card">
                  <h3 style="color: ${rarityInfo.color};">Próximo Nível: +${itemToUpgrade.level + 1}</h3>
                  <p>Custo de Ouro: <span style="color: ${hasGold ? 'inherit' : '#cc0505'}">${upgradeCost}</span></p>
                  <p>Custo de Material: <span style="color: ${hasMats ? 'inherit' : '#cc0505'}">${materialCost}x ${materialDatabase[materialId].name}</span></p>
                  <button class="button" data-action="upgrade-item" data-value="${itemToUpgrade.instanceId}" style="margin-top: 15px;">${t('upgrade_button')}</button>
              </div>
          `;
      }
  }

  return `
      <h2>${t('upgrade_title')}</h2>
      <div style="width: 90%; max-width: 700px;">
          <p>${t('upgrade_select_item')}</p>
          <select id="upgrade-select" class="button" style="width: 100%; margin: 10px 0;">
              <option value="">--</option>
              ${itemOptions}
          </select>
          ${detailsHtml}
          <button class="button back-button" data-action="change-view" data-value="menu" style="margin-top: 20px;">${t('common_back')}</button>
      </div>
  `;
};

const renderSkills = () => {
  const { learnedSkills, level, gold } = state.playerStats;

  const renderSkillCard = (skill: any, isLearnable: boolean) => {
      const skillTier = getSkillTier(skill.minLevel);
      const isLearned = learnedSkills.includes(skill.id);
      const canLearn = level >= skill.minLevel && gold >= skill.learnCost && !isLearned;

      return `
          <div class="item-card" style="border-left: 5px solid ${skillTier.color}; opacity: ${isLearnable && isLearned ? 0.5 : 1};">
              <div class="item-card-header">
                  <span class="item-icon">${skillTypeIcons[skill.type] || '❓'}</span>
                  <div>
                      <p style="font-weight: 700; color: ${skillTier.color};">${skill.name}</p>
                      <p style="font-size: 0.8rem; color: ${skillTier.color}; margin-bottom: 5px;">${t(`rarity_${skillTier.key}`)}</p>
                  </div>
              </div>
              <p style="font-size: 0.9rem; margin-top: 10px;">${skill.description}</p>
              <p style="font-size: 0.8rem; color: #6b6b65;">${t('skills_energy_cost')}: ${skill.energyCost}</p>
              ${isLearnable ? `
                  <p style="font-size: 0.8rem; color: #6b6b65;">${t('common_min_level')}: ${skill.minLevel} | ${t('skills_learn_cost')}: ${skill.learnCost}</p>
                  ${!isLearned ? `<button class="button" data-action="learn-skill" data-value="${skill.id}" ${!canLearn ? 'disabled' : ''}>${t('skills_learn_button')}</button>` : ''}
              ` : ''}
          </div>
      `;
  };
  
  const learnedHtml = learnedSkills.map(skillId => renderSkillCard(skillDatabase[skillId], false)).join('') || `<p>${t('combat_no_skills')}</p>`;
  const learnableHtml = Object.values(skillDatabase).map(skill => renderSkillCard(skill, true)).join('');

  return `
      <h2>${t('skills_title')}</h2>
      <div style="width: 90%; max-width: 700px;">
          <h3>Habilidades Aprendidas</h3>
          <div class="scrollable-list" style="max-height: 25vh;">
              ${learnedHtml}
          </div>
          <h3>${t('skills_learn')}</h3>
          <div class="scrollable-list" style="max-height: 35vh;">
              ${learnableHtml}
          </div>
          <button class="button back-button" data-action="change-view" data-value="menu" style="margin-top: 20px;">${t('common_back')}</button>
      </div>
  `;
};

const renderQuests = () => {
  const questHtml = questsData.map(quest => {
      const progress = state.questProgress[quest.id];
      const isCompleted = progress.currentAmount >= quest.requiredAmount;
      return `
          <div class="item-card">
              <p style="font-weight: 700;">${t(quest.title)}</p>
              <p>${t('quests_objective')}: ${quest.type === 'kill' ? `Derrote ${quest.requiredAmount}x ${quest.target}` : 'N/A'}</p>
              <p>${t('quests_progress')}: ${progress.currentAmount} / ${progress.currentAmount >= quest.requiredAmount ? quest.requiredAmount : quest.requiredAmount}</p>
              <p>${t('quests_reward')}: ${quest.reward.gold} ${t('common_gold')}, ${quest.reward.exp} ${t('common_exp')}</p>
              ${isCompleted && !progress.completed ? `
                  <button class="button" data-action="claim-quest" data-value="${quest.id}" style="margin-top:10px;">${t('quests_claim')}</button>
              ` : ''}
               ${progress.completed ? `<p style="color: #48944f; font-weight: bold;">Recompensa Resgatada</p>`: ''}
          </div>
      `;
  }).join('');

  return `
      <h2>${t('quests_title')}</h2>
      <div style="width: 90%; max-width: 700px;">
          <div class="scrollable-list">
              ${questHtml}
          </div>
          <button class="button back-button" data-action="change-view" data-value="menu" style="margin-top: 15px;">${t('common_back')}</button>
      </div>
  `;
};

const renderSettings = () => {
    const { soundOn, autoHealSettings, language, aiStoryteller } = state;
    return `
      <h2>${t('settings_title')}</h2>
      <div style="width: 90%; max-width: 700px;" class="item-card" style="margin-bottom: 0;">
          <h3>${t('settings_language')}</h3>
          <div class="button-group">
              <button class="button" data-action="set-language" data-value="pt" style="background-color: ${language === 'pt' ? '#48944f' : '#97714d'}">Português</button>
              <button class="button" data-action="set-language" data-value="en" style="background-color: ${language === 'en' ? '#48944f' : '#97714d'}">English</button>
              <button class="button" data-action="set-language" data-value="es" style="background-color: ${language === 'es' ? '#48944f' : '#97714d'}">Español</button>
          </div>

          <h3 style="margin-top: 20px;">${t('settings_sound')}</h3>
          <div class="button-group">
              <button class="button" data-action="toggle-sound" style="background-color: ${soundOn ? '#48944f' : '#869e9d'}">
                  ${soundOn ? t('settings_sound_off') : t('settings_sound_on')}
              </button>
          </div>
          
          <h3 style="margin-top: 20px;">${t('settings_autoheal')}</h3>
          <div class="button-group">
              <button class="button" data-action="toggle-autoheal" style="background-color: ${autoHealSettings.enabled ? '#48944f' : '#869e9d'}">${t('settings_autoheal_enable')}</button>
          </div>
          <p style="text-align: center; margin-top: 10px;">${t('settings_autoheal_threshold', { threshold: autoHealSettings.threshold })}</p>
          <p style="text-align: center; margin-top: 10px;">${t('settings_autoheal_resource')}</p>
          <div class="button-group">
              <button class="button" data-action="set-autoheal-resource" data-value="gold" style="background-color: ${autoHealSettings.costType === 'gold' ? '#48944f' : '#97714d'}">${t('settings_autoheal_gold')}</button>
              <button class="button" data-action="set-autoheal-resource" data-value="energy" style="background-color: ${autoHealSettings.costType === 'energy' ? '#48944f' : '#97714d'}">${t('settings_autoheal_energy')}</button>
          </div>

          <h3 style="margin-top: 20px;">${t('story_mode_title')} ✨</h3>
          <div class="button-group">
              <button class="button" data-action="toggle-ai-storyteller" style="background-color: ${aiStoryteller ? '#48944f' : '#869e9d'}">
                  ${t(aiStoryteller ? 'story_mode_disable' : 'story_mode_enable')}
              </button>
          </div>
          
          <button class="button back-button" data-action="change-view" data-value="menu" style="margin-top: 30px;">${t('common_back')}</button>
      </div>
    `;
};


// --- DYNAMIC EVENT LISTENERS ---
document.addEventListener('change', e => {
  // FIX: Cast e.target to HTMLSelectElement to access properties like id and value.
  const target = e.target as HTMLSelectElement;
  if (target.id === 'upgrade-select') {
    const selectedId = target.value;
    state.itemToUpgrade = state.inventory.find(i => i.instanceId === parseFloat(selectedId)) || null;
    render();
  }
  if (target.id === 'shop-sort-select') {
    state.shopSort = target.value;
    render();
  }
});


// --- INITIALIZATION ---
const init = () => {
  loadGame();
  render();
  setInterval(() => saveGame(true), 300000); // 5 minutes
  setInterval(regenerateStats, 5000); // Every 5 seconds
};

init();