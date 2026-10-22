export type CityImage={id:string;ownerUid:string;alt:string;width:number;height:number}
export const cityImageLimit=8*1024*1024
export function imageFileError(file:Pick<File,'type'|'size'>){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))return 'JPG·PNG·WebP 그림만 선택할 수 있습니다.'
 if(!file.size)return '빈 파일은 올릴 수 없습니다.'
 if(file.size>cityImageLimit)return '그림은 8MB 이하로 선택해 주세요.'
 return ''
}
export async function verifyImageSignature(file:Blob){
 const b=new Uint8Array(await file.slice(0,12).arrayBuffer())
 const jpeg=b[0]===255&&b[1]===216&&b[2]===255
 const png=[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)
 const webp=String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP'
 if(!(file.type==='image/jpeg'&&jpeg||file.type==='image/png'&&png||file.type==='image/webp'&&webp))throw new Error('파일 내용이 선택한 그림 형식과 다릅니다. 다른 그림을 선택해 주세요.')
}
export function cityImagePath(image:Pick<CityImage,'ownerUid'|'id'>){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(image.ownerUid)||!/^image-[0-9a-f-]{36}$/.test(image.id))throw new Error('그림 경로를 확인할 수 없습니다.')
 return 'ai-city/'+image.ownerUid+'/'+image.id
}
export function fitCityImage(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width*height>40000000)throw new Error('그림 크기가 너무 크거나 읽을 수 없습니다. 4천만 화소 이하로 선택해 주세요.')
 const scale=Math.min(1,2560/Math.max(width,height))
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))}
}
