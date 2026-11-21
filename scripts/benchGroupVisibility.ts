import { applyBaseGroupVisibilityUpdate } from '../src/lib/editor/editorGroupMutations';
import { setGroupVisibilityIncludingHead, groupContainsHeadLayer } from '../src/lib/editor/headLayerMutations';
import { sameRole } from '../src/lib/editor/editorHistoryTypes';
import * as newHistory from '../src/lib/editor/editorRoleHistoryPatch';
import { normalizeGroupsForRole } from '../src/lib/editor/groupTree';
import { syncGroups } from '../src/lib/editor/editorRoleUtils';
import { createDefaultRole, partOptions } from '../src/mock/options';
import { HEAD_LAYER_ID } from '../src/constants/layers';
import type { RoleDocument, DecorationGroup, DecorationGroupMember } from '../src/types/role';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const [base, groupArg = '1001', sampleArg = '60', baselineVersion = 'v13'] = process.argv.slice(2);
const groupCount = Number(groupArg);
const sampleCount = Number(sampleArg);
if (!base || ![125, 1001].includes(groupCount) || !Number.isInteger(sampleCount) || sampleCount < 1 || !['v13', 'v14'].includes(baselineVersion)) {
  throw new Error('Usage: node --import tsx scripts/benchGroupVisibility.ts TRUSTED_BASELINE_CHECKOUT [125|1001] [samples] [v13|v14]');
}
const branchCount = groupCount === 125 ? 9 : 25;
const leafCount = groupCount - branchCount - 1;
const sparseLeaf = 'leaf-' + Math.floor(leafCount * 0.4);
const loadBase = (name: string) => import(pathToFileURL(resolve(base, 'src/lib/editor', name+'.ts')).href);
const oldMut = await loadBase('editorGroupMutations');
const oldHead = await loadBase('headLayerMutations');
const oldRole = await loadBase('editorRoleUtils');
const oldHistory = await loadBase('editorRoleHistoryPatch') as typeof newHistory;
const oldEqual = (await loadBase('editorHistoryTypes')).sameRole as typeof sameRole;
type History = typeof newHistory;

