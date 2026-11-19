import {describe,it,expect} from 'vitest'
import {normalizeLunchPraiseTracks,selectDailyPraise} from './dailyPraise'
const bank={'2020-01-01':{videoId:'abcdefghijk'},'2021-02-01':{youtubeUrl:'https://youtu.be/lmnopqrstuv'},'2022-03-01':{videoUrl:'https://www.youtube.com/watch?v=0123456789_'}}
describe('daily praise from the entire library',()=>{
 it('plays an older track even when there is no entry for today',()=>{const tracks=normalizeLunchPraiseTracks(bank),picked=selectDailyPraise(tracks,'2026-11-19');expect(picked).not.toBeNull();expect(tracks).toContain(picked)})
 it('excludes inactive and invalid videos, falls back from a damaged ID to a valid URL, and deduplicates videos',()=>{
  const tracks=normalizeLunchPraiseTracks({...bank,off:{active:false,videoId:'ABCDEfghijk'},bad:{youtubeUrl:'https://example.com/not-youtube'},duplicate:{youtubeUrl:'https://youtube.com/shorts/abcdefghijk'},recover:{videoId:'broken',youtubeUrl:'https://youtu.be/ZYXWVUTSRQP'},empty:null})
  expect(tracks.map(p=>p.videoId).sort()).toEqual(['abcdefghijk','lmnopqrstuv','0123456789_','ZYXWVUTSRQP'].sort())
 })
 it('is deterministic for the day and independent of Firebase object ordering',()=>{const a=normalizeLunchPraiseTracks(bank),b=normalizeLunchPraiseTracks(Object.fromEntries(Object.entries(bank).reverse()));expect(selectDailyPraise(a,'2026-11-19')?.videoId).toBe(selectDailyPraise(b,'2026-11-19')?.videoId)})
 it('keeps today’s existing choice after the list changes',()=>{const tracks=normalizeLunchPraiseTracks(bank),old=tracks[1];expect(selectDailyPraise(tracks,'2026-11-19',{day:'2026-11-19',videoId:old.videoId})).toEqual(old)})
 it('selects again for a new day or if the chosen track is removed',()=>{const tracks=normalizeLunchPraiseTracks(bank),old={day:'2026-11-18',videoId:tracks[0].videoId};expect(selectDailyPraise(tracks,'2026-11-19',old)).toEqual(selectDailyPraise(tracks,'2026-11-19'));expect(selectDailyPraise(tracks.slice(1),'2026-11-19',{...old,day:'2026-11-19'})?.videoId).not.toBe(old.videoId)})
 it('uses multiple library tracks across days without needing any daily uploads',()=>{const tracks=normalizeLunchPraiseTracks(bank),ids=new Set(Array.from({length:28},(_,i)=>selectDailyPraise(tracks,'2026-11-'+String(i+1).padStart(2,'0'))?.videoId));expect(ids.size).toBe(3)})
 it('returns an honest empty state only when there are no playable tracks',()=>{expect(selectDailyPraise([],'2026-11-19')).toBeNull();expect(normalizeLunchPraiseTracks(null)).toEqual([])})
})
