import {get,ref,set,remove,serverTimestamp} from 'firebase/database'
import {cityDatabase,withCityAccount} from './cityService'
import {cityImagePath,fitCityImage,imageFileError,verifyImageSignature,type CityImage} from './cityImages'
export async function prepareCityImage(file:File){
 const error=imageFileError(file);if(error)throw new Error(error)
 await verifyImageSignature(file)
 let bitmap:ImageBitmap
 try{bitmap=await createImageBitmap(file)}catch{throw new Error('그림을 읽을 수 없습니다. 다른 JPG·PNG·WebP 파일을 선택해 주세요.')}
 try{
 let size=fitCityImage(bitmap.width,bitmap.height)
 const canvas=document.createElement('canvas')
 for(let pass=0;pass<7;pass++){
 canvas.width=size.width;canvas.height=size.height
 const context=canvas.getContext('2d');if(!context)throw new Error('이 브라우저에서 그림을 준비하지 못했습니다.')
 context.drawImage(bitmap,0,0,size.width,size.height)
 for(const quality of [0.82,0.64,0.46]){
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('그림 변환에 실패했습니다.')),'image/webp',quality))
 if(!['image/webp','image/png','image/jpeg'].includes(blob.type))throw new Error('지원하지 않는 그림 형식입니다.')
 if(blob.size<=512*1024)return{blob,...size}
 }
 size={width:Math.max(1,Math.round(size.width*0.75)),height:Math.max(1,Math.round(size.height*0.75))}
 }
 throw new Error('그림이 너무 큽니다. 더 작은 그림을 선택해 주세요.')
 }finally{bitmap.close()}
}
function dataUrl(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('그림 파일을 읽지 못했습니다.'));reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('그림 변환에 실패했습니다.'));reader.readAsDataURL(blob)})}
export async function uploadCityImage(account:string,file:File,alt:string,onProgress:(percent:number)=>void,onCancel:(cancel:()=>void)=>void=()=>{}):Promise<CityImage>{
 if(!alt.trim()||alt.trim().length>300)throw new Error('그림 설명을 1~300자로 적어 주세요.')
 let stopped=false,rejectStop:(error:Error)=>void=()=>{},target:ReturnType<typeof ref>|undefined
 const aborted=new Promise<never>((_resolve,reject)=>{rejectStop=reject})
 function stop(message:string){if(stopped)return;stopped=true;if(target)void remove(target).catch(()=>{});rejectStop(new Error(message))}
 const timer=setTimeout(()=>stop('그림 업로드 시간이 초과됐습니다. 연결을 확인하고 다시 시도해 주세요.'),60000)
 onCancel(()=>stop('그림 업로드를 취소했습니다.'))
 const check=()=>{if(stopped)throw new Error('그림 업로드가 중단됐습니다.')}
 const run=async()=>{
 onProgress(0)
 const prepared=await prepareCityImage(file);check();onProgress(35)
 const data=await dataUrl(prepared.blob);check();onProgress(60)
 return withCityAccount(account,async uid=>{
 check()
 const image:CityImage={id:'image-'+crypto.randomUUID(),ownerUid:uid,alt:alt.trim(),width:prepared.width,height:prepared.height}
 target=ref(cityDatabase(),cityImagePath(image))
 await Promise.race([set(target,{data,width:image.width,height:image.height,createdAt:serverTimestamp()}),aborted])
 check();onProgress(100)
 return image
 })
 }
 try{return await Promise.race([run(),aborted])}finally{clearTimeout(timer)}
}
const urls=new Map<string,Promise<string>>()
export function readCityImage(image:CityImage,retry=false){
 const path=cityImagePath(image)
 if(retry)urls.delete(path)
 let result=urls.get(path)
 if(!result){if(urls.size>=24)urls.delete(urls.keys().next().value!);result=get(ref(cityDatabase(),path)).then(snapshot=>{const value=snapshot.val();if(!value||typeof value.data!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value.data))throw new Error('그림을 확인할 수 없습니다.');return value.data as string}).catch(error=>{urls.delete(path);throw error});urls.set(path,result)}
 return result
}