function makeGroup(id: string, members: DecorationGroupMember[]): DecorationGroup {
  return { id, name: id, members, itemIds: members.flatMap(m=>m.type==='layer'?[m.id]:[]), collapsed:false, visible:true };
}
const option = partOptions.deco.find(item=>item.atlas) ?? partOptions.deco[0];
const decorations = Array.from({length:5000},(_,i)=>({
  id:'layer-'+i, code:option.code, assetId:option.id, name:'Layer '+i, x:i%90-45, y:i%50-25,
  scaleX:1,scaleY:1,rotation:i%360,visible:true,opacity:1
}));
function fixture(includesHead: boolean): RoleDocument {
  const leaves = Array.from({length:leafCount},(_,i)=>makeGroup('leaf-'+i,[
    ...decorations.slice(Math.floor(i*decorations.length/leafCount),Math.floor((i+1)*decorations.length/leafCount)).map(d=>({type:'layer' as const,id:d.id})),
    ...(includesHead && i===0?[{type:'layer' as const,id:HEAD_LAYER_ID}]:[])
  ]));
  const branches = Array.from({length:branchCount},(_,i)=>makeGroup('parent-'+i,leaves
    .slice(Math.floor(i*leaves.length/branchCount),Math.floor((i+1)*leaves.length/branchCount))
    .map(g=>({type:'group',id:g.id}))));
  const root = makeGroup('root',branches.map(g=>({type:'group',id:g.id})));
  const result=syncGroups({...createDefaultRole(),decorations,headLayerIndex:200,groups:[root,...branches,...leaves],updatedAt:'2026-01-01T00:00:00.000Z'});
  strictEqual(result.groups.length,groupCount);
  return result;
}
const regular=fixture(false), withHead=fixture(true);
function oldBase(input:RoleDocument,id:string,visible:boolean):RoleDocument {
  if (baselineVersion === 'v14') return oldMut.applyBaseGroupVisibilityUpdate(input,id,visible);
  const draft=oldRole.cloneRole(input);
  oldMut.setGroupVisibleInRole(draft,id,visible);
  return oldRole.syncGroups(oldRole.touch(draft));
}
function next(input:RoleDocument,id:string,visible:boolean,baseline:boolean,head:boolean):RoleDocument {
  if(baseline) return head?oldHead.setGroupVisibilityIncludingHead(input,id,visible):oldBase(input,id,visible);
  return head?setGroupVisibilityIncludingHead(input,id,visible):applyBaseGroupVisibilityUpdate(input,id,visible);
}
function entry(init:RoleDocument, result:RoleDocument, pool: ReturnType<History['createHistoryIdPool']>, previous:boolean, head:boolean) {
  const history = previous?oldHistory:newHistory;
  if(head) return history.makeRoleHistoryEntry(init,result,[HEAD_LAYER_ID],[HEAD_LAYER_ID],pool);
  const equals=previous?oldEqual:sameRole;
  return equals(result,init)?null:history.makeBaseRoleHistoryEntry(init,result,pool);
}
function roleFields(input:RoleDocument) {const {updatedAt:_timestamp,...rest}=input;return rest;}
function entryFields(value: ReturnType<typeof entry>) {
  if(!value) return value;
  const {updatedAt,...remaining}=value.patch;
  return {...value,patch:{...remaining,...(updatedAt?{beforeTimestamp:updatedAt.before}:{})}};
}
function check(input:RoleDocument,id:string,visible:boolean,head:boolean) {
  const a=next(input,id,visible,true,head), b=next(input,id,visible,false,head);
  deepStrictEqual(roleFields(b),roleFields(a));
  const old=entry(input,a,oldHistory.createHistoryIdPool(),true,head);
  const current=entry(input,b,newHistory.createHistoryIdPool(),false,head);
  deepStrictEqual(entryFields(current),entryFields(old));
  if(old&&current) {
    const oldUndo=oldHistory.applyRoleHistoryPatch(a,old.patch,'before'), newUndo=newHistory.applyRoleHistoryPatch(b,current.patch,'before');
    deepStrictEqual(roleFields(newUndo),roleFields(oldUndo));
    deepStrictEqual(roleFields(newHistory.applyRoleHistoryPatch(newUndo,current.patch,'after')),roleFields(oldHistory.applyRoleHistoryPatch(oldUndo,old.patch,'after')));
  }
  return { oldChangedRefs:a.decorations.filter((item,i)=>input.decorations[i]!==item).length,
    newChangedRefs:b.decorations.filter((item,i)=>input.decorations[i]!==item).length,
    hidden:b.decorations.filter(item=>!item.visible).length,
    headVisible:b.headLayer.visible, hasHistory:Boolean(current) };
}
const oddGroups = [
  makeGroup('dupe', [{type:'group',id:'cycle'},{type:'layer',id:'layer-0'}]),
  makeGroup('dupe', [{type:'layer',id:'layer-2'},{type:'layer',id:HEAD_LAYER_ID}]),
  makeGroup('cycle', [{type:'group',id:'dupe'},{type:'layer',id:'layer-1'}]),
  { id:'legacy', name:'Legacy', itemIds:['','layer-0','layer-7'], visible:true, collapsed:false }
];
const odd={...regular,groups:oddGroups};
let parity=0;
for(const role of [regular,withHead,odd]) {
  for(const groupId of [...new Set(role.groups.map(g=>g.id)), 'not-present']) {
    if(role!==odd && !['root','leaf-0',sparseLeaf,'leaf-' + (leafCount - 1),'parent-2','not-present'].includes(groupId))continue;
    strictEqual(groupContainsHeadLayer(role,groupId),oldHead.groupContainsHeadLayer(role,groupId));
    for(const flag of [true,false]) {
      for(const head of [true,false]) {
        check(role,groupId,flag,head);
        parity +=1;
      }
    }
  }
}
let baselineNormalize: typeof normalizeGroupsForRole | undefined;
if (baselineVersion === 'v14') {
  const oldNormalize = (await loadBase('groupTree')).normalizeGroupsForRole as typeof normalizeGroupsForRole;
  baselineNormalize = oldNormalize;
  let state = 708713;
  function random(max: number) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return Math.floor(state / 2**32 * max);
  }
  const layerIds = ['a','b','c','d','e','f','g','h',HEAD_LAYER_ID,'missing'];
  const randomLayer = () => layerIds[random(layerIds.length)];
  for (let i = 0; i < 20_000; i++) {
    const groups = Array.from({ length: random(12) }, (_, g) => {
      const itemIds = Array.from({ length: random(6) }, randomLayer);
      const members = Array.from({ length: random(10) }, () => {
        switch (random(8)) {
          case 0: return null;
          case 1: return { type: 'unknown', id: randomLayer() };
          case 2: return { type: 'layer', id: '' };
          case 3: case 4: return { type: 'group', id: 'g' + random(9) };
          default: return { type: 'layer', id: randomLayer() };
        }
      });
      return { id: 'g' + random(8), name: 'n' + g, itemIds, ...(random(5) > 0 ? { members } : {}),
        visible: random(2) !== 0, collapsed: random(2) !== 0 };
    });
    const role = {
      ...regular, groups: groups as RoleDocument['groups'],
      decorations: layerIds.slice(0, 8).filter(() => random(5) !== 0)
        .map((id, index) => ({ ...decorations[index], id }))
    };
    deepStrictEqual(normalizeGroupsForRole(role), oldNormalize(role));
  }
  console.log('Exact seeded malformed-group normalization cases: 20000');
}
console.log({ baselineVersion, node:process.version, layers:decorations.length, groups:groupCount, samplesPerPath:sampleCount, exactParityCases:parity });
let sum=0;
function stats(a:number[]) {const n=[...a].sort((a,b)=>a-b); return {med:Number(n[Math.ceil(n.length*.5)-1].toFixed(4)),p95:Number(n[Math.ceil(n.length*.95)-1].toFixed(4))};}
function bench(input:RoleDocument,id:string,withPatch:boolean) {
  function test(previous:boolean) {
    const pool=(previous?oldHistory:newHistory).createHistoryIdPool();
    return () => {
      const start=performance.now();
      const group=input.groups.find(g=>g.id===id)!;
      const containsHead=(previous?oldHead.groupContainsHeadLayer:groupContainsHeadLayer)(input,id);
      const result=next(input,id,group.visible===false,previous,containsHead);
      const history=withPatch?entry(input,result,pool,previous,containsHead):null;
      const elapsed=performance.now()-start;
      sum += result.decorations.length+result.groups.length+(history?.patch.decorations.visibility?.indices.length??0);
      return elapsed;
    };
  }
  const old=test(true), cur=test(false);
  for(let n=0;n<16;n++) { old();cur(); }
  const a:number[] = [],b:number[] = [];
  for(let n=0;n<sampleCount;n++) {
    if(n%2===0) { a.push(old());b.push(cur()); }
    else { b.push(cur());a.push(old()); }
  }
  return {baseline:stats(a),current:stats(b)};
}
for(const [label,input,id,head] of [
  ['base-sparse',regular,sparseLeaf,false], ['base-dense',regular,'root',false],
  ['head-sparse',withHead,'leaf-0',true], ['head-dense',withHead,'root',true]
] as const) {
  console.log(JSON.stringify({label,...check(input,id,false,head),mutation:bench(input,id,false),mutationAndCodec:bench(input,id,true)}));
}
if (baselineNormalize) {
  const previous = baselineNormalize;
  function normalizeSample(normalize: typeof normalizeGroupsForRole) {
    const start = performance.now();
    const result = normalize(regular);
    const elapsed = performance.now() - start;
    sum += result.length;
    return elapsed;
  }
  const baseline: number[] = [];
  const current: number[] = [];
  for (let i = -16; i < sampleCount; i++) {
    const a = i % 2 === 0 ? normalizeSample(previous) : normalizeSample(normalizeGroupsForRole);
    const b = i % 2 === 0 ? normalizeSample(normalizeGroupsForRole) : normalizeSample(previous);
    if (i >= 0) {
      baseline.push(i % 2 === 0 ? a : b);
      current.push(i % 2 === 0 ? b : a);
    }
  }
  console.log(JSON.stringify({label:'normalization-only', baseline:stats(baseline), current:stats(current)}));
}
console.log('checksum',sum);
