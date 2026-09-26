import {it,expect} from 'vitest';
import {minimalProject} from '../helpers/projects';
import {ProjectHistory} from '../../src/planning/history';
it('one applied transaction is one undo; a new edit discards redo and snapshots are isolated',()=>{
  const p=minimalProject(),h=new ProjectHistory(p);h.apply({type:'settings',settings:{...p.settings,wifi:5}});
  expect(h.current.settings.wifi).toBe(5);expect(h.canUndo).toBe(true);h.undo();expect(h.current.settings.wifi).toBe(6);expect(h.canRedo).toBe(true);
  h.redo();expect(h.current.settings.wifi).toBe(5);h.undo();h.apply({type:'price',modelId:'ap6',cents:39900});expect(h.canRedo).toBe(false);expect(h.current.priceOverrides.ap6).toBe(39900);
  const snapshot=h.current;snapshot.settings.wifi=5;expect(h.current.settings.wifi).toBe(6);expect(p.priceOverrides).toEqual({});
});
it('a rejected transaction does not consume undo or clear the current state',()=>{
  const h=new ProjectHistory(minimalProject());expect(()=>h.apply({type:'price',modelId:'ap',cents:-1})).toThrow();expect(h.canUndo).toBe(false);expect(h.current.priceOverrides).toEqual({});
});
it('configuration plus routing is one atomic undo and invalid derived snapshots cannot enter history',()=>{
 const p=minimalProject(),h=new ProjectHistory(p);
 h.transact([{type:'settings',settings:{...p.settings,wifi:5}},{type:'price',modelId:'ap',cents:100}],next=>({...next,name:'复合编辑'}));
 expect(h.current.settings.wifi).toBe(5);expect(h.current.priceOverrides.ap).toBe(100);expect(h.current.name).toBe('复合编辑');
 h.undo();expect(h.current).toEqual(p);expect(h.canUndo).toBe(false);h.redo();
 expect(()=>h.transact([{type:'price',modelId:'ap',cents:200}],next=>({...next,name:''}))).toThrow();expect(h.current.priceOverrides.ap).toBe(100);
});
