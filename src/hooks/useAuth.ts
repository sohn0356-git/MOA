import { useEffect, useMemo, useState } from 'react'
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
        setAuthError(error.message)
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
      setAuthError(error instanceof Error ? error.message : 'Google login failed.')
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
      setAuthError(error instanceof Error ? error.message : 'Logout failed.')
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
