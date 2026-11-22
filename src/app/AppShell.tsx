import {useCallback,useEffect,useState} from 'react'
import {AppLaunchScreen,type StartupContentState} from '../components/AppLaunchScreen'
import {MeditationApp} from '../apps/meditation/MeditationApp'
import {aiLoginAccounts} from '../data/aiAccounts'
import {AppUpdateBanner} from '../components/AppUpdateBanner'
import {useAuth} from '../hooks/useAuth'
import {useFaithActivity} from '../hooks/useFaithActivity'
import {useAppUpdate} from '../hooks/useAppUpdate'
import './FaithEntry.css'
export function AppShell(){
 const {authError,isAuthLoading,isAuthMutating,signInWithGoogle,signOutUser,user}=useAuth()
 const [initial,setInitial]=useState(true),[loginOverlay,setLoginOverlay]=useState(false),[googlePending,setGooglePending]=useState(false),[deferred,setDeferred]=useState(false),[content,setContent]=useState<StartupContentState|null>(null)
 const activity=useFaithActivity(),activityId=activity.activityId
 const {applyUpdate,hasUpdate,isUpdating,updateError}=useAppUpdate()
 const owner=activityId||user?.uid||'guest'
 const currentContent=content?.owner===owner?content:null
 const ready=!googlePending&&!isAuthLoading&&!isAuthMutating&&!activity.isLoading&&!activity.isSwitching&&!!currentContent?.scripture&&currentContent.entries&&currentContent.feed
 const showLaunch=(initial||loginOverlay)&&!isUpdating
 const continueLoading=useCallback(()=>{setInitial(false);setLoginOverlay(false);setDeferred(true)},[])
 useEffect(()=>{if(ready){setInitial(false);setLoginOverlay(false);setDeferred(false)}},[ready])
 async function handleGoogleSignIn(){
  setLoginOverlay(true);setGooglePending(true);setDeferred(false)
  try{await signInWithGoogle();await activity.clearActivity()}catch(error){setLoginOverlay(false);setInitial(false);throw error}finally{setGooglePending(false)}
 }
 useEffect(()=>{
  const normalize=()=>{if(location.hash!=='#/meditation')history.replaceState(history.state,'',location.pathname+location.search+'#/meditation')}
  normalize();window.addEventListener('hashchange',normalize);return()=>window.removeEventListener('hashchange',normalize)
 },[])
  async function handleSignOut() {
    try { await activity.clearActivity(); if (user) await signOutUser() } catch { /* The corresponding auth hook displays the failure. */ }
  }


  return (
      <>
      {showLaunch&&<AppLaunchScreen authReady={!isAuthLoading&&!isAuthMutating&&!googlePending} activityReady={!activity.isLoading&&!activity.isSwitching} content={currentContent} signingIn={loginOverlay} onContinue={continueLoading}/>}
      <main inert={isUpdating||showLaunch} className="app-shell app-shell-subapp app-shell-faith" aria-label="MOA 메인">
        {hasUpdate ? <AppUpdateBanner error={updateError} isUpdating={isUpdating} onUpdate={() => void applyUpdate()} /> : null}
        {deferred&&!ready&&<p className="faith-activity-progress" role="status">연결을 기다리는 동안 먼저 둘러볼 수 있어요. 준비된 내용부터 보여드릴게요.</p>}
        {authError ? <p className="faith-entry-error" role="alert">{authError}</p> : null}
        {activity.error ? <p className="faith-entry-error" role="alert">{activity.error}</p> : null}
        {activity.isLoading || activity.isSwitching ? <p role="status" className="faith-activity-progress">AI 권한을 전환하고 있습니다…</p> : null}
        <MeditationApp onStartupState={setContent} churchMember={user ? {uid:user.uid,displayName:user.displayName || '방문자'} : null}
          churchAuthBusy={isAuthLoading || isAuthMutating}
          onChurchSignIn={handleGoogleSignIn}
          onActivityChange={activity.selectActivity} activityId={activityId} activityBusy={activity.isLoading || activity.isSwitching || isAuthMutating} entryActions={
          (
            <div className="faith-entry-account">
              {(!user || aiLoginAccounts.some(account => account.email === user.email)) ? <button
                className="faith-entry-google" type="button"
                disabled={isAuthLoading || isAuthMutating || activity.isLoading || activity.isSwitching || Boolean(authError?.startsWith('Firebase configuration is missing:'))}
                onClick={() => { void handleGoogleSignIn().catch(() => {}) }}
              ><span aria-hidden="true" className="faith-entry-google-mark">G</span><span>구글 로그인</span></button> : null}
              {(user || activityId) ? <button className="faith-entry-google" type="button"
                disabled={isAuthMutating || activity.isLoading || activity.isSwitching}
                onClick={() => void handleSignOut()}
              >로그아웃</button> : null}
            </div>
          )
        } />
      </main>
      </>
    )
}
