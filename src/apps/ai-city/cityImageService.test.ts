// @vitest-environment jsdom
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {waitFor} from '@testing-library/react'
import {get,set,remove} from 'firebase/database'
import {uploadCityImage,readCityImage} from './cityImageService'
vi.mock('firebase/database',()=>({ref:vi.fn((_db,path)=>path),get:vi.fn(),set:vi.fn(),remove:vi.fn(),serverTimestamp:()=>1}))
vi.mock('./cityService',()=>({cityDatabase:()=>({}),withCityAccount:(_account:string,action:(uid:string)=>Promise<unknown>)=>action('u1')}))
beforeEach(()=>{
 vi.clearAllMocks()
 vi.mocked(set).mockResolvedValue(undefined);vi.mocked(remove).mockResolvedValue(undefined)
 vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:320,height:200,close:vi.fn()}))
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D)
 vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['encoded'],{type:'image/webp'})))
 vi.stubGlobal('FileReader',class {result='data:image/webp;base64,YWJj';onerror:(()=>void)|null=null;onload:(()=>void)|null=null;readAsDataURL(){this.onload?.()}})
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
const file={type:'image/png',size:12,slice:()=>({arrayBuffer:async()=>new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]).buffer})} as unknown as File
it('uploads separate compressed picture data under the authenticated owner and reads the same data identity',async()=>{
 const progress=vi.fn(),image=await uploadCityImage('ai01',file,'바다 그림',progress)
 expect(image).toEqual(expect.objectContaining({ownerUid:'u1',alt:'바다 그림',width:320,height:200}))
 expect(set).toHaveBeenCalledWith('aiCity/images/u1/'+image.id,{data:'data:image/webp;base64,YWJj',width:320,height:200,createdAt:1})
 expect(progress.mock.calls.map(call=>call[0])).toEqual([0,35,60,100])
 vi.mocked(get).mockResolvedValue({val:()=>({data:'data:image/webp;base64,YWJj'})} as never)
 await expect(readCityImage(image)).resolves.toBe('data:image/webp;base64,YWJj')
})
it('cancels an unacknowledged upload promptly and queues removal instead of holding the writer busy offline',async()=>{
 vi.mocked(set).mockImplementation(()=>new Promise(()=>{}))
 let cancel=()=>{}
 const pending=uploadCityImage('ai01',file,'취소할 그림',vi.fn(),fn=>{cancel=fn})
 await waitFor(()=>expect(set).toHaveBeenCalled())
 cancel()
 await expect(pending).rejects.toThrow('취소')
 expect(remove).toHaveBeenCalledWith(expect.stringMatching(/^aiCity\/images\/u1\/image-/))
})
