import {useEffect} from 'react'
import {MeditationApp} from '../apps/meditation/MeditationApp'
import {aiLoginAccounts} from '../data/aiAccounts'
import {AppUpdateBanner} from '../components/AppUpdateBanner'
import {useAuth} from '../hooks/useAuth'
import {useFaithActivity} from '../hooks/useFaithActivity'
import {useAppUpdate} from '../hooks/useAppUpdate'
import './FaithEntry.css'
export function AppShell(){
 const {authError,isAuthLoading,isAuthMutating,signInWithGoogle,signOutUser,user}=useAuth()
 const activity=useFaithActivity(),activityId=activity.activityId
 const {applyUpdate,hasUpdate,isUpdating,updateError}=useAppUpdate()
 useEffect(()=>{
  const normalize=()=>{if(location.hash!=='#/meditation')history.replaceState(history.state,'',location.pathname+location.search+'#/meditation')}
  normalize();window.addEventListener('hashchange',normalize);return()=>window.removeEventListener('hashchange',normalize)
 },[])
  async function handleSignOut() {
    try { await activity.clearActivity(); if (user) await signOutUser() } catch { /* The corresponding auth hook displays the failure. */ }
  }


  return (
      <main inert={isUpdating} className="app-shell app-shell-subapp app-shell-faith" aria-label="MOA Faith 메인">
        {hasUpdate ? <AppUpdateBanner error={updateError} isUpdating={isUpdating} onUpdate={() => void applyUpdate()} /> : null}
        {authError ? <p className="faith-entry-error" role="alert">{authError}</p> : null}
        {activity.error ? <p className="faith-entry-error" role="alert">{activity.error}</p> : null}
        {activity.isLoading || activity.isSwitching ? <p role="status" className="faith-activity-progress">AI 권한을 전환하고 있습니다…</p> : null}
        <MeditationApp churchMember={user ? {uid:user.uid,displayName:user.displayName || '방문자'} : null}
          churchAuthBusy={isAuthLoading || isAuthMutating}
          onChurchSignIn={async () => { await signInWithGoogle(); await activity.clearActivity() }}
          onActivityChange={activity.selectActivity} activityId={activityId} activityBusy={activity.isLoading || activity.isSwitching || isAuthMutating} entryActions={
          (
            <div className="faith-entry-account">
              <label className="faith-entry-label" htmlFor="faith-ai-account">활동 아이디</label>
              <select
                id="faith-ai-account"
                aria-label="활동 아이디 선택"
                value={activityId}
                disabled={activity.isLoading || activity.isSwitching || isAuthMutating}
                onChange={event => { void activity.selectActivity(event.currentTarget.value).catch(() => {}) }}
              >
                <option value="">내 아이디</option>
                {aiLoginAccounts.map(account => <option key={account.accountId} value={account.accountId}>{account.displayName}</option>)}
              </select>
              {(!user || aiLoginAccounts.some(account => account.email === user.email)) ? <button
                className="faith-entry-google" type="button"
                disabled={isAuthLoading || isAuthMutating || activity.isLoading || activity.isSwitching || Boolean(authError?.startsWith('Firebase configuration is missing:'))}
                onClick={() => { void (async () => { await signInWithGoogle(); await activity.clearActivity() })().catch(() => {}) }}
              ><span aria-hidden="true" className="faith-entry-google-mark">G</span><span>구글 로그인</span></button> : null}
              {(user || activityId) ? <button className="faith-entry-google" type="button"
                disabled={isAuthMutating || activity.isLoading || activity.isSwitching}
                onClick={() => void handleSignOut()}
              >로그아웃</button> : null}
            </div>
          )
        } />
      </main>
    )
}
