// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {AppLaunchScreen} from './AppLaunchScreen'
afterEach(()=>{cleanup();vi.useRealTimers()})
it('uses actual readiness milestones and does not finish content before account restoration',()=>{
 const content={owner:'member',scripture:true,entries:true,feed:true},next=vi.fn()
 const view=render(<AppLaunchScreen authReady={false} activityReady content={content} signingIn={false} onContinue={next}/>)
 expect(screen.getByRole('progressbar')).toHaveAttribute('value','35')
 view.rerender(<AppLaunchScreen authReady activityReady content={{...content,feed:false}} signingIn={false} onContinue={next}/>)
 expect(screen.getByRole('progressbar')).toHaveAttribute('value','100')
 expect(screen.getByText('준비됐어요. 함께 들어가요!')).toBeInTheDocument()
 view.rerender(<AppLaunchScreen authReady activityReady content={content} signingIn={false} onContinue={next}/>)
 expect(screen.getByRole('progressbar')).toHaveAttribute('value','100')
})
it('offers a way in on slow connections without claiming the data finished',()=>{
 vi.useFakeTimers();const next=vi.fn()
 const view=render(<AppLaunchScreen authReady={false} activityReady={false} content={null} signingIn onContinue={next}/>)
 act(()=>vi.advanceTimersByTime(1600));fireEvent.click(screen.getByRole('button',{name:'먼저 둘러보기'}));expect(next).toHaveBeenCalledOnce()
 expect(screen.getByRole('progressbar')).toHaveAttribute('value','15')
 view.unmount();act(()=>vi.advanceTimersByTime(6400));expect(next).toHaveBeenCalledOnce()
})

it('releases a stalled launch after the upper wait limit rather than inventing completion',()=>{
 vi.useFakeTimers();const next=vi.fn()
 render(<AppLaunchScreen authReady={false} activityReady={false} content={null} signingIn={false} onContinue={next}/>)
 act(()=>vi.advanceTimersByTime(8000));expect(next).toHaveBeenCalledOnce();expect(screen.getByRole('progressbar')).toHaveAttribute('value','15')
})
