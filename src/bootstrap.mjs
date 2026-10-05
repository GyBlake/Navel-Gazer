export const BOOT_STAGES = Object.freeze(['PLATFORM','INITIALIZE','FIRMWARE','BOOT','KERNEL','INTERFACES','RESOURCES','RUNTIME','EXTENSIONS','APPLICATIONS','STATE_EVENTS','SHUTDOWN']);
const next = Object.freeze({PLATFORM:['INITIALIZE'],INITIALIZE:['FIRMWARE'],FIRMWARE:['BOOT'],BOOT:['KERNEL'],KERNEL:['INTERFACES'],INTERFACES:['RESOURCES'],RESOURCES:['RUNTIME'],RUNTIME:['EXTENSIONS'],EXTENSIONS:['APPLICATIONS'],APPLICATIONS:['STATE_EVENTS'],STATE_EVENTS:['SHUTDOWN'],SHUTDOWN:[]});
export function canAdvance(from,to){ return Boolean(next[from]?.includes(to)); }
export function createBootState(){ return Object.freeze({stage:'PLATFORM',complete:false}); }
export function advanceBoot(state,to){ if(!state||typeof state!=='object') throw new TypeError('Boot state required'); if(!canAdvance(state.stage,to)) throw new Error(`Invalid boot transition: ${state.stage} -> ${to}`); return Object.freeze({stage:to,complete:to==='SHUTDOWN'}); }
export function sequence(){ return [...BOOT_STAGES]; }
