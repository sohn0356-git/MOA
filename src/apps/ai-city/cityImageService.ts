import {getDownloadURL,ref,uploadBytesResumable} from 'firebase/storage'
import {cityStorage,withCityAccount} from './cityService'
import {cityImagePath,fitCityImage,imageFileError,verifyImageSignature,type CityImage} from './cityImages'
export async function prepareCityImage(file:File){
 const error=imageFileError(file);if(error)throw new Error(error)
 await verifyImageSignature(file)
 let bitmap:ImageBitmap
 try{bitmap=await createImageBitmap(file)}catch{throw new Error('그림을 읽을 수 없습니다. 다른 JPG·PNG·WebP 파일을 선택해 주세요.')}
 try{
 const size=fitCityImage(bitmap.width,bitmap.height),canvas=document.createElement('canvas')
 canvas.width=size.width;canvas.height=size.height
 const context=canvas.getContext('2d');if(!context)throw new Error('이 브라우저에서 그림을 준비하지 못했습니다.')
 context.drawImage(bitmap,0,0,size.width,size.height)
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('그림 변환에 실패했습니다.')),'image/webp',0.88))
 if(blob.size>4*1024*1024)throw new Error('변환한 그림이 4MB를 넘습니다. 더 작은 그림을 선택해 주세요.')
 if(!['image/webp','image/png','image/jpeg'].includes(blob.type))throw new Error('지원하지 않는 그림 형식입니다.')
 return{blob,...size}
 }finally{bitmap.close()}
}
export async function uploadCityImage(account:string,file:File,alt:string,onProgress:(percent:number)=>void,onCancel:(cancel:()=>void)=>void=()=>{}):Promise<CityImage>{
 if(!alt.trim()||alt.trim().length>300)throw new Error('그림 설명을 1~300자로 적어 주세요.')
 const prepared=await prepareCityImage(file)
 return withCityAccount(account,async uid=>{
 const image:CityImage={id:'image-'+crypto.randomUUID(),ownerUid:uid,alt:alt.trim(),width:prepared.width,height:prepared.height}
 const task=uploadBytesResumable(ref(cityStorage(),cityImagePath(image)),prepared.blob,{contentType:prepared.blob.type,cacheControl:'public,max-age=31536000,immutable'})
 onCancel(()=>{task.cancel()})
 await new Promise<void>((resolve,reject)=>task.on('state_changed',snapshot=>onProgress(Math.round(snapshot.bytesTransferred/Math.max(1,snapshot.totalBytes)*100)),error=>reject(new Error(error.code==='storage/canceled'?'그림 업로드를 취소했습니다.':'그림 업로드에 실패했습니다. 파일과 연결을 확인하고 다시 시도해 주세요.')),()=>resolve()))
 return image
 })
}
const urls=new Map<string,Promise<string>>()
export function readCityImage(image:CityImage,retry=false){
 const path=cityImagePath(image)
 if(retry)urls.delete(path)
 let result=urls.get(path)
 if(!result){result=getDownloadURL(ref(cityStorage(),path)).catch(error=>{urls.delete(path);throw error});urls.set(path,result)}
 return result
}
