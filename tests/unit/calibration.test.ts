import {describe,it,expect} from 'vitest';
import {knownLength,areaCalibration,calibrateDraft,calibrationIssues} from '../../src/recognition/calibration';
import type {RecognitionDraft,DraftEdits} from '../../src/domain/model';
const p=(x:number,y:number)=>({x,y});
function fixture(){
  const draft:RecognitionDraft={document:{assetId:'page.png',sourceAssetId:'source.pdf',page:1,mime:'image/png',widthPx:400,heightPx:300},text:[],boundaryPx:[p(0,0),p(400,0),p(400,300),p(0,300)],wallsPx:[],openingsPx:[],roomsPx:[],issues:[]};
  const edits:DraftEdits={boundaryPx:draft.boundaryPx,wallsPx:[],roomsPx:[{id:'r1',name:'更衣室',use:'changing',polygon:draft.boundaryPx,confirmed:true,provenance:'manual'}],openingsPx:[{id:'d1',at:p(0,100),widthPx:20,roomIds:['r1'],entrance:true,confirmed:true,provenance:'manual'}],cabinetPx:p(100,100),wanPx:p(0,100),targetsPx:[]};
  return {draft,edits};
}
describe('pixel correction → confirmed metric floor',()=>{
  it('200px known 10m scales coordinates and door width once, without changing source',()=>{
    const {draft,edits}=fixture(),before=structuredClone(edits);
    const floor=calibrateDraft(draft,knownLength(p(0,0),p(200,0),10),edits);
    expect(floor.devices.find(d=>d.kind==='cabinet')?.positionM).toEqual(p(5,5));
    expect(floor.openings[0].widthM).toBe(1);expect(floor.rooms[0].use).toBe('changing');
    expect(floor.rooms[0].confirmed).toBe(true);expect(floor.document?.sourceAssetId).toBe('source.pdf');
    expect(floor.boundary[2]).toEqual(p(20,15));expect(edits).toEqual(before);
    expect(floor.rooms[0]).not.toHaveProperty('provenance');
  });
  it('missing scale blocks metric conversion and measured-cost completeness',()=>{
    const {draft,edits}=fixture();const c=knownLength(p(0,0),p(0,0),10);
    expect(calibrationIssues(c).some(i=>i.severity==='blocking')).toBe(true);
    expect(()=>calibrateDraft(draft,c,edits)).toThrow(/比例|标尺/);
  });
  it('area-only scale is explicitly approximate and negative scale is rejected',()=>{
    const c=areaCalibration([p(0,0),p(200,0),p(200,100),p(0,100)],50);
    expect(c.kind).toBe('approximate-area');expect(c.metersPerPixel).toBeCloseTo(.05);
    expect(calibrationIssues(c).some(i=>i.code==='APPROXIMATE_SCALE')).toBe(true);
    expect(knownLength(p(0,0),p(200,0),-10).metersPerPixel).toBeNull();
  });
  it('rejects crossed polygons, outside rooms, unconfirmed rooms and invalid door references',()=>{
    const {draft,edits}=fixture(),c=knownLength(p(0,0),p(200,0),10);
    edits.roomsPx[0].polygon=[p(0,0),p(300,200),p(0,200),p(300,0)];
    expect(()=>calibrateDraft(draft,c,edits)).toThrow(/多边形|交叉/);
    edits.roomsPx[0].polygon=[p(-1,0),p(100,0),p(100,100)];expect(()=>calibrateDraft(draft,c,edits)).toThrow(/边界/);
    edits.roomsPx[0].polygon=draft.boundaryPx;edits.roomsPx[0].confirmed=false;expect(()=>calibrateDraft(draft,c,edits)).toThrow(/确认/);
    edits.roomsPx[0].confirmed=true;edits.openingsPx[0].roomIds=['missing'];expect(()=>calibrateDraft(draft,c,edits)).toThrow(/房间/);
  });
  it('rejects overlapping rooms before applying',()=>{
    const {draft,edits}=fixture(),c=knownLength(p(0,0),p(200,0),10);
    edits.roomsPx.push({...edits.roomsPx[0],id:'r2',polygon:[p(20,20),p(100,20),p(100,100),p(20,100)]});
    expect(()=>calibrateDraft(draft,c,edits)).toThrow(/重叠/);
  });
  it('rejects a door detached from its referenced room boundary',()=>{
    const {draft,edits}=fixture(),c=knownLength(p(0,0),p(200,0),10);
    edits.openingsPx[0].at=p(100,100);expect(()=>calibrateDraft(draft,c,edits)).toThrow(/门洞.*边/);
  });
  it('rejects monitoring targets after a room changes to a private use',()=>{
    const {draft,edits}=fixture(),c=knownLength(p(0,0),p(200,0),10);
    edits.targetsPx=[{id:'t1',roomId:'r1',at:p(50,50),kind:'public',weight:1,confirmed:true}];
    expect(()=>calibrateDraft(draft,c,edits)).toThrow(/隐私/);
  });
});
