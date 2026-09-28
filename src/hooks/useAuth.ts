import { useEffect, useMemo, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
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
        'Firebase Authentication 설정을 찾을 수 없습니다.',
        'Firebase Console에서 Authentication을 시작하고 Google 로그인 제공업체를 활성화한 뒤, 현재 도메인을 Authorized domains에 추가하세요.',
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
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
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
