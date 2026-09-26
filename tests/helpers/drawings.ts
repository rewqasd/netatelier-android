import type {DocumentPage,OcrText,Vec2} from '../../src/domain/model';
export function drawingFixture(kind:'split'|'elbow'|'angled'|'blank'='split'){
  const width=320,height=240,pixels=new Uint8ClampedArray(width*height*4).fill(255);
  const dot=(x:number,y:number)=>{if(x>=0&&y>=0&&x<width&&y<height){const i=(Math.round(y)*width+Math.round(x))*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;}};
  const line=(a:Vec2,b:Vec2)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*2);for(let k=0;k<=n;k++)for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)dot(Math.round(a.x+(b.x-a.x)*k/n)+dx,Math.round(a.y+(b.y-a.y)*k/n)+dy);};
  const path=(coords:number[][])=>{coords.forEach((p,i)=>{const q=coords[(i+1)%coords.length];line({x:p[0],y:p[1]},{x:q[0],y:q[1]});});};
  if(kind==='split'){path([[20,20],[300,20],[300,220],[20,220]]);line({x:130,y:20},{x:130,y:220});}
  if(kind==='elbow')path([[30,25],[270,25],[270,100],[160,100],[160,215],[30,215]]);
  if(kind==='angled'){
    path([[160,15],[295,120],[160,225],[25,120]]);line({x:160,y:15},{x:160,y:225});
    for(let i=0;i<100;i++)dot((i*67+11)%320,(i*79+9)%240);
  }
  const document:DocumentPage={assetId:'fixture.png',mime:'image/png',widthPx:width,heightPx:height,page:0};
  const text:OcrText[]=kind==='split'?[{text:'厨房101',source:'ocr',boxPx:{x:50,y:65,width:45,height:15}},{text:'Office202',source:'ocr',boxPx:{x:190,y:70,width:60,height:15}}]:[];
  return {document,pixels,text};
}
