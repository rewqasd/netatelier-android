import {minimalProject} from './projects';
export function adversarialRoutes(mode:'length'|'segments'){
 const p=minimalProject(),f=p.floors[0];p.settings.cablePurchase='metre';
 f.devices=[{id:'cab',floorId:f.id,kind:'cabinet',label:'机柜',positionM:{x:1,y:1},locked:false,source:'manual'},{id:'port',floorId:f.id,kind:'information',label:'端口',positionM:{x:2,y:2},locked:false,source:'manual'}];
 f.cables=Array.from({length:mode==='length'?1:10},(_,i)=>({id:`wire-${i}`,floorId:f.id,fromId:'cab',toId:'port',status:'confirmed' as const,locked:false,pointsM:[{x:1,y:1},...Array.from({length:mode==='length'?120:1998},(_,j)=>mode==='length'?{x:j%2?1e6:-1e6,y:0}:{x:1+(j%19)/2,y:1+(j%23)/2}),{x:2,y:2}]}));
 return p;
}
