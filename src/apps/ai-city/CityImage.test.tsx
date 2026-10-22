// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {useState} from 'react'
import {CityImagePicker,CityImageView} from './CityImage'
import {imageFileError,fitCityImage,verifyImageSignature,cityImagePath,type CityImage} from './cityImages'
import {prepareCityImage,readCityImage,uploadCityImage} from './cityImageService'
vi.mock('./cityImageService',async()=>({...await vi.importActual<typeof import('./cityImageService')>('./cityImageService'),readCityImage:vi.fn(),uploadCityImage:vi.fn()}))
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
beforeEach(()=>{vi.clearAllMocks();URL.createObjectURL=vi.fn(()=> 'blob:preview');URL.revokeObjectURL=vi.fn();vi.mocked(readCityImage).mockResolvedValue('https://example.com/picture.webp')})
function signatureBlob(bytes:number[],type:string){return {type,size:bytes.length,slice:()=>({arrayBuffer:async()=>new Uint8Array(bytes).buffer})} as unknown as Blob}
const image:CityImage={id:'image-11111111-1111-4111-8111-111111111111',ownerUid:'u1',alt:'초록 나무 그림',width:1280,height:720}
const perform=async(fn:()=>Promise<void>)=>{try{await fn();return true}catch{return false}}
function Harness(){const [value,setValue]=useState<CityImage>();return <CityImagePicker value={value} onChange={setValue} accountId="ai01" busy={false} perform={perform}/>}
it('rejects unsupported, empty and oversized images and bounds dimensions while preserving aspect ratio',()=>{
 expect(imageFileError({type:'image/svg+xml',size:50})).toContain('JPG')
 expect(imageFileError({type:'image/png',size:0})).toContain('빈 파일')
 expect(imageFileError({type:'image/jpeg',size:8*1024*1024+1})).toContain('8MB')
 expect(imageFileError({type:'image/webp',size:8*1024*1024})).toBe('')
 expect(fitCityImage(4000,2000)).toEqual({width:2560,height:1280})
 expect(fitCityImage(2000,4000)).toEqual({width:1280,height:2560})
 expect(()=>fitCityImage(10000,10000)).toThrow()
 expect(()=>cityImagePath({...image,ownerUid:'../other'})).toThrow()
})
it('checks actual signatures instead of trusting an image filename or MIME alone',async()=>{
 const png=signatureBlob([137,80,78,71,13,10,26,10,0,0,0,0],'image/png')
 await expect(verifyImageSignature(png as unknown as Blob)).resolves.toBeUndefined()
 await expect(verifyImageSignature(signatureBlob([60,115,118,103,47,62],'image/png') as unknown as Blob)).rejects.toThrow('파일 내용')
})
it('re-encodes to a resized bitmap and closes it after processing',async()=>{
 const close=vi.fn(),draw=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:4000,height:2000,close}))
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:draw} as unknown as CanvasRenderingContext2D)
 vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['encoded'],{type:'image/webp'}) as unknown as Blob))
 const png=signatureBlob([137,80,78,71,13,10,26,10,0,0,0,0],'image/png')
 const result=await prepareCityImage(png as unknown as File)
 expect(result.width).toBe(2560);expect(result.height).toBe(1280);expect(result.blob.type).toBe('image/webp');expect(draw).toHaveBeenCalled();expect(close).toHaveBeenCalledTimes(1)
})
it('previews locally, attaches only on explicit upload, reports progress and can remove the attached draft',async()=>{
 vi.mocked(uploadCityImage).mockImplementation(async(_account,_file,_alt,progress)=>{progress(50);return image})
 render(<Harness/>)
 fireEvent.change(screen.getByLabelText('그림 파일 선택'),{target:{files:[new File(['png'],'tree.png',{type:'image/png'})]}})
 expect(screen.getByAltText('선택한 그림 미리보기')).toHaveAttribute('src','blob:preview')
 expect(uploadCityImage).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'그림 첨부하기'})).toBeDisabled()
 fireEvent.change(screen.getByLabelText('새 그림 설명'),{target:{value:image.alt}})
 fireEvent.click(screen.getByRole('button',{name:'그림 첨부하기'}))
 await waitFor(()=>expect(screen.getByLabelText('첨부 그림 설명')).toHaveValue(image.alt))
 expect(uploadCityImage).toHaveBeenCalledWith('ai01',expect.any(File),image.alt,expect.any(Function),expect.any(Function))
 await waitFor(()=>expect(screen.getByAltText(image.alt)).toHaveAttribute('src','https://example.com/picture.webp'))
 fireEvent.click(screen.getByRole('button',{name:'그림 첨부 해제'}));expect(screen.queryByLabelText('첨부 그림 설명')).not.toBeInTheDocument()
 expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
})
it('retains the selected file and description after failure and retries explicitly',async()=>{
 vi.mocked(uploadCityImage).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(image)
 render(<Harness/>)
 fireEvent.change(screen.getByLabelText('그림 파일 선택'),{target:{files:[new File(['png'],'tree.png',{type:'image/png'})]}})
 fireEvent.change(screen.getByLabelText('새 그림 설명'),{target:{value:image.alt}});fireEvent.click(screen.getByRole('button',{name:'그림 첨부하기'}))
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('선택한 파일과 설명은 유지'))
 expect(screen.getByLabelText('새 그림 설명')).toHaveValue(image.alt)
 fireEvent.click(screen.getByRole('button',{name:'그림 첨부하기'}))
 await waitFor(()=>expect(screen.getByLabelText('첨부 그림 설명')).toHaveValue(image.alt));expect(uploadCityImage).toHaveBeenCalledTimes(2)
})
it('distinguishes loading/failure and retries the same storage identity while keeping accessible alt and link',async()=>{
 vi.mocked(readCityImage).mockRejectedValueOnce(new Error('offline')).mockResolvedValue('https://example.com/retry.webp')
 render(<CityImageView image={image}/>)
 expect(screen.getByText('그림을 불러오는 중…')).toBeInTheDocument()
 fireEvent.click(await screen.findByRole('button',{name:'그림 다시 불러오기'}))
 await waitFor(()=>expect(screen.getByAltText(image.alt)).toHaveAttribute('src','https://example.com/retry.webp'))
 expect(readCityImage).toHaveBeenLastCalledWith(image,true)
 expect(screen.getByRole('link',{name:'그림 크게 보기: '+image.alt})).toHaveAttribute('rel','noopener noreferrer')
})
