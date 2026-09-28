import { useEffect, useMemo, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import {
  getFirebaseAuth,
  getFirebaseConfigError,
} from '../services/firebase'

function getAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/configuration-not-found') {
      return [
        'Firebase Authentication 설정을 찾을 수 없습니다. 배포된 Firebase API key가 Google 로그인을 활성화한 프로젝트와 같은지 확인하세요.',
        'Authorized domains에는 프로토콜이나 경로 없이 sohn0356-git.github.io만 추가해야 합니다.',
      ].join(' ')
    }

    if (error.code === 'auth/unauthorized-domain') {
      return '현재 도메인이 Firebase Authentication Authorized domains에 없습니다. Firebase Console에서 이 도메인을 추가하세요.'
    }

    if (error.code === 'auth/popup-closed-by-user') {
      return 'Google 로그인 창이 닫혔습니다. 다시 시도하세요.'
    }

    if (error.code === 'auth/api-key-not-valid') {
      return 'Firebase API key가 올바르지 않습니다. 배포 환경 변수와 Firebase Web app 설정을 확인하세요.'
    }
  }

  return error instanceof Error ? error.message : 'Google login failed.'
}

function shouldFallbackToRedirect(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return false
  }

  return [
    'auth/cancelled-popup-request',
    'auth/configuration-not-found',
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
  ].includes(error.code)
}

export function useAuth() {
  const configError = useMemo(() => getFirebaseConfigError(), [])
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(!configError)
  const [authError, setAuthError] = useState<string | null>(configError)
  const [isAuthMutating, setIsAuthMutating] = useState(false)

  useEffect(() => {
    if (configError) {
      return undefined
    }

    return onAuthStateChanged(
      getFirebaseAuth(),
      (nextUser) => {
        setUser(nextUser)
        setAuthError(null)
        setIsAuthLoading(false)
      },
      (error) => {
        setAuthError(getAuthErrorMessage(error))
        setIsAuthLoading(false)
      },
    )
  }, [configError])

  async function signInWithGoogle() {
    setIsAuthMutating(true)
    setAuthError(null)

    try {
      const auth = getFirebaseAuth()
      const provider = new GoogleAuthProvider()

      try {
        await signInWithPopup(auth, provider)
      } catch (popupError) {
        if (!shouldFallbackToRedirect(popupError)) {
          throw popupError
        }

        await signInWithRedirect(auth, provider)
      }
    } catch (error) {
      setAuthError(getAuthErrorMessage(error))
      throw error
    } finally {
      setIsAuthMutating(false)
    }
  }

  async function signOutUser() {
    setIsAuthMutating(true)
    setAuthError(null)

    try {
      await signOut(getFirebaseAuth())
    } catch (error) {
      setAuthError(getAuthErrorMessage(error))
      throw error
    } finally {
      setIsAuthMutating(false)
    }
  }

  return {
    authError,
    isAuthLoading,
    isAuthMutating,
    signInWithGoogle,
    signOutUser,
    user,
  }
}
