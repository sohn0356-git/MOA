import {cityPaths,cityTrees} from './cityGround'
import {cityBuildings} from './cityBuildings'
import {cameraMatrix,type CityCamera,type Vec3,cross,normalize,sub} from './city3dMath'
import {avatarColors,defaultAvatar,residentWorldState,type CityAvatarLook,type CityWorldCommand} from './cityWorld'
type Color=[number,number,number]
type Mesh=number[]
export type CitySceneSnapshot={camera:CityCamera;profiles:readonly {id:string}[];avatars:Record<string,CityAvatarLook>;commands:Record<string,CityWorldCommand>;residentId:string;highlight:string|null;now:number;controlled?:{x:number;z:number};overview?:boolean}
function color(hex:string):Color{return [parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255]}
function triangle(mesh:Mesh,a:Vec3,b:Vec3,c:Vec3,tint:Color){const n=normalize(cross(sub(b,a),sub(c,a)));for(const p of [a,b,c])mesh.push(...p,...n,...tint)}
function quad(mesh:Mesh,a:Vec3,b:Vec3,c:Vec3,d:Vec3,tint:Color){triangle(mesh,a,b,c,tint);triangle(mesh,a,c,d,tint)}
function box(mesh:Mesh,x:number,y:number,z:number,w:number,h:number,d:number,hex:string){
 const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,t=y+h,k=color(hex)
 quad(mesh,[a,y,e],[b,y,e],[b,t,e],[a,t,e],k);quad(mesh,[b,y,c],[a,y,c],[a,t,c],[b,t,c],k)
 quad(mesh,[a,y,c],[a,y,e],[a,t,e],[a,t,c],k);quad(mesh,[b,y,e],[b,y,c],[b,t,c],[b,t,e],k)
 quad(mesh,[a,t,e],[b,t,e],[b,t,c],[a,t,c],k);quad(mesh,[a,y,c],[b,y,c],[b,y,e],[a,y,e],k)
}
function roof(mesh:Mesh,x:number,y:number,z:number,w:number,d:number,hex:string){
 const a:Vec3=[x-w/2,y,z-d/2],b:Vec3=[x+w/2,y,z-d/2],c:Vec3=[x+w/2,y,z+d/2],e:Vec3=[x-w/2,y,z+d/2],p:Vec3=[x,y+4,z],k=color(hex)
 triangle(mesh,a,b,p,k);triangle(mesh,b,c,p,k);triangle(mesh,c,e,p,k);triangle(mesh,e,a,p,k)
}
function octahedron(mesh:Mesh,x:number,y:number,z:number,r:number,hex:string){
 const top:Vec3=[x,y+r,z],bottom:Vec3=[x,y-r,z],ring:Vec3[]=[[x-r,y,z],[x,y,z-r],[x+r,y,z],[x,y,z+r]],k=color(hex)
 for(let i=0;i<4;i++){triangle(mesh,top,ring[i],ring[(i+1)%4],k);triangle(mesh,bottom,ring[(i+1)%4],ring[i],k)}
}
export function buildCityScenery(){
 const mesh:Mesh=[]
 box(mesh,0,-1.7,0,150,1.63,102,'#cadcc1');box(mesh,0,-.07,0,149,.07,101,'#e1ead8')
 for(let x=-75;x<75;x+=5){const z=-37+Math.sin(x/13)*2.7,next=-37+Math.sin((x+5)/13)*2.7;quad(mesh,[x,.02,z-2.2],[x+5,.02,next-2.2],[x+5,.02,next+2.2],[x,.02,z+2.2],color('#a6d2d5'))}
 // Use exactly the same path rectangles for the visible ground and walking checks.
 for(const p of cityPaths){box(mesh,p.x,.02,p.z,p.width,.08,p.depth,'#c9bfaa');box(mesh,p.x,.11,p.z,Math.max(2.8,p.width-.65),.035,Math.max(2.8,p.depth-.65),'#f3e4cb')}
 for(const b of cityBuildings){
  const x=(b.x-600)/10,z=(b.z-400)/10
  box(mesh,x+.6,.06,z+.8,b.width+2,.03,b.depth+2,'#b8cbb1')
  box(mesh,x,0,z,b.width,b.height,b.depth,b.id==='tower'?'#dddce1':'#fff3df')
  box(mesh,x,b.height-.6,z,b.width+.5,.7,b.depth+.5,b.color)
  roof(mesh,x,b.height,z,b.width+1.4,b.depth+1.4,b.color)
  box(mesh,x,.1,z+b.depth/2+.04,1.7,3,.13,b.color)
  for(const side of [-1,1]){
   box(mesh,x+side*b.width*.3,2.4,z+b.depth/2+.09,1.5,1.8,.14,'#9bc4ce')
   box(mesh,x+side*b.width*.3,b.height>8?6.1:4.8,z+b.depth/2+.09,1.5,1.3,.14,'#b7d4d6')
   box(mesh,x+b.width/2+.06,2.5,z+side*b.depth*.25,.12,1.6,1.6,'#a5c9ce')
  }
  box(mesh,x,0,z+b.depth/2+1.2,3.2,.2,2.2,'#ded2c0')
 }
 cityTrees.forEach(([x,z],i)=>{box(mesh,x,0,z,.55,3,.55,'#9d8065');octahedron(mesh,x,4.5,z,2.8,i%2?'#9bbb86':'#83ab7b')})
 box(mesh,-3,.15,-4,5,.5,4,'#d7d0bd');box(mesh,-3,.65,-4,4,.15,3,'#93c3d3')
 return new Float32Array(mesh)
}
function buildResidents(snapshot:CitySceneSnapshot){
 const mesh:Mesh=[]
 if(snapshot.highlight){const b=cityBuildings.find(b=>b.id===snapshot.highlight);if(b)box(mesh,(b.x-600)/10,.19,(b.z-400)/10,b.width+3,.08,b.depth+3,'#bba4d5')}
 for(const p of snapshot.profiles){
  if(snapshot.controlled&&p.id===snapshot.residentId&&!snapshot.overview)continue
  const pos=residentWorldState(p.id,snapshot.now,snapshot.commands[p.id]).point,controlled=p.id===snapshot.residentId?snapshot.controlled:undefined,x=controlled?.x??(pos.x-600)/10,z=controlled?.z??(pos.y-400)/10,look=snapshot.avatars[p.id]??defaultAvatar(p.id)
  const shirt=avatarColors.shirt[look.shirt],skin=avatarColors.skin[look.skin],hair=avatarColors.hair[look.hair]
  box(mesh,x,.17,z,1.7,.05,1.3,'#bbc5af')
  const moving=residentWorldState(p.id,snapshot.now,snapshot.commands[p.id]).moving,step=moving?Math.sin(snapshot.now/130+p.id.length)*.2:0
  box(mesh,x-.32,.15,z+step,.45,.9,.5,'#475267');box(mesh,x+.32,.15,z-step,.45,.9,.5,'#475267')
  box(mesh,x,1.0,z,1.2,1.15,.7,shirt)
  box(mesh,x-.8,1.0,z,.35,1,.4,skin);box(mesh,x+.8,1.0,z,.35,1,.4,skin)
  box(mesh,x,2.1,z,1.0,1.05,.9,skin);box(mesh,x,2.9,z,1.08,.42,.99,hair)
  if(look.style==='bob')box(mesh,x,2.25,z-.4,1.1,.8,.3,hair)
  if(look.style==='curly')octahedron(mesh,x,3.2,z,.7,hair)
  if(look.accessory==='cap'){box(mesh,x,3.18,z,1.25,.3,1.1,shirt);box(mesh,x,3.18,z+.7,1.15,.12,.6,shirt)}
  if(look.accessory==='glasses'){box(mesh,x-.25,2.65,z+.49,.35,.18,.08,'#3a3543');box(mesh,x+.25,2.65,z+.49,.35,.18,.08,'#3a3543')}
  if(p.id===snapshot.residentId)octahedron(mesh,x,4.5,z,.5,'#4fbc8a')
 }
 return new Float32Array(mesh)
}
const vertexSource=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uMatrix;varying vec3 vColor;void main(){float light=.65+.35*abs(dot(normalize(aNormal),normalize(vec3(-.5,1.,.7))));vColor=aColor*light;gl_Position=uMatrix*vec4(aPosition,1.);}`
const fragmentSource=`precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.);}`
export function createCity3DRenderer(canvas:HTMLCanvasElement){
 const gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'low-power'})
 if(!gl)throw new Error('WebGL unavailable')
 function shader(type:number,source:string){const s=gl!.createShader(type)!;gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS)){const error=gl!.getShaderInfoLog(s);gl!.deleteShader(s);throw new Error(error??'Shader compile failed')}return s}
 const vs=shader(gl.VERTEX_SHADER,vertexSource),fs=shader(gl.FRAGMENT_SHADER,fragmentSource),program=gl.createProgram()!
 gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program)
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('3D program link failed')
 const staticBuffer=gl.createBuffer()!,dynamicBuffer=gl.createBuffer()!,scenery=buildCityScenery()
 gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,scenery,gl.STATIC_DRAW)
 const position=gl.getAttribLocation(program,'aPosition'),normal=gl.getAttribLocation(program,'aNormal'),tint=gl.getAttribLocation(program,'aColor'),matrix=gl.getUniformLocation(program,'uMatrix')
 gl.enable(gl.DEPTH_TEST);gl.clearColor(.929,.949,.918,1)
 let lastControlled:CitySceneSnapshot['controlled'],lastOverview:boolean|undefined
 let lastResidentTime=0,residents=new Float32Array(0),disposed=false
 let lastAvatars:CitySceneSnapshot['avatars']|undefined,lastCommands:CitySceneSnapshot['commands']|undefined,lastProfiles:CitySceneSnapshot['profiles']|undefined,lastActor='',lastHighlight:string|null=null
 function bind(buffer:WebGLBuffer){gl!.bindBuffer(gl!.ARRAY_BUFFER,buffer);for(const [location,offset] of [[position,0],[normal,12],[tint,24]]){gl!.enableVertexAttribArray(location);gl!.vertexAttribPointer(location,3,gl!.FLOAT,false,36,offset)}}
 return {
  draw(snapshot:CitySceneSnapshot){
   if(disposed||gl.isContextLost()||!canvas.width||!canvas.height)return
   gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program)
   gl.uniformMatrix4fv(matrix,false,cameraMatrix(snapshot.camera,canvas.width/canvas.height));bind(staticBuffer);gl.drawArrays(gl.TRIANGLES,0,scenery.length/9)
   if(lastControlled!==snapshot.controlled||lastOverview!==snapshot.overview||snapshot.now-lastResidentTime>80||lastResidentTime===0||lastAvatars!==snapshot.avatars||lastCommands!==snapshot.commands||lastProfiles!==snapshot.profiles||lastActor!==snapshot.residentId||lastHighlight!==snapshot.highlight){residents=buildResidents(snapshot);lastControlled=snapshot.controlled;lastOverview=snapshot.overview;lastResidentTime=snapshot.now;lastAvatars=snapshot.avatars;lastCommands=snapshot.commands;lastProfiles=snapshot.profiles;lastActor=snapshot.residentId;lastHighlight=snapshot.highlight}
   bind(dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,residents,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,residents.length/9)
  },
  dispose(){if(disposed)return;disposed=true;gl.deleteBuffer(staticBuffer);gl.deleteBuffer(dynamicBuffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs)}
 }
}
