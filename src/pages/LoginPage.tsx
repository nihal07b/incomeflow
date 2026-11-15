
import { useState } from 'react'

type LoginPageProps = {
    onContinue: (email: string) => void
}

export function LoginPage({ onContinue }: LoginPageProps) {
    const [isSignup, setIsSignup] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')

        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid email address.')
            return
        }

        if (password.length < 6) {
            setError('Please enter at least 6 characters.')
            return
        }

        onContinue(email.trim().toLowerCase())
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 px-4 py-10">
            <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-700 text-3xl text-white">
                        ₹
                    </div>

                    <h1 className="mt-5 text-3xl font-extrabold text-slate-900">
                        IncomeFlow
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Your earnings. Your savings. Your future.
                    </p>
                </div>

                <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignup(false)
                            setError('')
                        }}
                        className={`rounded-lg py-3 text-sm font-semibold ${!isSignup
                                ? 'bg-white text-teal-800 shadow-sm'
                                : 'text-slate-500'
                            }`}
                    >
                        Login
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setIsSignup(true)
                            setError('')
                        }}
                        className={`rounded-lg py-3 text-sm font-semibold ${isSignup
                                ? 'bg-white text-teal-800 shadow-sm'
                                : 'text-slate-500'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                <h2 className="mt-7 text-xl font-bold text-slate-900">
                    {isSignup ? 'Create your account' : 'Welcome back!'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    {isSignup
                        ? 'Start managing your gig-work income.'
                        : 'Continue to your IncomeFlow dashboard.'}
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label
                            htmlFor="login-email"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Email address
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="login-password"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Password
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Minimum 6 characters"
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                        />
                    </div>

                    {error && (
                        <p role="alert" className="text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-teal-700 py-3 font-bold text-white transition hover:bg-teal-800"
                    >
                        {isSignup ? 'Create Demo Account' : 'Continue Demo Login'}
                    </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs text-slate-400">OR</span>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                    type="button"
                    onClick={() => onContinue('demo@incomeflow.app')}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <span className="text-lg font-bold text-blue-600">G</span>
                    Continue with Google (Demo)
                </button>

                <p className="mt-6 text-center text-xs leading-5 text-slate-500">
                    Demo mode only. No real Google authentication or password
                    verification. Do not enter a real password.
                </p>
            </div>
        </main>
    )
}
